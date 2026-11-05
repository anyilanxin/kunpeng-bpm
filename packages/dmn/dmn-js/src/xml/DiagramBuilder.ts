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
 * 建图器：moddle 语义树（含 DI 图）→ 画布元素。
 *
 * DI 节点来自树上的 dmnDI.diagrams[]（描述驱动解析），此处归一为内部视图
 * 后建图：DecisionService 容器 → 普通 DRG 形状/制品 → 连线（三类需求连线
 * 端点=引用方向，关联=sourceRef/targetRef）。DS 子级画布父级按**引用集**
 * 推导（encapsulatedDecision/outputDecision 引用=子级决策，规范 §11.4），
 * 不按几何包含（DMN 的成员关系是语义引用不是坐标嵌套）。
 * 每个画布元素回挂其 DI 节点（element.di）——画布几何→DI 的同步锚点。
 */
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { DmnElementFactory } from '../factory/DmnElementFactory';
import { readDiView, type DiView } from './DiMapper';
import { mainDiagram, diagramOfElement, referenceId, type DmnParseResult } from './DmnReader';

/** 需求连线宿主（target 侧持有）属性：连线 bo 挂在 target 的集合属性上 */
const REQUIREMENT_HOST_PROPERTY: Record<string, string> = {
  'dmn:InformationRequirement': 'informationRequirement',
  'dmn:KnowledgeRequirement': 'knowledgeRequirement',
  'dmn:AuthorityRequirement': 'authorityRequirement'
};

/** 需求连线 → 源端语义（按描述符属性族取已解析引用） */
export function requirementSource(bo: any): any | null {
  return bo.requiredDecision ?? bo.requiredInput ?? bo.requiredKnowledge ?? bo.requiredAuthority ?? null;
}

/** 语义树全遍历（下钻平面连线建图用） */
export function walkSemanticTree(node: any, visit: (bo: any) => void, seen = new Set<unknown>()): void {
  if (!node || typeof node !== 'object' || seen.has(node)) {
    return;
  }
  seen.add(node);
  if (node.$type) {
    visit(node);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach((item) => walkSemanticTree(item, visit, seen));
    } else if (value && typeof value === 'object' && (value as any).$type) {
      walkSemanticTree(value, visit, seen);
    }
  }
}

export class DiagramBuilder {
  static $inject = ['canvas', 'elementFactory', 'dmnDocumentState'];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementFactory: DmnElementFactory,
    private readonly state: { definitions: any }
  ) {}

  build(parseResult: DmnParseResult): void {
    const { definitions } = parseResult;
    const main = mainDiagram(definitions);
    if (!main) {
      throw new Error('无法定位 DMNDiagram：文档不含 dmnDI.diagrams（无 DI 的文档暂不支持，见需求文档缓执行项）');
    }
    const diById = collectDiViews(main.diagram);
    const created = new Map<string, any>();

    // 画布根直接承载 Definitions 本体（DMN 无 BPMN 的平面目标间接层），
    // 主图 DMNDiagram（树上真 DI 节点）只作 di 附着
    const root = this.elementFactory.createRoot({
      type: 'dmn:Definitions',
      businessObject: definitions,
      di: main.diagram
    });
    this.canvas.setRootElement(root);

    // 1. DecisionService 容器先建（子级决策挂其为画布父级）
    for (const bo of definitions.drgElement ?? []) {
      if (bo.$type === 'dmn:DecisionService') {
        this.buildShape(bo, diById, root, created);
      }
    }

    // 2. 其余 DRG 形状 + 制品（注记）：DS 成员（引用集）挂 DS，其余挂根
    for (const bo of definitions.drgElement ?? []) {
      if (bo.$type !== 'dmn:DecisionService') {
        this.buildShape(bo, diById, this.serviceParentOf(bo, definitions, created) ?? root, created);
      }
    }
    for (const bo of definitions.artifact ?? []) {
      if (bo.$type === 'dmn:TextAnnotation') {
        this.buildShape(bo, diById, root, created);
      }
    }

    // 3. 连线（端点形状就位后）：需求连线（宿主集合遍历）+ 关联（artifact）
    this.buildRequirements(definitions, diById, created);
    this.buildAssociations(definitions, diById, created);
  }

  /**
   * 决策/BKM 下钻平面建图：为元素建独立画布根（隐藏图层，切换由
   * PlaneService 驱动）。平面图可不存在（首次下钻空平面）——根不挂 di，
   * 首个内容落平面时由 DmnUpdater 懒建。根 id 用 `{bo.id}_plane`：主图上
   * 该元素形状已占 bo.id，注册表同 id 冲突。平面内容 G5 接表达式编辑器。
   */
  buildElementPlane(bo: any): any {
    const diagram = diagramOfElement(this.state.definitions, bo);
    const root = this.elementFactory.createRoot({
      type: bo.$type,
      businessObject: bo,
      id: `${bo.id}_plane`,
      di: diagram ?? undefined
    });
    this.canvas.addRootElement(root);
    return root;
  }

  /** DS 成员判属：encapsulatedDecision/outputDecision 引用集包含该决策 → 父=DS 形状 */
  private serviceParentOf(bo: any, definitions: any, created: Map<string, any>): any | null {
    if (bo.$type !== 'dmn:Decision') {
      return null;
    }
    for (const candidate of definitions.drgElement ?? []) {
      if (candidate.$type !== 'dmn:DecisionService') {
        continue;
      }
      const members = [...(candidate.encapsulatedDecision ?? []), ...(candidate.outputDecision ?? [])];
      if (members.some((m: any) => m === bo || referenceId(m) === bo.id)) {
        return created.get(candidate.id) ?? null;
      }
    }
    return null;
  }

  private buildShape(bo: any, diById: Map<string, DiView>, parent: any, created: Map<string, any>): void {
    const di = diById.get(bo.id);
    if (!di || di.kind !== 'shape' || created.has(bo.id)) {
      return;
    }
    const shape = this.elementFactory.createShape({
      id: bo.id,
      type: bo.$type,
      businessObject: bo,
      x: di.bounds?.x,
      y: di.bounds?.y,
      width: di.bounds?.width,
      height: di.bounds?.height,
      dividerY: di.dividerY,
      di: di.node,
      parent
    });
    this.canvas.addShape(shape, parent);
    created.set(bo.id, shape);
  }

  /** 需求连线：遍历各宿主集合，source=required* 引用、target=宿主 */
  private buildRequirements(definitions: any, diById: Map<string, DiView>, created: Map<string, any>): void {
    for (const host of definitions.drgElement ?? []) {
      for (const [type, property] of Object.entries(REQUIREMENT_HOST_PROPERTY)) {
        void type;
        for (const bo of host.get?.(property) ?? host[property] ?? []) {
          this.buildConnection(bo, diById, created);
        }
      }
    }
  }

  private buildAssociations(definitions: any, diById: Map<string, DiView>, created: Map<string, any>): void {
    for (const bo of definitions.artifact ?? []) {
      if (bo.$type === 'dmn:Association') {
        this.buildConnection(bo, diById, created);
      }
    }
  }

  private buildConnection(bo: any, diById: Map<string, DiView>, created: Map<string, any>): void {
    if (created.has(bo.id)) {
      return;
    }
    const di = diById.get(bo.id);
    if (!di || di.kind !== 'edge') {
      return;
    }
    const sourceBo = bo.$type === 'dmn:Association' ? bo.sourceRef : requirementSource(bo);
    const targetBo = bo.$type === 'dmn:Association' ? bo.targetRef : this.requirementHost(bo);
    const source = sourceBo ? created.get(referenceId(sourceBo) || sourceBo.id) : undefined;
    const target = targetBo ? created.get(referenceId(targetBo) || targetBo.id) : undefined;
    if (!source || !target) {
      return;
    }
    const connection = this.elementFactory.createConnection({
      id: bo.id,
      type: bo.$type,
      businessObject: bo,
      source,
      target,
      waypoints: di.waypoints?.map((w) => ({ x: w.x, y: w.y })),
      di: di.node,
      parent: source.parent
    });
    this.canvas.addConnection(connection, source.parent);
    created.set(bo.id, connection);
  }

  /** 需求连线的 target=持有它的宿主（全 DRG 扫描；建图期一次性，规模小） */
  private requirementHost(bo: any): any | null {
    for (const host of this.state.definitions.drgElement ?? []) {
      for (const property of Object.values(REQUIREMENT_HOST_PROPERTY)) {
        if ((host[property] ?? []).includes(bo)) {
          return host;
        }
      }
    }
    return null;
  }
}

/** 一张 DMNDiagram 的 DI 节点 → {语义 id → 内部视图} */
function collectDiViews(diagram: any | null): Map<string, DiView> {
  const map = new Map<string, DiView>();
  for (const node of diagram?.diagramElements ?? []) {
    const view = readDiView(node);
    if (view) {
      map.set(view.dmnElementRef, view);
    }
  }
  return map;
}
