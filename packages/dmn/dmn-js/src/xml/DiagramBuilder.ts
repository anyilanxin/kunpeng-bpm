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
 * 建图器：moddle 语义树（含 definitions.dmnDI.diagrams[0].diagramElements）
 * → 画布元素。
 *
 * 建图顺序：DRG 形状 → 制品形状（注记）→ 需求连线 → 关联连线（端点就位后）。
 * 需求连线的 source 经 DMNElementReference#href 剖析（模型侧引用不自动解析），
 * target=持有方（规范：需求是消费侧 DRG 元素的组成部分）。
 * 每个画布元素回挂其 DI 节点（element.di）——画布几何→DI 的同步锚点。
 */
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { DmnElementFactory } from '../factory/DmnElementFactory';
import type { DmnElementTypes } from '../meta/ElementTypes';
import type { DmnDocumentState } from './DocumentState';
import { readDiView, type DiView } from './DiMapper';
import type { DmnParseResult } from './DmnReader';
import { associationEndpointIds, refIdFromHref, requirementSourceId } from '../util/Requirements';

/** 需求三类在持有方 DRG 元素上的属性名（dmn13 描述符） */
const REQUIREMENT_PROPERTIES = ['informationRequirement', 'knowledgeRequirement', 'authorityRequirement'] as const;

export class DiagramBuilder {
  static $inject = ['canvas', 'elementFactory', 'dmnElementTypes', 'dmnDocumentState'];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementFactory: DmnElementFactory,
    private readonly elementTypes: DmnElementTypes,
    private readonly state: DmnDocumentState
  ) {}

  build(parseResult: DmnParseResult): void {
    const { definitions } = parseResult;
    const diagram = this.state.diagram;
    // 退化文档（无 DMNDI/无图）明确失败：不做兜底合成图（generate-di 缓执行项）
    if (!diagram) {
      throw new Error('无法定位 DMNDiagram：文档不含 dmnDI.diagrams（无 DI 的文档暂不支持，见需求文档缓执行项）');
    }
    const diById = collectDiViews(diagram);
    const created = new Map<string, any>();

    // 画布根直接承载 Definitions 本体（DMN 无 BPMN 的平面间接层），di 挂编辑图
    const root = this.elementFactory.createRoot({
      type: 'dmn:Definitions',
      businessObject: definitions,
      di: diagram
    });
    this.canvas.setRootElement(root);

    // 1. DRG 形状：决策服务先建（容器），成员引用（outputDecision/
    //    encapsulatedDecision）指向的决策挂服务为画布父级（扁平模型、分层视图）
    const drgElements = definitions.drgElement ?? [];
    for (const bo of drgElements) {
      if (bo.$type !== 'dmn:DecisionService') {
        continue;
      }
      const di = diById.get(bo.id);
      if (di && di.kind === 'shape') {
        this.addShape(bo, di, root, created);
      }
    }
    const memberParent = new Map<string, any>();
    for (const shape of created.values()) {
      const serviceBo = shape.businessObject;
      for (const property of ['outputDecision', 'encapsulatedDecision']) {
        for (const ref of serviceBo.get(property) ?? []) {
          const memberId = refIdFromHref(ref);
          if (memberId) {
            memberParent.set(memberId, shape);
          }
        }
      }
    }
    for (const bo of drgElements) {
      if (bo.$type === 'dmn:DecisionService') {
        continue;
      }
      const di = diById.get(bo.id);
      if (!di || di.kind !== 'shape') {
        continue;
      }
      this.addShape(bo, di, memberParent.get(bo.id) ?? root, created);
    }

    // 2. 制品形状（文本注记）
    for (const bo of definitions.artifact ?? []) {
      if (!this.elementTypes.isArtifactShapeType(bo.$type)) {
        continue;
      }
      const di = diById.get(bo.id);
      if (di && di.kind === 'shape') {
        this.addShape(bo, di, root, created);
      }
    }

    // 3. 需求连线（持有方与被引用端均就位后）
    for (const owner of definitions.drgElement ?? []) {
      for (const property of REQUIREMENT_PROPERTIES) {
        for (const requirement of owner.get(property) ?? []) {
          this.addRequirementConnection(requirement, owner, diById, created, root);
        }
      }
    }

    // 4. 关联连线（注记等就位后）
    for (const bo of definitions.artifact ?? []) {
      if (bo.$type !== 'dmn:Association') {
        continue;
      }
      const di = diById.get(bo.id);
      const endpoints = associationEndpointIds(bo);
      if (!di || di.kind !== 'edge' || !endpoints) {
        continue;
      }
      const source = created.get(endpoints.sourceId);
      const target = created.get(endpoints.targetId);
      if (!source || !target) {
        continue;
      }
      this.addConnection(bo, di, source, target, created, root);
    }
  }

  private addShape(bo: any, di: DiView, parent: any, created: Map<string, any>): any {
    const shape = this.elementFactory.createShape({
      id: bo.id,
      businessObject: bo,
      x: di.bounds!.x,
      y: di.bounds!.y,
      width: di.bounds!.width,
      height: di.bounds!.height,
      ...(di.dividerY !== undefined ? { dividerY: di.dividerY } : {}),
      di: di.node
    });
    this.canvas.addShape(shape, parent);
    created.set(bo.id, shape);
    return shape;
  }

  /**
   * 需求连线：source=被引用端（href 剖析），target=持有方。引用悬空/端点无
   * DI（不在本图）跳过——多图文档中他图元素的需求天然不落本图。
   */
  private addRequirementConnection(
    requirement: any,
    ownerBo: any,
    diById: Map<string, DiView>,
    created: Map<string, any>,
    root: any
  ): void {
    if (created.has(requirement.id)) {
      return;
    }
    const di = diById.get(requirement.id);
    if (!di || di.kind !== 'edge') {
      return;
    }
    const sourceId = requirementSourceId(requirement);
    const target = created.get(ownerBo.id);
    const source = sourceId ? created.get(sourceId) : undefined;
    if (!source || !target) {
      return;
    }
    this.addConnection(requirement, di, source, target, created, root);
  }

  private addConnection(bo: any, di: DiView, source: any, target: any, created: Map<string, any>, root: any): void {
    const connection = this.elementFactory.createConnection({
      id: bo.id,
      businessObject: bo,
      type: bo.$type,
      source,
      target,
      waypoints: di.waypoints ?? [],
      di: di.node
    });
    this.canvas.addConnection(connection, root);
    created.set(bo.id, connection);
  }
}

/** 图 DI 节点 → 视图映射（dmnElementRef → 语义 id） */
function collectDiViews(diagram: any): Map<string, DiView> {
  const diById = new Map<string, DiView>();
  for (const node of diagram?.diagramElements ?? []) {
    const view = readDiView(node);
    if (view) {
      diById.set(view.dmnElement, view);
    }
  }
  return diById;
}
