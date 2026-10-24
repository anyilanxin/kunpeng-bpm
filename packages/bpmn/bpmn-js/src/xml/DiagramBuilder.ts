/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
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
 * 建图器：moddle 语义树（含 DI 图）→ 画布元素。
 *
 * DI 节点来自树上的 bpmndi:BPMNDiagram/bpmndi:BPMNPlane（描述驱动解析），
 * 此处归一为内部视图后沿用既定建图顺序：容器（参与者/泳道/子流程）→ 普通节点
 * → 边界事件（挂宿主）→ 连线；画布父子关系按几何包含推导。
 * 每个画布元素回挂其 DI 节点（element.di）——画布几何→DI 的同步锚点。
 */
import type Canvas from 'diagram-js/lib/core/Canvas';
import type TextUtil from 'diagram-js/lib/util/Text';
import type { BpmnElementFactory } from '../factory/BpmnElementFactory';
import type { BpmnElementTypes } from '../meta/ElementTypes';
import type { BpmnParseResult } from './BpmnReader';
import { absoluteLabelBox } from '../label/LabelGeometry';
import { isArtifactFamily, isDataFamily, isFlowNodeType, isPoolFamily, isSubProcessFamily } from '../meta/ElementTypes';

/** moddle DI 节点的内部视图（Shape/Edge 统一形态） */
interface DiView {
  kind: 'shape' | 'edge';
  bpmnElement: string;
  bounds?: { x: number; y: number; width: number; height: number };
  waypoints?: { x: number; y: number }[];
  isExpanded?: boolean;
  isHorizontal?: boolean;
  isMarkerVisible?: boolean;
  colors?: { fill?: string; stroke?: string };
  labelBounds?: { x: number; y: number; width: number; height: number } | null;
  /** 原始 moddle DI 节点（画布元素回挂，几何/颜色同步与导出的写回目标） */
  node: any;
}

export class DiagramBuilder {
  static $inject = ['canvas', 'elementFactory', 'bpmnElementTypes', 'textRenderer'];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementFactory: BpmnElementFactory,
    private readonly elementTypes: BpmnElementTypes,
    private readonly textUtil: TextUtil
  ) {}

  build(parseResult: BpmnParseResult): void {
    const { definitions, semanticById, planeTargetId } = parseResult;
    const diById = new Map<string, DiView>();
    for (const diagram of definitions.diagrams ?? []) {
      for (const node of diagram.plane?.planeElement ?? []) {
        const view = normalizeDi(node);
        if (view) {
          diById.set(view.bpmnElement, view);
        }
      }
    }

    // 根元素承载平面指向的语义根（Process/Collaboration，真 moddle 实例——
    // 面板等插件对任意元素调 bo.get()/$instanceOf），主图平面（树上的真 DI
    // 节点）只作 di 附着：空白点击的属性面板编辑流程语义并落 XML。
    // 平面目标缺失/悬空为不可显示文档：明确失败，不静默给无 bo 裸根
    // （其上的面板编辑会全部落空）。
    const planeTarget = semanticById.get(planeTargetId);
    if (!planeTarget) {
      throw new Error(`无法解析主图平面目标：BPMNPlane bpmnElement="${planeTargetId}" 未命中任何元素`);
    }
    const plane = mainPlane(definitions, planeTargetId);
    const root = this.elementFactory.createRoot({
      type: planeTarget.$type,
      businessObject: planeTarget,
      di: plane ?? undefined
    });
    this.canvas.setRootElement(root);

    const created = new Map<string, any>();

    // 1. 容器与节点
    for (const rootElement of definitions.rootElements) {
      if (rootElement.$type === 'bpmn:Collaboration') {
        this.buildCollaboration(rootElement as any, diById, created);
      } else if (rootElement.$type === 'bpmn:Process') {
        this.buildProcessContents(rootElement as any, root, diById, created);
      }
    }

    // 2. 边界事件（宿主已就位）
    for (const bo of semanticById.values()) {
      if (bo.$type === 'bpmn:BoundaryEvent') {
        this.buildBoundaryEvent(bo as any, diById, created);
      }
    }

    // 3. 连线（端点就位后）
    this.buildAllConnections(definitions, semanticById, diById, created);
  }

  private buildCollaboration(collab: any, diById: Map<string, DiView>, created: Map<string, any>): void {
    const root = this.canvas.getRootElement();

    for (const participant of collab.participants ?? []) {
      const di = diById.get(participant.id);
      if (!di || di.kind !== 'shape') {
        continue;
      }
      const shape = this.addShape(participant, di, root, created);
      const process = participant.processRef;
      if (process && shape) {
        this.buildLanes(process, shape, diById, created);
        this.buildProcessContents(process, shape, diById, created);
      }
    }

    // 协作级制品（注记/分组）；消息流所在连线最后统一建
    for (const artifact of collab.artifacts ?? []) {
      if (artifact.$type === 'bpmn:Group' || artifact.$type === 'bpmn:TextAnnotation') {
        const di = diById.get(artifact.id);
        if (di && di.kind === 'shape') {
          this.addShape(artifact, di, root, created);
        }
      }
    }
  }

  /** 在承载元素（池/根）下建泳道，再递归子泳道 */
  private buildLanes(containerBo: any, parentElement: any, diById: Map<string, DiView>, created: Map<string, any>): void {
    for (const laneSet of containerBo.laneSets ?? []) {
      for (const lane of laneSet.lanes ?? []) {
        const di = diById.get(lane.id);
        if (!di || di.kind !== 'shape') {
          continue;
        }
        const laneShape = this.addShape(lane, di, parentElement, created);
        if (!laneShape) {
          continue;
        }
        if (lane.childLaneSet) {
          this.buildLanes({ laneSets: [lane.childLaneSet] }, laneShape, diById, created);
        }
      }
    }
  }

  private buildProcessContents(containerBo: any, containerElement: any, diById: Map<string, DiView>, created: Map<string, any>): void {
    // 第一遍：容器与普通节点
    for (const bo of containerBo.flowElements ?? []) {
      if (bo.$type === 'bpmn:BoundaryEvent' || bo.$type === 'bpmn:SequenceFlow') {
        continue;
      }
      if (isSubProcessFamily(bo.$type)) {
        const di = diById.get(bo.id);
        if (!di || di.kind !== 'shape') continue;
        const shape = this.addShape(bo, di, containerElement, created);
        if (shape) {
          this.buildLanes(bo, shape, diById, created);
          this.buildProcessContents(bo, shape, diById, created);
        }
        continue;
      }
      if (isNode(bo)) {
        const di = diById.get(bo.id);
        if (di && di.kind === 'shape') {
          this.addShape(bo, di, containerElement, created);
        }
      }
    }

    // 第二遍：容器级制品（注记/分组；XSD 挂 artifacts，process/subProcess 均可；
    // 关联连线在 buildAllConnections 统一建）
    for (const artifact of containerBo.artifacts ?? []) {
      if (artifact.$type === 'bpmn:Group' || artifact.$type === 'bpmn:TextAnnotation') {
        const di = diById.get(artifact.id);
        if (di && di.kind === 'shape') {
          this.addShape(artifact, di, containerElement, created);
        }
      }
    }
  }

  private buildBoundaryEvent(bo: any, diById: Map<string, DiView>, created: Map<string, any>): void {
    const hostBo = bo.attachedToRef;
    if (!hostBo || !created.has(hostBo.id)) {
      return;
    }
    const di = diById.get(bo.id);
    if (!di || di.kind !== 'shape' || !di.bounds) {
      return;
    }
    const host = created.get(hostBo.id);
    const shape = this.elementFactory.createShape({
      id: bo.id,
      businessObject: bo,
      x: di.bounds.x,
      y: di.bounds.y,
      width: di.bounds.width,
      height: di.bounds.height,
      host,
      di: di.node
    });
    this.canvas.addShape(shape, host.parent);
    created.set(bo.id, shape);
    this.addLabel(shape, bo, di);
  }

  private buildAllConnections(definitions: any, semanticById: Map<string, any>, diById: Map<string, DiView>, created: Map<string, any>): void {
    const root = this.canvas.getRootElement();

    const addConnection = (bo: any): void => {
      if (created.has(bo.id)) {
        return;
      }
      const di = diById.get(bo.id);
      const sourceBo = bo.sourceRef;
      const targetBo = bo.targetRef;
      if (!di || di.kind !== 'edge' || !sourceBo || !targetBo) {
        return;
      }
      const source = created.get(sourceBo.id);
      const target = created.get(targetBo.id);
      if (!source || !target) {
        return;
      }
      const parent = findCommonParent(source, target) ?? root;
      const connection = this.elementFactory.createConnection({
        id: bo.id,
        businessObject: bo,
        type: bo.$type,
        source,
        target,
        waypoints: (di.waypoints ?? []).map((w) => ({ x: w.x, y: w.y })),
        ...(di.colors ? { colors: di.colors } : {}),
        di: di.node
      });
      this.canvas.addConnection(connection, parent);
      created.set(bo.id, connection);
      this.addLabel(connection, bo, di);
    };

    for (const rootElement of definitions.rootElements) {
      if (rootElement.$type === 'bpmn:Collaboration') {
        for (const flow of (rootElement as any).messageFlows ?? []) {
          addConnection(flow);
        }
        for (const artifact of (rootElement as any).artifacts ?? []) {
          if ((artifact as any).sourceRef) {
            addConnection(artifact);
          }
        }
      } else if (rootElement.$type === 'bpmn:Process') {
        collectConnections(rootElement as any, addConnection);
      }
    }

    // 数据关联不在 process.flowElements（是活动的子元素），单独按语义集合重建
    for (const bo of semanticById.values()) {
      if (bo.$type === 'bpmn:DataInputAssociation' || bo.$type === 'bpmn:DataOutputAssociation') {
        addConnection(bo);
      }
    }
  }

  private addShape(bo: any, di: DiView, fallbackParent: any, created: Map<string, any>): any {
    if (created.has(bo.id)) {
      return created.get(bo.id);
    }
    const shape = this.elementFactory.createShape({
      id: bo.id,
      businessObject: bo,
      x: di.bounds!.x,
      y: di.bounds!.y,
      width: di.bounds!.width,
      height: di.bounds!.height,
      ...(isSubProcessFamily(bo.$type) ? { isExpanded: di.isExpanded !== false } : {}),
      ...(di.colors ? { colors: di.colors } : {}),
      di: di.node
    });
    const parent = this.resolveParent(shape, fallbackParent);
    this.canvas.addShape(shape, parent);
    created.set(bo.id, shape);
    this.addLabel(shape, bo, di);
    return shape;
  }

  /**
   * 外部标签元素（注册表 labelMode='external' 的形状与全部连线）：独立画布
   * 元素（可选中/拖动/直编）。位置优先 DI 的 BPMNLabel bounds（用户建立过的
   * 位置原样恢复），否则按 LabelGeometry 派生默认；空文本隐藏。
   */
  private addLabel(element: any, bo: any, di: DiView): void {
    const external = element.waypoints
      ? true
      : this.elementTypes.shapeMeta(bo.$type)?.labelMode === 'external';
    if (!external) {
      return;
    }
    const text: string | undefined = bo.name;
    const box = di.labelBounds ?? absoluteLabelBox(this.textUtil, element, text);
    const label = this.elementFactory.create('label', {
      id: `${element.id}_label`,
      type: 'label',
      labelMode: 'external',
      businessObject: bo,
      hidden: !text,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    });
    label.labelTarget = element;
    this.canvas.addShape(label, element.parent ?? this.canvas.getRootElement());
  }

  /** 几何父级：最内层包含节点中心的容器；边界事件直接挂宿主父级 */
  private resolveParent(shape: any, fallbackParent: any): any {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    let best: any = null;
    let bestArea = Infinity;

    const visit = (parent: any): void => {
      for (const child of parent.children ?? []) {
        const bo = child.businessObject;
        if (!bo || !(isPoolFamily(bo.$type) || isSubProcessFamily(bo.$type)) || child === shape) {
          continue;
        }
        if (contains(child, cx, cy)) {
          const area = child.width * child.height;
          if (area < bestArea) {
            bestArea = area;
            best = child;
          }
          visit(child);
        }
      }
    };
    visit(this.canvas.getRootElement());

    return best ?? fallbackParent;
  }
}

/**
 * 主图平面（树上的真 DI 节点，序列化事实源）：与 BpmnReader.mainPlaneTarget
 * 同一定位规则——bpmnElement 解析为 planeTargetId 的第一个图；返回 null 表示
 * 退化文档（无平面目标），根不挂 di。
 */
function mainPlane(definitions: any, planeTargetId: string): any | null {
  if (!planeTargetId) {
    return null;
  }
  for (const diagram of definitions.diagrams ?? []) {
    const target = diagram.plane?.bpmnElement;
    const targetId = target ? (typeof target === 'string' ? target : String(target.id ?? '')) : '';
    if (targetId === planeTargetId) {
      return diagram.plane;
    }
  }
  return null;
}

/** moddle DI 节点 → 内部视图（Shape/Edge 归一；引用属性取局部名键，bioc 扩展并入为 fill/stroke） */
function normalizeDi(node: any): DiView | null {
  if (!node) {
    return null;
  }
  const isShape = node.$type === 'bpmndi:BPMNShape';
  if (!isShape && node.$type !== 'bpmndi:BPMNEdge') {
    return null;
  }
  const fill = node.fill;
  const stroke = node.stroke;
  const bpmnElement = node.bpmnElement;
  return {
    kind: isShape ? 'shape' : 'edge',
    bpmnElement: typeof bpmnElement === 'string' ? bpmnElement : String(bpmnElement?.id ?? ''),
    bounds: node.bounds
      ? { x: node.bounds.x, y: node.bounds.y, width: node.bounds.width, height: node.bounds.height }
      : undefined,
    waypoints: (node.waypoint ?? []).map((w: any) => ({ x: w.x, y: w.y })),
    isExpanded: node.isExpanded,
    isHorizontal: node.isHorizontal,
    isMarkerVisible: node.isMarkerVisible,
    colors: fill || stroke ? { fill: fill || undefined, stroke: stroke || undefined } : undefined,
    labelBounds: node.label?.bounds
      ? { x: node.label.bounds.x, y: node.label.bounds.y, width: node.label.bounds.width, height: node.label.bounds.height }
      : null,
    node
  };
}

function contains(shape: any, x: number, y: number): boolean {
  return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;
}

function isNode(bo: any): boolean {
  const t = bo.$type;
  // 流节点（事件/活动/网关）+ 数据 + 制品：族谓词单一事实源（见 meta/ElementTypes）
  return isFlowNodeType(t) || isDataFamily(t) || isArtifactFamily(t);
}

function collectConnections(containerBo: any, fn: (bo: any) => void): void {
  for (const bo of containerBo.flowElements ?? []) {
    if ((bo as any).sourceRef && (bo.$type !== 'bpmn:Group' && bo.$type !== 'bpmn:TextAnnotation' && bo.$type !== 'bpmn:DataObjectReference' && bo.$type !== 'bpmn:DataStoreReference')) {
      fn(bo);
    }
    if (isSubProcessFamily(bo.$type)) {
      collectConnections(bo, fn);
    }
  }
  // 容器级制品中的关联（Association 挂 artifacts）
  for (const bo of containerBo.artifacts ?? []) {
    if ((bo as any).sourceRef) {
      fn(bo);
    }
  }
}

function findCommonParent(a: any, b: any): any {
  const ancestors = new Set<any>();
  let current: any = a;
  while (current) {
    ancestors.add(current);
    current = current.parent;
  }
  current = b;
  while (current) {
    if (ancestors.has(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}
