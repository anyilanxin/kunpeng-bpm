/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and licenses/ directory that accompany this code.
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
 * 语义同步器：命令 executed/reverted 对称地把画布操作映射到语义树。
 *
 * DMN 挂接模型（与 BPMN 的关键差异）：
 * - 形状：DRG 元素挂 definitions.drgElement，注记/关联挂 definitions.artifact
 *   （扁平平面，无容器树）；
 * - 需求连线：**target 侧持有**——requirement bo 挂在宿主（target）的同名
 *   数组属性（informationRequirement/knowledgeRequirement/authorityRequirement），
 *   引用字段（requiredInput/requiredDecision/requiredKnowledge/requiredAuthority
 *   按端点裁决）经 DMNElementReference#href 指向 source；
 * - 关联：sourceRef/targetRef 引用子元素 + definitions.artifact 挂靠。
 * DI 图同步：新建元素创建 DMNShape/DMNEdge 挂 diagram.diagramElements，
 * 画布几何变更（elements.changed）回写 bounds/waypoint——语义树含 DI 是序列化
 * 的唯一事实源，画布只是编辑视图。
 */
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type { DmnDocumentState } from '../xml/DocumentState';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnElementTypes } from '../meta/ElementTypes';
import { syncEdgeDi, syncShapeDi } from '../xml/DiMapper';
import { requirementFieldFor, requirementHostProperty } from '../util/Requirements';

const ANNOTATION = 'dmn:TextAnnotation';
const ASSOCIATION = 'dmn:Association';

export class DmnUpdater extends CommandInterceptor {
  static $inject = ['eventBus', 'dmnDocumentState', 'dmnFactory', 'dmnElementTypes'];

  constructor(
    eventBus: EventBus,
    private readonly state: DmnDocumentState,
    private readonly dmnFactory: DmnFactory,
    private readonly elementTypes: DmnElementTypes
  ) {
    super(eventBus);

    this.on('shape.create', 'executed', (event: any) => {
      const { shape } = event.context;
      this.adoptShape(shape);
      this.ensureShapeDi(shape);
    });
    this.on('shape.create', 'reverted', (event: any) => {
      this.orphanShape(event.context.shape);
    });

    this.on('connection.create', 'executed', (event: any) => {
      const { connection, source, target } = event.context;
      this.wireConnection(connection, source, target);
      this.ensureEdgeDi(connection);
    });
    this.on('connection.create', 'reverted', (event: any) => {
      this.unwireConnection(event.context.connection);
    });

    // 重接：两端语义按画布现行端点整体重挂（executed=新端点已就位；reverted
    // 时 handler.revert 已把 source/target 恢复旧值——同一段代码两侧对称收敛，
    // 无需读 context.oldSource/oldTarget）
    const rewire = (event: any): void => this.rewire(event);
    for (const hook of ['connection.reconnectStart', 'connection.reconnectEnd', 'connection.reconnect']) {
      this.on(hook, 'executed', rewire);
      this.on(hook, 'reverted', rewire);
    }

    this.on('elements.delete', 'postExecuted', (event: any) => {
      const elements: any[] = event.context.elements;
      // 先清连线（宿主删除时其持有的需求连线由画布级联一并进删除集），
      // 再清形状；语义注销统一释放 id
      for (const element of elements.filter((e) => e.waypoints)) {
        this.unwireConnection(element);
        this.dmnFactory.destroy(element.businessObject);
      }
      for (const element of elements.filter((e) => !e.waypoints)) {
        this.orphanShape(element);
        this.dmnFactory.destroy(element.businessObject);
      }
    });
    // 撤销删除：DeleteElementsHandler.revert 只恢复画布（不走 create 命令），
    // 语义挂接/DI 节点在此对称重建（形状先就位，连线端点才可解析）
    this.on('elements.delete', 'reverted', (event: any) => {
      const elements: any[] = event.context.elements;
      for (const element of elements.filter((e) => !e.waypoints && e.businessObject)) {
        this.detachDi(element);
        this.adoptShape(element);
        this.ensureShapeDi(element);
        this.dmnFactory.reclaim(element.businessObject);
      }
      for (const element of elements.filter((e) => e.waypoints && e.businessObject)) {
        this.detachDi(element);
        this.wireConnection(element, element.source, element.target);
        this.ensureEdgeDi(element);
        this.dmnFactory.reclaim(element.businessObject);
      }
    });

    // 几何回写：画布元素变更（移动/缩放/重路由）统一同步到 DI 节点
    eventBus.on('elements.changed', (event: any) => {
      for (const element of event.elements) {
        this.syncDi(element);
      }
    });
  }

  // ---------- 形状挂接 ----------

  private adoptShape(shape: any): void {
    const bo = shape.businessObject;
    if (!bo) {
      return;
    }
    // 导入文档可缺省空数组（无制品/无 DRG 元素的合法文档），挂接前归一补齐
    const list = bo.$type === ANNOTATION
      ? (this.state.definitions.artifact ??= [])
      : (this.state.definitions.drgElement ??= []);
    if (!list.includes(bo)) {
      list.push(bo);
    }
  }

  private orphanShape(shape: any): void {
    const bo = shape.businessObject;
    if (!bo) {
      return;
    }
    this.detachDi(shape);
    removeFrom(this.state.definitions.drgElement, bo);
    removeFrom(this.state.definitions.artifact, bo);
  }

  // ---------- 连线挂接 ----------

  private wireConnection(connection: any, source: any, target: any): void {
    const bo = connection.businessObject;
    if (!bo || !source?.businessObject || !target?.businessObject) {
      return;
    }
    const sourceBo = source.businessObject;
    const targetBo = target.businessObject;

    if (this.elementTypes.isRequirementType(bo.$type)) {
      // target 持有：宿主属性数组 + 引用字段按端点裁决（工具/规则层已拦截
      // 非法组合，工厂字段裁决信任端点）
      const property = requirementHostProperty(bo.$type);
      const host = requirementHostOf(targetBo, property);
      if (!host.includes(bo)) {
        host.push(bo);
      }
      bo.set(requirementFieldFor(bo.$type, sourceBo.$type, targetBo.$type), this.dmnFactory.createReference(sourceBo.id));
      return;
    }
    if (bo.$type === ASSOCIATION) {
      bo.set('sourceRef', this.dmnFactory.createReference(sourceBo.id));
      bo.set('targetRef', this.dmnFactory.createReference(targetBo.id));
      const artifacts = (this.state.definitions.artifact ??= []);
      if (!artifacts.includes(bo)) {
        artifacts.push(bo);
      }
    }
  }

  private unwireConnection(connection: any): void {
    const bo = connection.businessObject;
    if (!bo) {
      return;
    }
    if (this.elementTypes.isRequirementType(bo.$type)) {
      // 全宿主扫描摘除（flat 树 O(宿主数)，等价精确摘除——挂靠数组在宿主侧）
      const property = requirementHostProperty(bo.$type);
      for (const host of this.state.definitions.drgElement ?? []) {
        removeFrom(host.get(property), bo);
      }
      return;
    }
    if (bo.$type === ASSOCIATION) {
      removeFrom(this.state.definitions.artifact, bo);
    }
  }

  /** 重接后的整体重挂：先全量摘除（需求跨宿主/关联 artifact 幂等），再按现行端点挂回 */
  private rewire(event: any): void {
    const connection = event.context.connection;
    this.unwireConnection(connection);
    this.wireConnection(connection, connection.source, connection.target);
  }

  // ---------- DI 图同步 ----------

  private ensureShapeDi(shape: any): void {
    const bo = shape.businessObject;
    if (!bo || shape.di?.$type) {
      return;
    }
    const di = this.dmnFactory.createDiShape(bo, { x: shape.x, y: shape.y, width: shape.width, height: shape.height });
    this.attachDi(di);
    shape.di = di;
  }

  private ensureEdgeDi(connection: any): void {
    const bo = connection.businessObject;
    if (!bo || connection.di?.$type) {
      return;
    }
    const di = this.dmnFactory.createDiEdge(bo, connection.waypoints ?? []);
    this.attachDi(di);
    connection.di = di;
  }

  private attachDi(di: any): void {
    const diagram = this.state.diagram;
    if (diagram) {
      (diagram.diagramElements ??= []).push(di);
    }
  }

  /**
   * DI 摘除单出口：从编辑图摘 DI 节点并清 element.di 引用（revert 后重执行由
   * ensure*Di 重建；不清引用会让 ensure*Di 的 di?.$type 守卫跳过重建，DI 永久
   * 滞留图外、序列化丢形——AGENTS 既有契约）。
   */
  private detachDi(element: any): void {
    const diagram = this.state.diagram;
    if (diagram) {
      removeFrom(diagram.diagramElements, element.di);
    }
    element.di = undefined;
  }

  /** 画布元素 → DI 节点几何回写（无 DI 节点/图节点跳过） */
  private syncDi(element: any): void {
    const di = element.di;
    if (!di?.$type || di.$type === 'dmndi:DMNDiagram') {
      return;
    }
    if (di.$type === 'dmndi:DMNShape') {
      syncShapeDi(di, element, this.dmnFactory);
    } else {
      syncEdgeDi(di, element, this.dmnFactory);
    }
  }
}

/** moddle 属性数组惰性建列（描述符属性 getter 缺省 undefined，不入 $attrs） */
function requirementHostOf(hostBo: any, property: string): any[] {
  let list = hostBo.get(property);
  if (!Array.isArray(list)) {
    list = [];
    hostBo.set(property, list);
  }
  return list;
}

function removeFrom(list: any[] | undefined, item: any): void {
  if (!list) {
    return;
  }
  const idx = list.indexOf(item);
  if (idx >= 0) {
    list.splice(idx, 1);
  }
}
