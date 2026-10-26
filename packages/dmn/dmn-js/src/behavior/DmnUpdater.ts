/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 语义同步器（画布 → 语义树/DI 单向同步）：
 * - shape/connection 的 created/reverted/removed 挂摘语义树（drgElement/
 *   artifact / 需求连线宿主集合）；
 * - elements.changed 回写 DI（bounds/waypoint；syncDi 见 DiMapper）；
 * - DecisionService 成员调和：outputDecision/encapsulatedDecision 引用集
 *   ≡ 画布子级决策集（中心 y 对分割线分区：上=输出、下=封装）。引用变更
 *   不入命令栈——撤销经画布父级命令还原后再调和收敛；导入不发
 *   elements.changed 故不扰动未编辑文档往返。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnDocumentState } from '../xml/DocumentState';
import { syncShapeDi, syncEdgeDi } from '../xml/DiMapper';
import { isRequirementType } from '../meta/ElementTypes';
import { SIZES } from '../meta/ElementTypes';
import { diagramOfElement, referenceId } from '../xml/DmnReader';

/** 需求连线在 target 宿主上的集合属性 */
const REQUIREMENT_HOST_PROPERTY: Record<string, string> = {
  'dmn:InformationRequirement': 'informationRequirement',
  'dmn:KnowledgeRequirement': 'knowledgeRequirement',
  'dmn:AuthorityRequirement': 'authorityRequirement'
};

function removeFrom(list: any[] | undefined, item: any): void {
  if (!list) {
    return;
  }
  const index = list.indexOf(item);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

export class DmnUpdater {
  static $inject = ['eventBus', 'dmnFactory', 'dmnDocumentState', 'canvas'];

  constructor(
    eventBus: EventBus,
    private readonly factory: DmnFactory,
    private readonly state: DmnDocumentState,
    private readonly canvas: any
  ) {
    // 命令栈相位事件名约定：`${命令}.${相位}`（executed/reverted/postExecuted）
    eventBus.on('shape.create.executed', (event: any) => this.adoptShape(event.context.shape));
    eventBus.on('shape.create.reverted', (event: any) => this.orphanShape(event.context.shape));
    eventBus.on('connection.create.executed', (event: any) => this.wireConnection(event.context));
    eventBus.on('connection.create.reverted', (event: any) => this.unwireConnection(event.context.connection));
    eventBus.on('connection.reconnect.executed', (event: any) => this.rewire(event));
    eventBus.on('elements.delete.postExecuted', (event: any) => {
      for (const element of event.context.elements) {
        this.orphanElement(element);
      }
    });
    eventBus.on('elements.changed', (event: any) => this.syncElements(event.elements));
  }

  // ---------- 形状挂接 ----------

  private adoptShape(shape: any): void {
    const bo = shape.businessObject;
    if (!bo) {
      return;
    }
    if (bo.$type === 'dmn:TextAnnotation') {
      (this.state.definitions.artifact ??= []).push(bo);
    } else if (bo.$type !== 'dmn:Definitions') {
      (this.state.definitions.drgElement ??= []).push(bo);
    }
    this.ensureShapeDi(shape);
    this.reconcileServices();
  }

  private orphanShape(shape: any): void {
    const bo = shape.businessObject;
    if (!bo) {
      return;
    }
    this.detachDi(shape);
    removeFrom(this.state.definitions.drgElement, bo);
    removeFrom(this.state.definitions.artifact, bo);
    this.reconcileServices();
  }

  // ---------- 连线挂接 ----------

  private wireConnection(context: any): void {
    const { connection, source, target } = context;
    const bo = connection.businessObject;
    if (!bo || !source?.businessObject || !target?.businessObject) {
      return;
    }
    if (isRequirementType(bo.$type)) {
      // target 持有：宿主属性数组 + 引用字段按源端裁决（规则层已拦截非法组合）
      const property = REQUIREMENT_HOST_PROPERTY[bo.$type];
      const host = target.businessObject;
      (host.get(property) ?? host[property] ?? []).push(bo);
      host.set(property, host.get(property));
      bo.set(
        source.businessObject.$type === 'dmn:InputData'
          ? 'requiredInput'
          : bo.$type === 'dmn:KnowledgeRequirement'
            ? 'requiredKnowledge'
            : bo.$type === 'dmn:AuthorityRequirement'
              ? 'requiredAuthority'
              : 'requiredDecision',
        source.businessObject
      );
    } else if (bo.$type === 'dmn:Association') {
      bo.set('sourceRef', source.businessObject);
      bo.set('targetRef', target.businessObject);
      (this.state.definitions.artifact ??= []).push(bo);
    }
    this.ensureEdgeDi(connection);
  }

  private unwireConnection(connection: any): void {
    const bo = connection.businessObject;
    if (!bo) {
      return;
    }
    if (isRequirementType(bo.$type)) {
      for (const host of this.state.definitions.drgElement ?? []) {
        removeFrom(host.get(REQUIREMENT_HOST_PROPERTY[bo.$type]), bo);
      }
    } else if (bo.$type === 'dmn:Association') {
      removeFrom(this.state.definitions.artifact, bo);
    }
  }

  /** 重接后的整体重挂：先全量摘除，再按现行端点挂回 */
  private rewire(event: any): void {
    const context = event.context;
    this.unwireConnection(context.connection);
    this.wireConnection(context);
  }

  // ---------- 删除 ----------

  /** 删除语义摘除（需求连线从全宿主扫描摘——摘除类操作不依赖画布父链定位） */
  private orphanElement(element: any): void {
    const bo = element.businessObject;
    if (!bo) {
      return;
    }
    if (element.waypoints) {
      this.unwireConnection(element);
      this.detachDi(element);
      this.factory.destroy(bo);
      return;
    }
    this.orphanShape(element);
    this.factory.destroy(bo);
  }

  // ---------- DI 同步 ----------

  /** 画布元素 → DI 回写（bounds/waypoint；DS 分割线）；首元素落当前激活平面时懒建图 */
  private syncElements(elements: any[]): void {
    for (const element of elements) {
      const bo = element.businessObject;
      if (!bo || bo.$type === 'dmn:Definitions') {
        continue;
      }
      if (element.waypoints) {
        if (element.di?.$type === 'dmndi:DMNEdge') {
          syncEdgeDi(element.di, element, this.factory);
        }
        continue;
      }
      if (element.di?.$type !== 'dmndi:DMNShape') {
        this.ensureShapeDi(element);
      }
      if (element.di?.$type === 'dmndi:DMNShape') {
        syncShapeDi(element.di, element, this.factory);
      }
    }
    this.reconcileServices();
  }

  private ensureShapeDi(shape: any): void {
    if (shape.di?.$type === 'dmndi:DMNShape' || !shape.businessObject) {
      return;
    }
    const diagram = this.planeFor(shape);
    if (!diagram) {
      return;
    }
    const di = this.factory.create<any>({
      $type: 'dmndi:DMNShape',
      dmnElementRef: shape.businessObject,
      bounds: this.factory.create<any>({
        $type: 'dc:Bounds',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height
      })
    });
    (diagram.diagramElements ??= []).push(di);
    shape.di = di;
  }

  private ensureEdgeDi(connection: any): void {
    if (connection.di?.$type === 'dmndi:DMNEdge' || !connection.businessObject) {
      return;
    }
    const diagram = this.planeFor(connection);
    if (!diagram) {
      return;
    }
    const di = this.factory.create<any>({
      $type: 'dmndi:DMNEdge',
      dmnElementRef: connection.businessObject,
      waypoint: connection.waypoints.map((p: any) =>
        this.factory.create<any>({ $type: 'dc:Point', x: p.x, y: p.y })
      )
    });
    (diagram.diagramElements ??= []).push(di);
    connection.di = di;
  }

  /** 元素所属图：主图根上元素=主图；DS/下钻容器内元素=其根 bo 的专属图 */
  private planeFor(element: any): any | null {
    let root = element.parent;
    while (root && root.type !== 'dmn:Definitions' && !root.id?.endsWith('_plane')) {
      root = root.parent;
    }
    if (!root) {
      return this.state.diagram;
    }
    if (root.type === 'dmn:Definitions') {
      return this.state.diagram;
    }
    // 下钻平面根（{bo.id}_plane）：懒建专属 DMNDiagram（不剪枝：纯浏览不改 XML）
    const hostBo = root.businessObject;
    return (
      diagramOfElement(this.state.definitions, hostBo) ??
      this.createPlaneDiagram(hostBo)
    );
  }

  private createPlaneDiagram(hostBo: any): any {
    const diagram = this.factory.createDiagram({ dmnElementRef: hostBo });
    const dmnDI = (this.state.definitions.dmnDI ??= { $type: 'dmndi:DMNDI', diagrams: [] });
    (dmnDI.diagrams ??= []).push(diagram);
    return diagram;
  }

  private detachDi(element: any): void {
    const di = element.di;
    if (!di?.$type) {
      return;
    }
    for (const diagram of this.state.definitions.dmnDI?.diagrams ?? []) {
      removeFrom(diagram.diagramElements, di);
    }
    (element as { di?: unknown }).di = undefined;
  }

  // ---------- DS 成员调和 ----------

  /**
   * 不变量：各 DS 的 outputDecision/encapsulatedDecision 引用集 ≡ 画布上
   * 以该 DS 为父的决策集（中心 y 对分割线分区）。全 DS 重算幂等；撤销经
   * 画布父级命令还原后由 elements.changed 收敛（引用自身不入命令栈）。
   */
  private reconcileServices(): void {
    for (const bo of this.state.definitions.drgElement ?? []) {
      if (bo.$type !== 'dmn:DecisionService') {
        continue;
      }
      const shape = boShapeOf(bo, this.canvas);
      if (!shape) {
        continue;
      }
      const divider = shape.y + (shape.dividerY ?? SIZES.SERVICE_DIVIDER_Y);
      const outputs: any[] = [];
      const encapsulated: any[] = [];
      for (const child of shape.children ?? []) {
        if (child.businessObject?.$type !== 'dmn:Decision') {
          continue;
        }
        const centerY = child.y + child.height / 2;
        (centerY < divider ? outputs : encapsulated).push(child.businessObject);
      }
      syncReferenceSet(bo, 'outputDecision', outputs);
      syncReferenceSet(bo, 'encapsulatedDecision', encapsulated);
    }
  }
}

function boShapeOf(bo: any, canvas: any): any | null {
  for (const element of canvas.getRootElement().children ?? []) {
    if (element.businessObject === bo) {
      return element;
    }
  }
  return null;
}

/** 引用集整体重排（按 href 复用既有引用对象，减少序列化噪声；顺序=画布序） */
function syncReferenceSet(bo: any, property: string, targets: any[]): void {
  const refs = targets.map((target) => {
    const existing = (bo.get(property) ?? []).find((r: any) => referenceId(r) === target.id);
    return existing ?? target;
  });
  bo.set(property, refs);
}
