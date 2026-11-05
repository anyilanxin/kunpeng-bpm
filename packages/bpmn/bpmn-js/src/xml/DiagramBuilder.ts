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
import { externalLabelAttrs, needsExternalLabel } from '../label/ExternalLabels';
import { absoluteLabelBox } from '../label/LabelGeometry';
import { isAnnotationArtifact } from '../util/ModelUtil';
import { isFlowNodeType, isDataFamily, isArtifactFamily, isPoolFamily, isSubProcessFamily } from '../meta/ElementTypes';
import { readDiView, type DiView } from './DiMapper';
import { mainPlaneTargetId, planeOfElement, type BpmnParseResult } from './BpmnReader';

export class DiagramBuilder {
  static $inject = ['canvas', 'elementFactory', 'bpmnElementTypes', 'textRenderer', 'bpmnDocumentState'];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementFactory: BpmnElementFactory,
    private readonly elementTypes: BpmnElementTypes,
    private readonly textUtil: TextUtil,
    private readonly state: { definitions: any }
  ) {}

  build(parseResult: BpmnParseResult): void {
    // 容器索引按文档重建（实例复用跨多次导入，残留旧文档容器会污染几何父级推导）
    this.containerIndex.length = 0;
    const { definitions, semanticById, planeTargetId } = parseResult;
    // 主图建图只消费主平面 DI：折叠子流程的内容元素 DI 在其独立平面
    // （下钻平面，planeOfElement），混入会把另一坐标空间的形状错建到主图
    const main = mainPlaneTargetId(definitions);
    const diById = collectDiViews(main?.plane);
    const created = new Map<string, any>();

    // 根元素承载平面指向的语义根（Process/Collaboration，真 moddle 实例——
    // 面板等插件对任意元素调 bo.get()/$instanceOf），主图平面（树上的真 DI
    // 节点）只作 di 附着：空白点击的属性面板编辑流程语义并落 XML。
    // 平面目标缺失/悬空为不可显示文档：明确失败，不静默给无 bo 裸根
    // （其上的面板编辑会全部落空）。
    const planeTarget = semanticById.get(planeTargetId);
    if (!planeTarget) {
      throw new Error(`无法解析主图平面目标：BPMNPlane bpmnElement="${planeTargetId}" 未命中任何元素`);
    }
    const root = this.elementFactory.createRoot({
      type: planeTarget.$type,
      businessObject: planeTarget,
      di: main?.plane ?? undefined
    });
    this.canvas.setRootElement(root);

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

  /**
   * 子流程下钻平面建图：为折叠子流程建独立画布根（隐藏图层，切换由
   * PlaneService 驱动）并按该子流程平面的 DI 建内容。平面可不存在（首次
   * 下钻空平面）——根不挂 di，首个元素落平面时由 BpmnUpdater 懒建平面。
   * 根 id 用 `{bo.id}_plane`：主平面上该子流程形状已占 bo.id，注册表同 id 冲突。
   */
  buildSubProcessPlane(subProcessBo: any): any {
    this.containerIndex.length = 0;
    const plane = planeOfElement(this.state.definitions, subProcessBo);
    const diById = collectDiViews(plane);
    const root = this.elementFactory.createRoot({
      type: subProcessBo.$type,
      businessObject: subProcessBo,
      id: `${subProcessBo.id}_plane`,
      di: plane ?? undefined
    });
    // 先注册隐藏图层再建内容（addShape 需父根在画布注册表中），显隐切换由调用方
    this.canvas.addRootElement(root);
    const created = new Map<string, any>();
    this.buildProcessContents(subProcessBo, root, diById, created);
    // 边界事件（本平面子树内）
    walkSemanticTree(subProcessBo, (bo) => {
      if (bo.$type === 'bpmn:BoundaryEvent') {
        this.buildBoundaryEvent(bo, diById, created);
      }
    });
    // 连线（本平面子树内：顺序流/关联 + 挂活动的数据关联）
    const addConnection = (bo: any): void => {
      if (created.has(bo.id)) {
        return;
      }
      const di = diById.get(bo.id);
      const source = created.get(bo.sourceRef?.id);
      const target = created.get(bo.targetRef?.id);
      if (!di || di.kind !== 'edge' || !source || !target) {
        return;
      }
      const connection = this.elementFactory.createConnection({
        id: bo.id,
        businessObject: bo,
        type: bo.$type,
        source,
        target,
        waypoints: di.waypoints ?? [],
        ...(di.colors ? { colors: di.colors } : {}),
        di: di.node
      });
      this.canvas.addConnection(connection, findCommonParent(source, target) ?? root);
      created.set(bo.id, connection);
      this.addLabel(connection, bo, di);
    };
    walkSemanticTree(subProcessBo, (bo) => {
      if (bo.sourceRef && bo.$type !== 'bpmn:Group' && bo.$type !== 'bpmn:TextAnnotation'
        && bo.$type !== 'bpmn:DataObjectReference' && bo.$type !== 'bpmn:DataStoreReference') {
        addConnection(bo);
      }
    });
    return root;
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
      if (isAnnotationArtifact(artifact.$type)) {
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
        // 折叠态内容不建在本平面：其子元素 DI 属独立下钻平面（BPMN 多图语义），
        // 经 PlaneService 下钻时按该平面另建；展开态（本平面 DI）照旧递归
        if (shape && shape.isExpanded !== false) {
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
      if (isAnnotationArtifact(artifact.$type)) {
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
        waypoints: di.waypoints ?? [],
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

  /** 几何容器索引：建图期自上而下收集的池/道/子流程画布元素（几何父级推导候选） */
  private readonly containerIndex: any[] = [];

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
    const parent = this.resolveParent(shape, bo, fallbackParent);
    this.canvas.addShape(shape, parent);
    if (isPoolFamily(bo.$type) || isSubProcessFamily(bo.$type)) {
      this.containerIndex.push(shape);
    }
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
    if (!needsExternalLabel(element, this.elementTypes)) {
      return;
    }
    const text: string | undefined = bo.name;
    const box = di.labelBounds ?? absoluteLabelBox(this.textUtil, element, text);
    const label = this.elementFactory.create('label', {
      ...externalLabelAttrs(element),
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    });
    label.labelTarget = element;
    this.canvas.addShape(label, element.parent ?? this.canvas.getRootElement());
  }

  /**
   * 几何父级：包含节点中心的**最小面积**容器（=原自根递归取最内层的语义；
   * 容器互为包含关系，不包含者其子容器亦不可能包含该点）。候选取建图期
   * 自上而下收集的 containerIndex（容器先于内容创建，推导时索引已完备），
   * 免去逐形状自根递归扫画布——无池大图导入 O(n²) 热点的根除。
   *
   * 几何候选须**语义合法**（2026-11-04 立）：候选.bo === bo.$parent（直接
   * 语义父——子流程/根流程）、泳道 flowNodeRef 引用本元素、池 processRef
   * 承载本元素所属流程；否则回落语义父（fallbackParent）。纯几何收养会把
   * 「扩容后容器几何罩住的已脱离元素」重新挂回容器名下（画布/语义树分叉，
   * 骑跨扩容+整出脱离同帧即触发）——语义树是序列化事实源，导入不得改写归属。
   */
  private resolveParent(shape: any, bo: any, fallbackParent: any): any {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    let best: any = null;
    let bestArea = Infinity;
    for (const container of this.containerIndex) {
      if (contains(container, cx, cy) && semanticallyLegal(container, bo)) {
        const area = container.width * container.height;
        if (area < bestArea) {
          bestArea = area;
          best = container;
        }
      }
    }
    return best ?? fallbackParent;
  }
}

function contains(shape: any, x: number, y: number): boolean {
  return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;
}

/**
 * 几何候选容器的语义合法性：候选.bo 是元素的直接语义父（bo.$parent——
 * Process 根/SubProcess）、泳道 flowNodeRef 引用本元素、或池的 processRef
 * 承载本元素所属流程。三律之外的几何包含不构成归属（语义树单一事实源）。
 */
function semanticallyLegal(container: any, bo: any): boolean {
  const cbo = container?.businessObject;
  if (!cbo || !bo) {
    return false;
  }
  if (cbo === bo.$parent) {
    return true;
  }
  const type = cbo.$type;
  if (type === 'bpmn:Lane') {
    return (cbo.flowNodeRef ?? []).some((ref: any) => ref?.id === bo.id);
  }
  if (type === 'bpmn:Participant') {
    return cbo.processRef === bo.$parent;
  }
  return false;
}

/** 平面 DI 节点 → 视图映射（按平面收集；空平面/无平面返回空表） */
function collectDiViews(plane: any | null): Map<string, DiView> {
  const diById = new Map<string, DiView>();
  for (const node of plane?.planeElement ?? []) {
    const view = readDiView(node);
    if (view) {
      diById.set(view.bpmnElement, view);
    }
  }
  return diById;
}

/** 语义子树遍历（flowElements + artifacts + 挂活动的数据关联，递归子流程；根自身不回调） */
function walkSemanticTree(containerBo: any, fn: (bo: any) => void): void {
  for (const bo of containerBo.flowElements ?? []) {
    fn(bo);
    if (isSubProcessFamily(bo.$type)) {
      walkSemanticTree(bo, fn);
    }
    for (const assoc of [...(bo.dataInputAssociations ?? []), ...(bo.dataOutputAssociations ?? [])]) {
      fn(assoc);
    }
  }
  for (const bo of containerBo.artifacts ?? []) {
    fn(bo);
  }
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
