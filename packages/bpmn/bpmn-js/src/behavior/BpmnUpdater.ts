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
 * 语义同步器：命令 executed/reverted 对称地把画布操作映射到业务对象树。
 *
 * 维护：flowElements 挂接、sourceRef/targetRef、incoming/outgoing、attachedToRef、
 * 协作参与者/消息流登记、数据关联挂到活动的 dataInput/OutputAssociations，
 * 以及 DI 图同步——新建元素创建 DI 节点挂主图 plane，画布几何/颜色变更
 * （elements.changed）回写 bounds/waypoint/bioc 属性（语义树含 DI 图是序列化
 * 的唯一事实源，画布只是编辑视图）。
 */
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { BpmnDocumentState } from '../xml/DocumentState';
import type { BpmnFactory } from '../factory/BpmnFactory';
import type { OrientationService } from '../meta/Orientation';
import { isPoolFamily, isSubProcessFamily } from '../meta/ElementTypes';

export class BpmnUpdater extends CommandInterceptor {
  static $inject = ['eventBus', 'canvas', 'bpmnDocumentState', 'bpmnFactory', 'orientationService'];

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly state: BpmnDocumentState,
    private readonly bpmnFactory: BpmnFactory,
    private readonly orientationService: OrientationService
  ) {
    super(eventBus);

    this.on('shape.create', 'executed', (event: any) => {
      const { shape } = event.context;
      this.adopt(shape);
      this.ensureShapeDi(shape);
    });
    // AttachSupport 在 postExecute 阶段才把 host 写回 shape（executed 时机读不到），
    // 边界事件的 attachedToRef 直接取命令上下文里的 host（createShape attach 分支一开始即设置，
    // 不依赖监听器注册顺序），保证命令生命周期内语义对称（revert 由 orphan 清理）
    this.on('shape.create', 'postExecute', (event: any) => {
      const { shape, host } = event.context;
      if (shape.businessObject && host) {
        shape.businessObject.attachedToRef = host.businessObject;
      }
    });
    // 双保险：吸附路径必经的嵌套命令（updateAttachment 执行完 shape.host 已定），
    // 覆盖移动重挂、以及任何未走 shape.create attach 分支的吸附入口
    this.on('element.updateAttachment', 'executed', (event: any) => {
      const { shape } = event.context;
      const bo = shape.businessObject;
      if (bo && bo.$type === 'bpmn:BoundaryEvent') {
        bo.attachedToRef = shape.host?.businessObject ?? null;
      }
    });
    this.on('shape.create', 'reverted', (event: any) => {
      const { shape } = event.context;
      this.orphan(shape);
      // orphan 只把 DI 节点从 plane 摘除，引用仍挂在 shape 上；不清掉的话
      // redo（executed 重放）里 ensureShapeDi 的 shape.di?.$type 守卫会跳过
      // 重建——DI 永久滞留 plane 外，序列化丢形（同 elements.delete reverted 的处理）
      if (!shape.labelTarget) {
        shape.di = undefined;
      }
    });

    this.on('elements.move', 'executed', (event: any) => {
      const { shapes } = event.context;
      for (const shape of shapes) {
        this.syncAfterMove(shape);
      }
    });

    // 注：移动后的连线重排由 diagram-js 核心 MoveShapeHandler.postExecute 负责
    // （modeling.layoutConnection + 移动锚点 hints，最终走本仓 BpmnLayouter），
    // 此处不得重复重排，否则航点会叠加 delta（视觉断线）。

    this.on('connection.create', 'preExecute', (event: any) => {
      this.finalizeConnectionType(event.context);
    });
    this.on('connection.create', 'executed', (event: any) => {
      const { connection, source, target } = event.context;
      this.wireConnection(connection, source, target);
      this.ensureEdgeDi(connection);
    });
    this.on('connection.create', 'reverted', (event: any) => {
      const { connection } = event.context;
      this.unwireConnection(connection);
      // 同 shape.create reverted：摘除后清引用，否则 redo 时 ensureEdgeDi
      // 守卫跳过重建，连线 DI 滞留 plane 外
      connection.di = undefined;
    });

    for (const hook of ['connection.reconnectStart', 'connection.reconnectEnd']) {
      this.on(hook, 'executed', (event: any) => {
        const context = event.context;
        const connection = context.connection;
        this.unwireConnection(connection, { keepSemanticParent: true });
        this.wireConnection(connection, connection.source, connection.target, { skipAdopt: true });
      });
    }

    this.on('elements.delete', 'postExecuted', (event: any) => {
      const elements: any[] = event.context.elements;
      // 先清连线引用（id 一并释放），再清形状；标签元素共享宿主 bo，语义/DI 操作全部跳过
      for (const element of elements.filter((e) => e.waypoints)) {
        this.unwireConnection(element);
        this.bpmnFactory.destroy(element.businessObject);
      }
      for (const element of elements.filter((e) => !e.waypoints && !e.labelTarget)) {
        this.orphan(element);
        this.bpmnFactory.destroy(element.businessObject);
      }
    });

    // 撤销删除：DeleteElementsHandler.revert 只恢复画布（不走 create 命令），
    // 语义挂接/DI 节点在此对称重建（形状先就位，连线端点才可解析；被摘的
    // element.di 已脱离 plane，先清引用让 ensure*Di 重建）
    this.on('elements.delete', 'reverted', (event: any) => {
      const elements: any[] = event.context.elements;
      for (const element of elements.filter((e) => !e.waypoints && !e.labelTarget && e.businessObject)) {
        element.di = undefined;
        this.adopt(element);
        this.ensureShapeDi(element);
        this.bpmnFactory.reclaim(element.businessObject);
      }
      for (const element of elements.filter((e) => e.waypoints && e.businessObject)) {
        element.di = undefined;
        this.wireConnection(element, element.source, element.target);
        this.ensureEdgeDi(element);
        this.bpmnFactory.reclaim(element.businessObject);
      }
    });

    // 几何/颜色回写：画布元素变更（移动/缩放/重路由/着色）统一同步到 DI 节点；
    // 同批重算涉及池的泳道归属（元素动/带滑动都改变几何归属）
    // （elements/elements 恒为数组：CommandStack 侧构造事件）
    eventBus.on('elements.changed', (event: any) => {
      for (const element of event.elements) {
        // 标签元素无自有 DI：几何回写宿主 di.label.bounds（拖动/随宿主移动收敛，
        // 导出经描述驱动序列化持久化）；隐藏标签不落位置（派生即可复现）
        if (element.labelTarget) {
          this.syncLabelBounds(element);
        } else {
          this.syncDi(element);
        }
      }
      this.syncLaneMembership(event.elements);
    });

    // 泳道命令直走 canvas.addShape（不经 shape.create），语义挂接/DI 挂摘
    // 经其自有生命周期事件对称维护（含命令 revert 路径）
    eventBus.on('bpmn.lane.added', (event: any) => {
      this.adoptLane(event.lane);
      this.ensureShapeDi(event.lane);
    });
    eventBus.on('bpmn.lane.removed', (event: any) => {
      this.orphanLane(event.lane);
    });
  }

  // ---------- 泳道 ----------

  /** 泳道语义挂接：池→processRef.laneSets[0]；子泳道→parentLane.childLaneSet */
  private adoptLane(lane: any): void {
    const bo = lane.businessObject;
    if (!bo) {
      return;
    }
    let laneSet: any;
    const parentBo = lane.parent?.businessObject;
    if (parentBo?.$type === 'bpmn:Lane') {
      laneSet = parentBo.childLaneSet ??= this.bpmnFactory.createLaneSet();
    } else {
      const process = parentBo?.$type === 'bpmn:Participant' ? parentBo.processRef : null;
      if (!process) {
        return;
      }
      laneSet = process.laneSets?.[0] ?? this.bpmnFactory.createLaneSet();
      if (!process.laneSets?.includes(laneSet)) {
        (process.laneSets ??= []).push(laneSet);
      }
    }
    if (!laneSet.lanes.includes(bo)) {
      laneSet.lanes.push(bo);
    }
  }

  private orphanLane(lane: any): void {
    const bo = lane.businessObject;
    if (!bo) {
      return;
    }
    removeFrom(this.state.plane?.planeElement, lane.di);
    for (const process of this.state.processes()) {
      for (const laneSet of process.laneSets ?? []) {
        removeFrom(laneSet.lanes, bo);
      }
    }
    // 子泳道：全树 childLaneSet 内摘除
    const walk = (containerBo: any): void => {
      for (const child of containerBo.flowElements ?? []) {
        const set = child.childLaneSet;
        if (set) {
          removeFrom(set.lanes, bo);
          walk(child);
        }
        if (child.$type === 'bpmn:Lane') {
          const sub = child.childLaneSet;
          if (sub) removeFrom(sub.lanes, bo);
        }
      }
      const self = containerBo.childLaneSet;
      if (self) removeFrom(self.lanes, bo);
    };
    for (const process of this.state.processes()) {
      walk(process);
    }
  }

  /**
   * 泳道归属重算：lane.flowNodeRef 按几何（元素中心落带）整池重算——
   * 元素移动、带插入/分割/删除/滑动后统一收敛，撤销同样经 elements.changed
   * 回到正确归属（纯派生状态，无需进命令栈）。子泳道（childLaneSet）不参与
   * 几何重算（本组件不支持嵌套泳道创建，保持导入语义原样）。
   */
  private syncLaneMembership(elements: any[]): void {
    const pools = new Set<any>();
    for (const element of elements) {
      let parent = element;
      while (parent) {
        if (parent.businessObject?.$type === 'bpmn:Participant') {
          pools.add(parent);
          break;
        }
        parent = parent.parent;
      }
    }
    for (const pool of pools) {
      const lanes = (pool.children ?? []).filter((c: any) => c.businessObject?.$type === 'bpmn:Lane');
      if (lanes.length === 0) {
        continue;
      }
      // 落池元素以池为父、落道元素以道为父（moveShape 目标可为道），统一按
      // 池的后代收集流节点做几何归属
      const nodes: any[] = [];
      const collect = (container: any): void => {
        for (const child of container.children ?? []) {
          if (child.businessObject?.$type === 'bpmn:Lane') {
            collect(child);
            continue;
          }
          if (
            !child.waypoints &&
            !child.labelTarget &&
            child.businessObject &&
            typeof child.businessObject.$instanceOf === 'function' &&
            child.businessObject.$instanceOf('bpmn:FlowNode')
          ) {
            nodes.push(child);
          }
        }
      };
      collect(pool);
      for (const lane of lanes) {
        const members = nodes.filter(
          (n: any) =>
            n.x + n.width / 2 >= lane.x &&
            n.x + n.width / 2 <= lane.x + lane.width &&
            n.y + n.height / 2 >= lane.y &&
            n.y + n.height / 2 <= lane.y + lane.height
        );
        lane.businessObject.flowNodeRef = members.map((n: any) => n.businessObject);
      }
    }
  }

  // ---------- DI 图同步 ----------

  /** 新建形状：创建 BPMNShape DI 节点（含几何/池朝向/展开态）挂主图 plane 并回挂 element.di */
  private ensureShapeDi(shape: any): void {
    // 标签元素无自有 DI 节点（几何存宿主 di.label.bounds）
    const bo = shape.businessObject;
    if (!bo || shape.labelTarget || shape.di?.$type) {
      return;
    }
    const di = this.bpmnFactory.create<any>({
      $type: 'bpmndi:BPMNShape',
      bpmnElement: bo,
      bounds: this.bpmnFactory.create<any>({
        $type: 'dc:Bounds',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height
      })
    });
    if (isPoolFamily(bo.$type)) {
      di.isHorizontal = this.orientationService.isHorizontal();
    }
    if (isSubProcessFamily(bo.$type) && shape.isExpanded !== undefined) {
      di.isExpanded = shape.isExpanded;
    }
    const plane = this.state.plane;
    if (plane) {
      (plane.planeElement ??= []).push(di);
    }
    shape.di = di;
  }

  /** 新建连线：创建 BPMNEdge DI 节点（含航点）挂主图 plane 并回挂 element.di */
  private ensureEdgeDi(connection: any): void {
    const bo = connection.businessObject;
    if (!bo || connection.di?.$type) {
      return;
    }
    const di = this.bpmnFactory.create<any>({
      $type: 'bpmndi:BPMNEdge',
      bpmnElement: bo,
      waypoint: (connection.waypoints ?? []).map((p: any) =>
        this.bpmnFactory.create<any>({ $type: 'dc:Point', x: p.x, y: p.y })
      )
    });
    const plane = this.state.plane;
    if (plane) {
      (plane.planeElement ??= []).push(di);
    }
    connection.di = di;
  }

  /** 画布元素 → DI 节点几何/颜色回写（无 DI 节点的元素跳过；根的 di 是主图平面——无几何/颜色语义，勿写） */
  private syncDi(element: any): void {
    const di = element.di;
    if (!di?.$type || di.$type === 'bpmndi:BPMNPlane') {
      return;
    }
    if (di.$type === 'bpmndi:BPMNShape') {
      if (element.x !== undefined) {
        di.bounds ??= this.bpmnFactory.create<any>({ $type: 'dc:Bounds' });
        di.bounds.x = element.x;
        di.bounds.y = element.y;
        di.bounds.width = element.width;
        di.bounds.height = element.height;
      }
      if (isSubProcessFamily(element.businessObject?.$type) && element.isExpanded !== undefined) {
        di.isExpanded = element.isExpanded;
      }
      // 池/泳道头带方向：模型朝向是单一事实源，转置命令后经 elements.changed 收敛
      if (isPoolFamily(element.businessObject?.$type)) {
        di.isHorizontal = this.orientationService.isHorizontal();
      }
    } else if (Array.isArray(element.waypoints) && Array.isArray(di.waypoint)) {
      const points = element.waypoints.map((p: any) =>
        this.bpmnFactory.create<any>({ $type: 'dc:Point', x: p.x, y: p.y })
      );
      di.waypoint.splice(0, di.waypoint.length, ...points);
    }
    // 颜色（bioc 社区扩展惯例）：未设置字段按描述移除（序列化不输出）
    di.set('fill', element.colors?.fill);
    di.set('stroke', element.colors?.stroke);
  }

  /**
   * 标签元素 → 宿主 DI 的 BPMNLabel.bounds 回写：位置一旦被用户建立
   * （拖动/随宿主移动）即持久化（导入侧按 bounds 定位，不再派生）；
   * 隐藏标签（空文本）不落位置——派生可复现，写反成噪声。
   */
  private syncLabelBounds(label: any): void {
    if (label.hidden) {
      return;
    }
    const di = label.labelTarget?.di;
    if (!di?.$type) {
      return;
    }
    di.label ??= this.bpmnFactory.create<any>({ $type: 'bpmndi:BPMNLabel' });
    di.label.bounds ??= this.bpmnFactory.create<any>({ $type: 'dc:Bounds' });
    di.label.bounds.x = label.x;
    di.label.bounds.y = label.y;
    di.label.bounds.width = label.width;
    di.label.bounds.height = label.height;
  }

  // ---------- 挂接 ----------

  private adopt(shape: any): void {
    // 标签元素共享宿主 bo（挂接/摘除都会破坏宿主语义树归属）
    if (shape.labelTarget) {
      return;
    }
    const bo = shape.businessObject;
    if (!bo) {
      return;
    }
    const type = bo.$type;

    if (type === 'bpmn:Participant') {
      const collab = this.state.collaboration;
      if (collab && !collab.participants.includes(bo)) {
        collab.participants.push(bo);
      }
      return;
    }

    // 边界事件：语义父级 = 宿主所在容器；attachedToRef 挂宿主
    if (shape.host) {
      bo.attachedToRef = shape.host.businessObject;
    }

    const parentBo = this.semanticParentBo(shape);
    if (!parentBo) {
      return;
    }
    if (type === 'bpmn:MessageFlow') {
      const collab = this.state.collaboration;
      if (collab && !collab.messageFlows.includes(bo)) {
        collab.messageFlows.push(bo);
      }
      return;
    }
    // 制品（注记/分组/关联）：XSD 挂承载容器的 artifacts（协作根→
    // collaboration.artifacts；池内/子流程内→process/subProcess.artifacts），
    // 不进 flowElements（Artifact 与 FlowElement 是并列基类）
    if (type === 'bpmn:Group' || type === 'bpmn:TextAnnotation' || type === 'bpmn:Association') {
      if (this.state.collaboration && this.canvas.getRootElement() === shape.parent) {
        if (!this.state.collaboration.artifacts.includes(bo)) {
          this.state.collaboration.artifacts.push(bo);
        }
      } else {
        (parentBo.artifacts ??= []).push(bo);
      }
      return;
    }
    (parentBo.flowElements ??= []).push(bo);
  }

  private orphan(shape: any): void {
    // 标签元素共享宿主 bo，摘除交由宿主生命周期（LabelSupport 随宿主删）
    if (shape.labelTarget) {
      return;
    }
    const bo = shape.businessObject;
    if (!bo) {
      return;
    }
    // DI 节点随语义一并摘除（revert 后重执行会重建）
    removeFrom(this.state.plane?.planeElement, shape.di);
    removeFrom(this.state.collaboration?.participants, bo);
    removeFrom(this.state.collaboration?.messageFlows, bo);
    removeFrom(this.state.collaboration?.artifacts, bo);

    // 数据关联从活动列表摘除
    for (const process of this.state.processes()) {
      removeFromDataAssoc(process, bo);
    }

    const parentBo = this.semanticParentBo(shape);
    removeFrom(parentBo?.flowElements, bo);
    removeFrom(parentBo?.artifacts, bo);

    // 边界事件清理宿主引用
    if (bo.attachedToRef) {
      bo.attachedToRef = null;
    }
  }

  private syncAfterMove(shape: any): void {
    const bo = shape.businessObject;
    if (!bo) {
      return;
    }
    if (bo.$type === 'bpmn:BoundaryEvent') {
      bo.attachedToRef = shape.host?.businessObject ?? null;
    }
    // 语义父级漂移（跨容器移动）；制品族比对/挂靠 artifacts 数组
    const isArtifact = bo.$type === 'bpmn:Group' || bo.$type === 'bpmn:TextAnnotation' || bo.$type === 'bpmn:Association';
    const parentBo = this.semanticParentBo(shape);
    const settled = isArtifact ? arrayHas(parentBo?.artifacts, bo) : arrayHas(parentBo?.flowElements, bo);
    if (parentBo && !settled) {
      // 从旧容器摘除
      for (const container of this.allContainers()) {
        removeFrom(container.flowElements, bo);
        removeFrom(container.artifacts, bo);
      }
      if (bo.$type !== 'bpmn:Participant') {
        if (isArtifact) {
          (parentBo.artifacts ??= []).push(bo);
        } else {
          (parentBo.flowElements ??= []).push(bo);
        }
      }
    }
  }

  // ---------- 连线 ----------

  /**
   * 数据关联抽象类型 → 具体 dataInput/dataOutput（按端点方向）。
   * moddle 元素 $type 不可变（元模型类型标识），以目标类型重建 businessObject
   * 并回挂连线（preExecute 时机：尚未挂树/挂引用，替换无波及）。
   */
  private finalizeConnectionType(context: any): void {
    const connection = context.connection;
    const bo = connection?.businessObject;
    if (!bo || bo.$type !== 'bpmn:DataAssociation') {
      return;
    }
    const st = context.source?.businessObject?.$type;
    const tt = context.target?.businessObject?.$type;
    const dataTypes = new Set(['bpmn:DataObjectReference', 'bpmn:DataStoreReference']);
    const concrete = dataTypes.has(tt ?? '') && !dataTypes.has(st ?? '')
      ? 'bpmn:DataOutputAssociation'
      : 'bpmn:DataInputAssociation';
    connection.businessObject = this.bpmnFactory.create<any>({ $type: concrete, id: bo.id });
  }

  private wireConnection(connection: any, source: any, target: any, opts: { skipAdopt?: boolean } = {}): void {
    const bo = connection.businessObject;
    if (!bo) {
      return;
    }
    bo.sourceRef = source.businessObject;
    bo.targetRef = target.businessObject;

    if (bo.$type === 'bpmn:DataInputAssociation' || bo.$type === 'bpmn:DataOutputAssociation') {
      const activityBo =
        bo.$type === 'bpmn:DataInputAssociation' ? target.businessObject : source.businessObject;
      const listName =
        bo.$type === 'bpmn:DataInputAssociation' ? 'dataInputAssociations' : 'dataOutputAssociations';
      (activityBo[listName] ??= []).push(bo);
      // XSD：数据关联是活动的子元素（tActivity.dataInput/OutputAssociation），不进 flowElements
      return;
    }

    // XSD：tFlowNode.incoming/outgoing 仅引用顺序流；消息流/关联只挂 sourceRef/targetRef
    if (bo.$type === 'bpmn:SequenceFlow') {
      const sourceBo = source.businessObject;
      const targetBo = target.businessObject;
      if (sourceBo) {
        (sourceBo.outgoing ??= []).push(bo);
      }
      if (targetBo) {
        (targetBo.incoming ??= []).push(bo);
      }
    }
    if (!opts.skipAdopt) {
      this.adopt(connection);
    }
  }

  private unwireConnection(connection: any, opts: { keepSemanticParent?: boolean } = {}): void {
    const bo = connection.businessObject;
    if (!bo) {
      return;
    }
    const sourceBo = bo.sourceRef;
    const targetBo = bo.targetRef;
    if (sourceBo) {
      removeFrom(sourceBo.outgoing, bo);
      removeFrom(sourceBo.dataInputAssociations, bo);
      removeFrom(sourceBo.dataOutputAssociations, bo);
    }
    if (targetBo) {
      removeFrom(targetBo.incoming, bo);
      removeFrom(targetBo.dataInputAssociations, bo);
      removeFrom(targetBo.dataOutputAssociations, bo);
    }
    if (!opts.keepSemanticParent) {
      this.orphan(connection);
    }
  }

  // ---------- 语义父级解析 ----------

  /** 画布父链 → 语义容器 bo（池→processRef；泳道→所属池 processRef；子流程→自身；根→平面目标） */
  private semanticParentBo(element: any): any | null {
    let current = element.parent;
    while (current) {
      const type = current.businessObject?.$type;
      if (type === 'bpmn:Participant') {
        return current.businessObject.processRef;
      }
      if (isSubProcessFamily(type)) {
        return current.businessObject;
      }
      current = current.parent;
    }
    // 根：协作存在时流程语义仍在 process 上（消息流单独处理）——回退到唯一/首个流程
    const processes = this.state.processes();
    return processes[0] ?? null;
  }

  private allContainers(): any[] {
    const containers: any[] = [];
    const walk = (containerBo: any): void => {
      containers.push(containerBo);
      for (const child of containerBo.flowElements ?? []) {
        if (isSubProcessFamily(child.$type)) {
          walk(child);
        }
      }
    };
    for (const root of this.state.definitions.rootElements) {
      if (root.$type === 'bpmn:Process') {
        walk(root);
      }
      if (isSubProcessFamily(root.$type)) {
        walk(root);
      }
    }
    return containers;
  }
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

function arrayHas(list: any[] | undefined, item: any): boolean {
  return !!list?.includes(item);
}

function removeFromDataAssoc(processBo: any, bo: any): void {
  const walk = (container: any): void => {
    removeFrom(container.dataInputAssociations, bo);
    removeFrom(container.dataOutputAssociations, bo);
    for (const child of container.flowElements ?? []) {
      walk(child);
    }
  };
  walk(processBo);
}
