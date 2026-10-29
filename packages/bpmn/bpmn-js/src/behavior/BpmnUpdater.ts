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
import type { BpmnDocumentState } from '../xml/DocumentState';
import type { BpmnFactory } from '../factory/BpmnFactory';
import type { OrientationService } from '../meta/Orientation';
import { syncEdgeDi, syncLabelBoundsDi, syncShapeDi } from '../xml/DiMapper';
import { isSubProcessFamily } from '../meta/ElementTypes';
import { isArtifactType } from '../util/ModelUtil';

export class BpmnUpdater extends CommandInterceptor {
  static $inject = ['eventBus', 'bpmnDocumentState', 'bpmnFactory', 'orientationService'];

  constructor(
    eventBus: EventBus,
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
      // orphan 内含 detachDi（摘 DI 节点+清引用）：清引用后 redo（executed
      // 重放）里 ensureShapeDi 的 shape.di?.$type 守卫才会重建，否则 DI 永久
      // 滞留 plane 外，序列化丢形
      this.orphan(shape);
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
      // unwireConnection → orphan 内含 detachDi：清引用后 redo 时 ensureEdgeDi
      // 守卫才会重建，连线 DI 不滞留 plane 外
      this.unwireConnection(connection);
    });

    for (const hook of ['connection.reconnectStart', 'connection.reconnectEnd']) {
      this.on(hook, 'executed', (event: any) => {
        const context = event.context;
        const connection = context.connection;
        this.unwireConnection(connection, { keepSemanticParent: true });
        this.wireConnection(connection, connection.source, connection.target, { skipAdopt: true });
      });
    }

    // 删除语义同步挂底层命令（shape.delete/connection.delete）而非顶层聚合
    // （elements.delete）：删形状时 DeleteShapeHandler.preExecute 把进出连线与
    // 子形状以嵌套命令级联删除（各自触发同款底层命令），聚合级监听看不到嵌套
    // 命令——语义树残留幽灵连线（sourceRef/targetRef 悬空），重导入丢引用、
    // 字节级往返破坏、规则引擎踩幽灵节点即崩。标签元素共享宿主 bo，全部跳过
    this.on('connection.delete', 'executed', (event: any) => {
      const { connection } = event.context;
      if (connection.labelTarget) {
        return;
      }
      this.unwireConnection(connection);
      this.bpmnFactory.destroy(connection.businessObject);
    });
    this.on('connection.delete', 'reverted', (event: any) => {
      const { connection } = event.context;
      if (connection.labelTarget) {
        return;
      }
      this.detachDi(connection);
      this.wireConnection(connection, connection.source, connection.target);
      this.ensureEdgeDi(connection);
      this.bpmnFactory.reclaim(connection.businessObject);
    });
    this.on('shape.delete', 'executed', (event: any) => {
      const { shape } = event.context;
      if (shape.labelTarget) {
        return;
      }
      this.orphan(shape);
      this.bpmnFactory.destroy(shape.businessObject);
    });
    // 撤销删除：底层命令 revert 只恢复画布（不走 create 命令），语义挂接/DI
    // 节点在此对称重建（连线先于宿主形状 revert：端点 bo 引用先行解析；形状
    // revert 后 parent 已复原，adopt 的父链解析成立）；detachDi 摘残留 DI 节点
    // 并清引用，让 ensure*Di 重建
    this.on('shape.delete', 'reverted', (event: any) => {
      const { shape } = event.context;
      if (shape.labelTarget || !shape.businessObject) {
        return;
      }
      this.detachDi(shape);
      this.adopt(shape);
      this.ensureShapeDi(shape);
      this.bpmnFactory.reclaim(shape.businessObject);
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
    this.detachDi(lane);
    for (const process of this.state.processes()) {
      for (const laneSet of process.laneSets ?? []) {
        removeFrom(laneSet.lanes, bo);
      }
    }
    // 子泳道：全树 childLaneSet 内摘除（childLaneSet 是 Lane 专属属性，通递归
    // 分支的摘除已覆盖专项分支的同义操作——递归进入时再摘自身一级）
    const walk = (containerBo: any): void => {
      for (const child of containerBo.flowElements ?? []) {
        const set = child.childLaneSet;
        if (set) {
          removeFrom(set.lanes, bo);
          walk(child);
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
    // 池聚合：同批变更元素按所属池分组处理
    const pools = new Map<any, any[]>();
    for (const element of elements) {
      let parent = element;
      while (parent) {
        if (parent.businessObject?.$type === 'bpmn:Participant') {
          const bucket = pools.get(parent) ?? [];
          bucket.push(element);
          pools.set(parent, bucket);
          break;
        }
        parent = parent.parent;
      }
    }
    for (const [pool, changed] of pools) {
      const lanes = (pool.children ?? []).filter((c: any) => c.businessObject?.$type === 'bpmn:Lane');
      if (lanes.length === 0) {
        continue;
      }
      // 带界/池体几何变化会整体改变带内归属 → 全池重算（原语义不变）；
      // 普通节点移动只影响自身进出道 → 单点差分（热路径：每次命令收尾必经，
      // 原实现全池 O(道×节点) 重扫）
      const bandChanged = changed.some(
        (e: any) => e === pool || e.businessObject?.$type === 'bpmn:Lane'
      );
      if (bandChanged) {
        this.recomputePoolMembership(pool, lanes);
        continue;
      }
      for (const element of changed) {
        const bo = element.businessObject;
        if (
          !bo ||
          element.waypoints ||
          element.labelTarget ||
          typeof bo.$instanceOf !== 'function' ||
          !bo.$instanceOf('bpmn:FlowNode')
        ) {
          continue;
        }
        const cx = element.x + element.width / 2;
        const cy = element.y + element.height / 2;
        const inside = (lane: any): boolean =>
          cx >= lane.x && cx <= lane.x + lane.width && cy >= lane.y && cy <= lane.y + lane.height;
        const geometric = lanes.find(inside);
        const registered = lanes.find((lane: any) => (lane.businessObject.flowNodeRef ?? []).includes(bo));
        if (geometric === registered) {
          continue;
        }
        if (registered) {
          removeFrom(registered.businessObject.flowNodeRef, bo);
        }
        if (geometric) {
          (geometric.businessObject.flowNodeRef ??= []).push(bo);
        }
      }
    }
  }

  /** 全池泳道归属重算：按几何中心落带重建每条道的 flowNodeRef（带界变化路径） */
  private recomputePoolMembership(pool: any, lanes: any[]): void {
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

  // ---------- DI 图同步 ----------

  /** 新建形状：创建 BPMNShape DI 节点（字段初始化复用 syncShapeDi：几何/池朝向/展开态）挂所属平面并回挂 element.di */
  private ensureShapeDi(shape: any): void {
    // 标签元素无自有 DI 节点（几何存宿主 di.label.bounds）
    const bo = shape.businessObject;
    if (!bo || shape.labelTarget || shape.di?.$type) {
      return;
    }
    const di = this.bpmnFactory.create<any>({ $type: 'bpmndi:BPMNShape', bpmnElement: bo });
    syncShapeDi(di, shape, this.bpmnFactory, this.orientationService.isHorizontal());
    const plane = this.planeFor(shape);
    if (plane) {
      (plane.planeElement ??= []).push(di);
    }
    shape.di = di;
  }

  /** 新建连线：创建 BPMNEdge DI 节点（航点复用 syncEdgeDi 逐点重建）挂所属平面并回挂 element.di */
  private ensureEdgeDi(connection: any): void {
    const bo = connection.businessObject;
    if (!bo || connection.di?.$type) {
      return;
    }
    const di = this.bpmnFactory.create<any>({ $type: 'bpmndi:BPMNEdge', bpmnElement: bo, waypoint: [] });
    syncEdgeDi(di, connection, this.bpmnFactory);
    const plane = this.planeFor(connection);
    if (plane) {
      (plane.planeElement ??= []).push(di);
    }
    connection.di = di;
  }

  /**
   * 元素所属平面的 DI 挂接点：按画布父链爬到根判定——根 di 即该根平面的
   * BPMNPlane 节点（主图根挂主图平面；子流程下钻平面根挂其平面）。子流程
   * 平面根尚无平面（纯浏览未落元素）时在此懒建：首个元素落平面才产生
   * BPMNDiagram，纯导航不改变 XML（字节级往返稳定）。
   */
  private planeFor(element: any): any | null {
    let current = element;
    while (current?.parent) {
      current = current.parent;
    }
    const root = current;
    if (root?.di?.$type === 'bpmndi:BPMNPlane') {
      return root.di;
    }
    if (root?.businessObject && isSubProcessFamily(root.businessObject.$type)) {
      const diagram = this.bpmnFactory.createDiagram(root.businessObject);
      (this.state.definitions.diagrams ??= []).push(diagram);
      root.di = diagram.plane;
      return diagram.plane;
    }
    return this.state.plane;
  }

  /** 画布元素 → DI 节点几何/颜色回写（无 DI 节点的元素跳过；根的 di 是主图平面——无几何/颜色语义，勿写） */
  private syncDi(element: any): void {
    const di = element.di;
    if (!di?.$type || di.$type === 'bpmndi:BPMNPlane') {
      return;
    }
    if (di.$type === 'bpmndi:BPMNShape') {
      syncShapeDi(di, element, this.bpmnFactory, this.orientationService.isHorizontal());
    } else {
      syncEdgeDi(di, element, this.bpmnFactory);
    }
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
    syncLabelBoundsDi(di, label, this.bpmnFactory);
  }

  // ---------- 挂接 ----------

  /**
   * DI 摘除单出口：从平面摘 DI 节点并清 element.di 引用（revert 后重执行由
   * ensure*Di 重建；不清引用会让 ensure*Di 的 di?.$type 守卫跳过重建，DI
   * 永久滞留 plane 外、序列化丢形）。
   * 全平面扫描而非按父链定位：shape.create/lane.add 的 revert 先 removeShape
   * 置 parent=null，父链断后 planeFor 会把元素自身当根误入子流程懒建分支
   * （平白新建空图、真平面上的 DI 摘不到）；bo 单父挂靠下全扫等价精确摘除。
   */
  private detachDi(element: any): void {
    for (const diagram of this.state.definitions.diagrams ?? []) {
      removeFrom(diagram.plane?.planeElement, element.di);
    }
    element.di = undefined;
  }

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
    // 不进 flowElements（Artifact 与 FlowElement 是并列基类）。
    // "挂协作根"按父 bo 类型判定而非与当前根身份比较——子流程下钻平面内
    // 当前根就是平面根，身份比较会把平面内注记误挂到协作上
    if (isArtifactType(type)) {
      if (shape.parent?.businessObject?.$type === 'bpmn:Collaboration' && this.state.collaboration) {
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
    // DI 节点随语义一并摘除并清引用（detachDi 单出口：revert 后重执行会重建）
    this.detachDi(shape);
    removeFrom(this.state.collaboration?.participants, bo);
    removeFrom(this.state.collaboration?.messageFlows, bo);
    removeFrom(this.state.collaboration?.artifacts, bo);

    // 数据关联从活动列表摘除
    for (const process of this.state.processes()) {
      removeFromDataAssoc(process, bo);
    }

    // 语义摘除走全容器扫描而非 semanticParentBo：shape.create 的 revert 先
    // removeShape 置 parent=null，父链断后回退 processes[0] 会到主流程上摘
    // （子流程平面内创建的元素摘不到→redo 重放 adopt 再挂一次=语义双胞胎）；
    // bo 单父挂靠下全扫等价精确摘除（与 syncAfterMove 旧容器清理同款手法）
    for (const container of this.allContainers()) {
      removeFrom(container.flowElements, bo);
      removeFrom(container.artifacts, bo);
    }

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
    const isArtifact = isArtifactType(bo.$type);
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
