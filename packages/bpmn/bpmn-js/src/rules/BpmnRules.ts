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
 * BPMN 规则（规范语义约束）。
 *
 * 连线类型推断（未显式给 type 时）：
 * 消息流（跨参与者）→ 顺序流（同作用域流节点）→ 数据关联（数据对象↔活动）→ 关联（制品）。
 * `connection.create` 返回对象（含 type）作为连线属性 —— diagram-js Connect/Create 的公开契约。
 *
 * 重叠规定（产品规则，move/create/resize 三入口统一按预估矩形校验）：
 * ① 池不与池重叠；② 容器类（池/泳道/展开子流程）只允许"装下"（落点容器
 * 链及其内部豁免）；③ 其余元素两两互斥——含同类型（任务叠任务/事件压任务
 * 均拒绝）。分组=框选制品、标签/连线/边界事件（挂靠宿主边线）不参与重叠
 * 判定。程序化 modeling 直调不经命令栈规则，不受此约束（弹框放置自带避让）。
 */
import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { BpmnMode } from '../mode/BpmnMode';
import type { OrientationService } from '../meta/Orientation';
import { ATTACH_EDGE_TOLERANCE, distanceToBorder } from '../util/AttachMath';
import {
  SIZES,
  isActivityFamily,
  isArtifactFamily,
  isContainerType,
  isDataFamily,
  isFlowNodeType,
  isPoolFamily,
  isSubProcessFamily
} from '../meta/ElementTypes';
import { EventDefinitions } from '../meta/EventDefinitions';
import { poolInnerRect } from '../util/PoolGeometry';

/** 平面矩形（重叠/包含判定的统一入参） */
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 连线端点池作用域：一次判定内单次计算、推断链与校验器全链共享 */
interface PoolScope {
  sourcePool: any;
  targetPool: any;
}

export class BpmnRules extends RuleProvider {
  static $inject = ['eventBus', 'canvas', 'bpmnMode', 'orientationService'];

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly bpmnMode: BpmnMode,
    private readonly orientationService: OrientationService
  ) {
    super(eventBus);
  }

  override init(): void {
    this.addRule('connection.create', (context: any) => this.canCreateConnection(context));
    this.addRule('connection.reconnect', (context: any) => this.canReconnect(context));
    this.addRule('connection.reconnectStart', (context: any) => this.canReconnect(context));
    this.addRule('connection.reconnectEnd', (context: any) => this.canReconnect(context));
    this.addRule('shape.create', (context: any) => this.canCreateShape(context));
    this.addRule('shape.attach', (context: any) => this.canAttach(context));
    this.addRule('shape.resize', (context: any) => this.canResize(context));
    this.addRule('elements.move', (context: any) => this.canMove(context));
    this.addRule('elements.delete', (context: any) => this.canDelete(context));
    // 对齐 / 分布：规则直接返回可参与元素数组（true 契约：AlignElements/DistributeElements
    // 的 trigger 会以规则结果替代自己的过滤集）
    this.addRule('elements.align', (context: any) => this.canAlignElements(context));
    this.addRule('elements.distribute', (context: any) => this.canDistributeElements(context));
    // 自动扩框白名单（元素逼近/越过容器边时容器生长，BpmnAutoResize 消费）
    this.addRule('element.autoResize', (context: any) => this.canAutoResize(context));
  }

  /** 自动扩框：与 canResize 同族的尺寸承载容器——池 / 展开子流程 / 分组（泳道不在此列，BpmnAutoResize 已将其重定向到池） */
  private canAutoResize(context: any): boolean {
    if (!this.bpmnMode.isEditable()) return false;
    const target = context.target;
    const type = target?.businessObject?.$type;
    if (!type) return false;
    if (type === 'bpmn:Participant' || type === 'bpmn:Group') return true;
    if (isSubProcessFamily(type)) {
      return target.isExpanded !== false;
    }
    return false;
  }

  // ---------- 对齐 / 分布 ----------

  /** 对齐：可移动的形状（排除连线 / 挂靠 / 标签），取选区内最顶层元素，至少 2 个 */
  private canAlignElements(context: any): any[] | false {
    if (!this.bpmnMode.isEditable()) return false;
    const candidates = (context.elements ?? []).filter(
      (element: any) => !(element.waypoints || element.host || element.labelTarget)
    );
    return selectTopLevel(candidates, 2);
  }

  /** 分布：对齐候选之上再排除连线 / 边界事件 / 泳道 / 注记（其几何区间无分布意义），至少 3 个 */
  private canDistributeElements(context: any): any[] | false {
    if (!this.bpmnMode.isEditable()) return false;
    const excluded = new Set([
      'bpmn:Association', 'bpmn:BoundaryEvent', 'bpmn:DataInputAssociation', 'bpmn:DataOutputAssociation',
      'bpmn:Lane', 'bpmn:MessageFlow', 'bpmn:SequenceFlow', 'bpmn:TextAnnotation'
    ]);
    const candidates = (context.elements ?? []).filter(
      (element: any) => !element.labelTarget && !excluded.has(element.businessObject?.$type ?? '')
    );
    return selectTopLevel(candidates, 3);
  }

  // ---------- 连线 ----------

  private canCreateConnection(context: any): boolean | Record<string, unknown> {
    if (!this.bpmnMode.isEditable()) return false;
    const { source, target } = context;
    if (!source || !target || source === target) {
      return false;
    }
    // 池归属（父链攀爬）单次计算贯穿推断链与校验器——此前一次判定重复算 3-6 遍
    const scope: PoolScope = { sourcePool: this.poolOf(source), targetPool: this.poolOf(target) };
    const type = context.type ?? this.inferConnectionType(source, target, scope);
    if (!type) {
      return false;
    }
    const verdict = this.validateConnection(type, source, target, scope);
    return verdict ? { type } : false;
  }

  private canReconnect(context: any): boolean {
    if (!this.bpmnMode.isEditable()) return false;
    const source = context.connection?.source ?? context.source;
    const target = context.target ?? context.connection?.target;
    const type = context.connection?.businessObject?.$type;
    if (!source || !target || source === target || !type) {
      return false;
    }
    return this.validateConnection(type, source, target, {
      sourcePool: this.poolOf(source),
      targetPool: this.poolOf(target)
    });
  }

  /**
   * 连线类型推断（职责链）：按优先级依次过策略，首个命中者定类型，全不中 =
   * 不可连。新增连线语义 = 插入一个策略函数，既有策略不动（开闭）。
   */
  private readonly connectionInferenceChain: Array<(source: any, target: any, scope: PoolScope) => string | null> = [
    (source, target, scope) => this.inferMessageFlow(source, target, scope),
    (source, target) => this.inferDataAssociation(source, target),
    (source, target) => this.inferAssociation(source, target),
    (source, target, scope) => this.inferSequenceFlow(source, target, scope)
  ];

  private inferConnectionType(source: any, target: any, scope: PoolScope): string | null {
    if (!source.businessObject?.$type || !target.businessObject?.$type) {
      return null;
    }
    for (const infer of this.connectionInferenceChain) {
      const type = infer(source, target, scope);
      if (type) {
        return type;
      }
    }
    return null;
  }

  /** 消息流：跨参与者（池↔池；池↔对端池内节点；规范 §8.4.3 Collaboration） */
  private inferMessageFlow(source: any, target: any, scope: PoolScope): string | null {
    const st = source.businessObject?.$type;
    const tt = target.businessObject?.$type;
    const crossPool =
      st === 'bpmn:Participant' || tt === 'bpmn:Participant'
        ? st !== tt || scope.sourcePool !== scope.targetPool
        : scope.sourcePool !== scope.targetPool;
    return crossPool && (st === 'bpmn:Participant' || tt === 'bpmn:Participant' || (this.isPoolLevelNode(source) && this.isPoolLevelNode(target)))
      ? 'bpmn:MessageFlow'
      : null;
  }

  /** 数据关联：数据对象 ↔ 活动 */
  private inferDataAssociation(source: any, target: any): string | null {
    const st = source.businessObject?.$type;
    const tt = target.businessObject?.$type;
    return isDataFamily(st) || isDataFamily(tt) ? 'bpmn:DataAssociation' : null;
  }

  /** 关联：制品（分组/注记）↔ 任意 */
  private inferAssociation(source: any, target: any): string | null {
    const st = source.businessObject?.$type;
    const tt = target.businessObject?.$type;
    return isArtifactFamily(st) || isArtifactFamily(tt) ? 'bpmn:Association' : null;
  }

  /** 顺序流：同作用域流节点 */
  private inferSequenceFlow(source: any, target: any, scope: PoolScope): string | null {
    return this.isFlowNode(source) && this.isFlowNode(target) && scope.sourcePool === scope.targetPool
      ? 'bpmn:SequenceFlow'
      : null;
  }

  /**
   * 连线校验（策略表）：每类连线一个独立校验器；未登记类型放行（插件可加规则）。
   * 各校验器职责单一，端点类型缺失的公共判定统一在前置守卫完成。
   */
  private readonly connectionValidators: Record<string, (source: any, target: any, scope: PoolScope) => boolean> = {
    'bpmn:SequenceFlow': (source, target, scope) => this.validateSequenceFlow(source, target, scope),
    'bpmn:MessageFlow': (source, target, scope) => this.validateMessageFlow(source, target, scope),
    'bpmn:Association': (source, target) =>
      isArtifactFamily(source.businessObject?.$type) || isArtifactFamily(target.businessObject?.$type),
    'bpmn:DataAssociation': (source, target) => {
      const st = source.businessObject?.$type;
      const tt = target.businessObject?.$type;
      return (isDataFamily(st) || isDataFamily(tt)) && (isActivityFamily(st) || isActivityFamily(tt));
    }
  };

  private validateConnection(type: string, source: any, target: any, scope: PoolScope): boolean {
    if (!source.businessObject?.$type || !target.businessObject?.$type) {
      return false;
    }
    const validate = this.connectionValidators[type];
    return validate ? validate(source, target, scope) : true;
  }

  /** 顺序流：两侧流节点；结束事件无出边、开始事件无入边、边界事件不作目标；同作用域 */
  private validateSequenceFlow(source: any, target: any, scope: PoolScope): boolean {
    const st = source.businessObject?.$type;
    const tt = target.businessObject?.$type;
    if (!this.isFlowNode(source) || !this.isFlowNode(target)) {
      return false;
    }
    if (st === 'bpmn:EndEvent') return false;
    if (tt === 'bpmn:StartEvent') return false;
    // 链接捕获不作顺序流目标（规范 §10.3.3：其"入线"是匹配链接名的跳转接续，
    // 不经顺序流进入；出线合法——从它流出继续流程）
    if (tt === 'bpmn:IntermediateCatchEvent' && EventDefinitions.symbolOf(target.businessObject) === 'link') {
      return false;
    }
    if (st === 'bpmn:BoundaryEvent' && this.isBoundaryHost(target, source)) return false;
    if (tt === 'bpmn:BoundaryEvent') return false; // 其中断语义由 attach 通道承载，不作顺序流目标
    return scope.sourcePool === scope.targetPool;
  }

  /** 消息流：端点至少一端为池，或双端均为池级节点；且必须跨参与者 */
  private validateMessageFlow(source: any, target: any, scope: PoolScope): boolean {
    const st = source.businessObject?.$type;
    const tt = target.businessObject?.$type;
    const endpointsValid =
      st === 'bpmn:Participant' || tt === 'bpmn:Participant' ||
      (this.isPoolLevelNode(source) && this.isPoolLevelNode(target));
    return endpointsValid && scope.sourcePool !== scope.targetPool;
  }

  // ---------- 形状 ----------

  private canCreateShape(context: any): boolean {
    if (!this.bpmnMode.isEditable()) return false;
    const shape = context.shape;
    const target = context.target;
    if (!shape || !target) {
      return false;
    }
    const type = shape.businessObject?.$type ?? shape.type;
    if (!type) {
      return false;
    }
    if (!type.startsWith('bpmn:')) {
      return true; // 非 bpmn 元素（插件自定义）放行
    }

    const isRoot = this.isRootElement(target);

    if (type === 'bpmn:Participant') {
      // 池只能建在顶层平面根（Process/Collaboration）——子流程下钻平面内禁建
      // （协作是根级元素，规范 §8.4）；预估边界不与既有池重叠（拖池收养裸元素
      // 不受影响——裸元素不是池）
      const rect = this.createRect(context.position, shape);
      return isRoot && !isSubProcessFamily(target.businessObject?.$type) && (!rect || !this.participantClash(rect));
    }
    if (type === 'bpmn:Lane') {
      return isPoolFamily(target.businessObject?.$type);
    }
    // 边界事件必须依附宿主活动（规范 §10.6.1 attachedToRef 必填）：
    // 普通 create 不放行，唯一创建入口=拖中间事件到活动上（shape.attach）
    if (type === 'bpmn:BoundaryEvent') {
      return false;
    }

    if (isRoot) {
      // 协作存在时根上只放池；否则普通节点直接进流程平面
      const base = !this.rootHasPools();
      const rect = this.createRect(context.position, shape);
      return base && (!rect || context.source || type === 'bpmn:Group' || !this.placementConflicts(rect, [shape], target));
    }

    const containerOk = isContainerType(target.businessObject?.$type, target.isExpanded);
    // 追加（autoPlace 自带避让）/无落点程序化建形不校验；分组=框选制品不受重叠限制（既有语义）
    const rect = this.createRect(context.position, shape);
    if (!rect || context.source || type === 'bpmn:Group') {
      return containerOk;
    }
    return containerOk && this.fullyInsideContainer(rect, target) && !this.placementConflicts(rect, [shape], target);
  }

  private canAttach(context: any): boolean {
    if (!this.bpmnMode.isEditable()) return false;
    const { shape, target, position } = context;
    const type = shape?.businessObject?.$type;
    // 面板/弹框拖出的中间事件（无 parent=创建中）悬停活动上 → 以边界事件
    // 落下（规范 §10.6：边界事件必挂活动；空定义为建模占位，落下后经替换
    // 菜单定形）。真实中间事件平移不走 attach 通道，不受影响。
    const isDroppingIntermediate =
      !shape?.parent && (type === 'bpmn:IntermediateThrowEvent' || type === 'bpmn:IntermediateCatchEvent');
    if (type !== 'bpmn:BoundaryEvent' && !isDroppingIntermediate) {
      return false;
    }
    const targetBo = target?.businessObject;
    const tt = targetBo?.$type;
    // 宿主限定（规范 Table 10.91 attachedTo: Activity）：仅活动族；
    // 事件子流程不可挂边界事件（规范 §13.5.4 "they cannot have attached boundary Events"）
    if (!tt || !isActivityFamily(tt) || targetBo.triggeredByEvent === true) {
      return false;
    }
    // 边线放置（规范 §10.6 "attached to the boundary of an Activity"）：
    // 落点须贴近宿主边框——内部深处/脱离边线均拒绝；容差=边界事件半径
    // （圆恰好接触边线，见 util/AttachMath）。无落点语境（程序化附加）仅做宿主判定
    if (!position) {
      return true;
    }
    return distanceToBorder(target, position) <= ATTACH_EDGE_TOLERANCE;
  }

  /**
   * 缩放白名单：仅展开子流程、池/泳道、分组（尺寸承载内容的元素）。
   * 事件/网关/任务族/折叠子流程/数据/注记为定尺寸元素，不开放缩放。
   */
  /**
   * 缩放白名单（有序策略表）：依次找第一个 applies 的策略取其 allow 裁决；
   * 无命中 = 定尺寸元素不可缩放。策略注释随策略就近维护，互不纠缠。
   */
  private readonly resizePolicies: Array<{
    applies: (type: string) => boolean;
    allow: (context: any, shape: any) => boolean;
  }> = [
    {
      // 注记仅横向可调：宽度决定换行、高度随文字行数自适应（渲染后按
      // 文字实测高度回写，见 TextAnnotationBehavior）。UI 拖拽方向非纯
      // 横向（w/e）即拒；无 direction 的程序化 resizeShape 放行（高度
      // 自适应回写走的正是该通道）
      applies: (t) => t === 'bpmn:TextAnnotation',
      allow: (ctx) => !ctx.direction || ctx.direction === 'w' || ctx.direction === 'e'
    },
    {
      // 子流程族仅展开态可缩放（折叠态 = 任务盒定尺寸）
      applies: (t) => isSubProcessFamily(t),
      allow: (_ctx, shape) => shape.isExpanded !== false
    },
    {
      // 泳道带只沿堆叠轴调边界（水平池 n/s、垂直池 w/e）——带在跨轴方向
      // 永远铺满池内容区，跨轴尺寸归池所有（改池即重铺全部带）；无 direction
      // 的程序化 resizeShape 放行（带边界语义由 LaneBandBehavior 收敛）
      applies: (t) => t === 'bpmn:Lane',
      allow: (ctx) => {
        if (!ctx.direction) {
          return true;
        }
        const stackDirs = this.orientationService.isHorizontal() ? 'ns' : 'we';
        return [...ctx.direction].every((d: string) => stackDirs.includes(d));
      }
    },
    {
      // 池与分组：全向缩放（尺寸承载内容/范围语义）
      applies: (t) => t === 'bpmn:Participant' || t === 'bpmn:Group',
      allow: () => true
    }
  ];

  private canResize(context: any): boolean {
    if (!this.bpmnMode.isEditable()) return false;
    const shape = context.shape;
    const type = shape?.businessObject?.$type;
    if (!type) {
      return true;
    }
    const policy = this.resizePolicies.find((p) => p.applies(type));
    const allowed = policy ? policy.allow(context, shape) : false;
    if (!allowed) return allowed;
    // 重叠校验只对 UI 拖拽路径生效（ResizeManager 恒带 newBounds）
    const newBounds = context.newBounds as Rect | undefined;
    if (!newBounds) {
      return allowed;
    }
    if (type === 'bpmn:Participant') {
      return !this.participantClash(newBounds, shape);
    }
    // 泳道带不重叠的不变量由 LaneBandBehavior 钳制闭环（跨轴铺满、堆叠轴邻接）
    if (type === 'bpmn:Lane') {
      return true;
    }
    if (!this.isRootElement(shape.parent) && !this.fullyInsideContainer(newBounds, shape.parent)) {
      return false;
    }
    return !this.placementConflicts(newBounds, [shape], shape.parent);
  }

  private canMove(context: any): boolean | Record<string, unknown> {
    if (!this.bpmnMode.isEditable()) return false;
    const shapes: any[] = context.shapes;
    if (!shapes || shapes.length === 0) {
      return true;
    }

    // 标签元素：只允许原地平移，不允许换容器（父级恒随宿主）
    if (shapes.some((s) => s.labelTarget)) {
      return !context.target || shapes.every((s) => !s.labelTarget || context.target === s.parent);
    }

    // 泳道不可整体拖动（结构操作走 lane 命令）
    if (shapes.some((s) => s.businessObject?.$type === 'bpmn:Lane')) {
      return false;
    }

    const target = context.target;
    const root = this.canvas.getRootElement();
    // 根上是否有池整批一次算好共享（原逐 shape 各扫一遍根 children）
    const rootPools = this.rootHasPools();
    const containmentOk = !target
      || shapes.every((shape) => this.canMoveShape(shape, target, root, rootPools, shapes, context.position));
    // 激活探测（Move.js shape.move.start 不带 delta）只问"可否启动拖拽"，不裁
    // 当前位：morph 中心锚定增大可使元素陷入既成重叠（如追加任务→展开临时子
    // 流程吃掉追加净空），卡在非法位的元素必须仍能拖出险境；真实拖拽与落点
    // 恒带 delta 全量校验，非法落点照旧被拒
    if (context.delta === undefined) {
      return containmentOk;
    }
    // 重叠校验对原地平移（target 为空）同样生效——同容器内元素互叠就是这条路径
    return containmentOk && !this.moveOverlaps(shapes, context.delta, target);
  }

  /** 单形状移动策略：池（仅根/原父）→ 边界事件（宿主规则）→ 其余（canContain） */
  private canMoveShape(shape: any, target: any, root: any, rootPools: boolean, shapes: any[], position: any): boolean {
    const type = shape.businessObject?.$type;
    if (type === 'bpmn:Participant') {
      return target === root || target === shape.parent;
    }
    if (type === 'bpmn:BoundaryEvent') {
      return this.canMoveBoundaryEvent(shape, target, shapes, position);
    }
    return this.canContain(shape, target, rootPools);
  }

  /**
   * 边界事件移动：性质固定——不允许"落进容器/空白"的移动（脱离宿主即孤儿，
   * 不退化为中间事件）；随宿主同动放行，重挂活动（AttachSupport→
   * shape.attach）与沿宿主边线滑动除外——落点须在目标活动边线容差内
   * （同创建语义），非边线落点整体拒绝（弹回），堵 updateAttachment(undefined) 脱离
   */
  private canMoveBoundaryEvent(shape: any, target: any, shapes: any[], position: any): boolean {
    if (shapes.includes(shape.host)) {
      return true;
    }
    if (!isActivityFamily(target.businessObject?.$type)) {
      return false;
    }
    return !position || distanceToBorder(target, position) <= ATTACH_EDGE_TOLERANCE;
  }

  private canContain(shape: any, target: any, rootPools?: boolean): boolean {
    if (this.isRootElement(target)) {
      return !(rootPools ?? this.rootHasPools()) || shape.businessObject?.$type === 'bpmn:Participant';
    }
    return isContainerType(target.businessObject?.$type, target.isExpanded);
  }

  // ---------- 重叠与包含（产品规定：池不叠池；容器只容内含；其余元素两两互斥） ----------

  /** 创建落点的预估矩形（落点即新元素中心，尺寸取工厂缺省）；无落点返回 null */
  private createRect(position: any, shape: any): Rect | null {
    if (!position || shape.width == null || shape.height == null) {
      return null;
    }
    return { x: position.x - shape.width / 2, y: position.y - shape.height / 2, width: shape.width, height: shape.height };
  }

  /** 移动预估矩形：当前边界 + 拖拽增量（Move.js 规则上下文恒带 delta；缺省零增量） */
  private shiftedRect(shape: any, delta: any): Rect {
    return { x: shape.x + (delta?.x ?? 0), y: shape.y + (delta?.y ?? 0), width: shape.width, height: shape.height };
  }

  /** 严格相交（贴边不算——泳道带彼此共边、元素贴边摆放均合法） */
  private rectsIntersect(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private fullyInside(inner: Rect, outer: Rect): boolean {
    return inner.x >= outer.x && inner.y >= outer.y
      && inner.x + inner.width <= outer.x + outer.width
      && inner.y + inner.height <= outer.y + outer.height;
  }

  /** 装下判定对池取内容区（避头带）——元素压在池头横带上不算被装下 */
  private fullyInsideContainer(rect: Rect, container: any): boolean {
    const bounds = container.businessObject?.$type === 'bpmn:Participant'
      ? poolInnerRect(container, SIZES.POOL_HEADER, this.orientationService.isHorizontal())
      : container;
    return this.fullyInside(rect, bounds as Rect);
  }

  /** 池与池的重叠（规则①）：根平面上其他参与者 */
  private participantClash(rect: Rect, ignore?: any): boolean {
    return (this.canvas.getRootElement().children ?? []).some(
      (c: any) => c !== ignore && c.businessObject?.$type === 'bpmn:Participant' && this.rectsIntersect(rect, c)
    );
  }

  /**
   * 预估矩形与画布既有元素的重叠判定（规则②③）：豁免集=移动集及其后代
   * （容器带着内容整体走）+ 落点容器链（被容器装下是合法状态，含贴边）；
   * 分组（框选制品）、标签、连线、边界事件（贴宿主边线）不参与判定。
   * 与豁免集外任一元素相交即冲突——对非落点容器的部分搭界/整包覆盖都算
   * 重叠（整包覆盖落点容器必是 DropTarget 归一结果，不会走到这里）。
   */
  private placementConflicts(rect: Rect, moved: any[], target: any, movedShape?: any): boolean {
    const exempt = new Set<any>();
    const collect = (el: any): void => {
      exempt.add(el);
      for (const child of el.children ?? []) {
        collect(child);
      }
    };
    for (const shape of moved) {
      collect(shape);
    }
    for (let chain: any = target; chain; chain = chain.parent) {
      exempt.add(chain);
    }
    // 整装于自家父容器的移动成员：其父链不构成冲突（该成员留守原容器，归属
    // 由 SubProcessMembershipBehavior 拆分收敛；骑跨者不豁免——与父容器相交即拒）
    const own = movedShape?.parent;
    if (own && !this.isRootElement(own) && this.fullyInside(rect, own)) {
      for (let chain: any = own; chain; chain = chain.parent) {
        exempt.add(chain);
      }
    }
    let hit = false;
    const walk = (element: any): void => {
      if (hit) {
        return;
      }
      for (const child of element.children ?? []) {
        if (hit) {
          return;
        }
        if (child.waypoints || child.labelTarget) {
          continue;
        }
        const type = child.businessObject?.$type;
        if (type === 'bpmn:Group' || type === 'bpmn:BoundaryEvent') {
          continue;
        }
        if (!exempt.has(child) && this.rectsIntersect(rect, child)) {
          hit = true;
          return;
        }
        walk(child);
      }
    };
    walk(this.canvas.getRootElement());
    return hit;
  }

  /** 移动重叠校验：池只查池（规则①）；其余元素须被落点容器完整装下（规则②）且不与任何元素相交（规则③） */
  private moveOverlaps(shapes: any[], delta: any, target: any): boolean {
    const movable = shapes.filter((s: any) => s.businessObject?.$type !== 'bpmn:BoundaryEvent');
    for (const shape of movable) {
      const rect = this.shiftedRect(shape, delta);
      if (shape.businessObject?.$type === 'bpmn:Participant') {
        if (this.participantClash(rect, shape)) {
          return true;
        }
        continue;
      }
      // 原地平移（target 为空）以现父为预估父
      const effectiveTarget = target ?? shape.parent;
      if (!this.isRootElement(effectiveTarget) && !this.fullyInsideContainer(rect, effectiveTarget)) {
        // 自家父容器（展开子流程）内拖动跨界：整装/整出皆放行（2026-11-04
        // 用户定规——在外者脱离、在内者留守，归属拆分由 SubProcessMembershipBehavior
        // 收敛），骑跨边界仍是非法位照旧拒绝
        const ownExpandedSub = effectiveTarget === shape.parent
          && isSubProcessFamily(effectiveTarget.businessObject?.$type)
          && effectiveTarget.isExpanded !== false;
        if (!(ownExpandedSub && !this.rectsIntersect(rect, effectiveTarget))) {
          return true;
        }
      }
      if (this.placementConflicts(rect, movable, effectiveTarget, shape)) {
        return true;
      }
    }
    return false;
  }

  private canDelete(context: any): boolean {
    if (!this.bpmnMode.isEditable()) return false;
    const elements: any[] = context.elements ?? (context.element ? [context.element] : []);
    return elements.length > 0 && !elements.some((e) => this.isRootElement(e));
  }

  // ---------- 作用域工具 ----------

  /** 画布根上是否已有池（协作形态判定：根上只放池） */
  private rootHasPools(): boolean {
    return (this.canvas.getRootElement().children ?? []).some(
      (c: any) => c.businessObject?.$type === 'bpmn:Participant'
    );
  }

  /** 元素归属的参与者作用域（池或根） */
  private poolOf(element: any): any {
    if (element.businessObject?.$type === 'bpmn:Participant') {
      return element;
    }
    let parent = element.parent;
    while (parent) {
      if (parent.businessObject?.$type === 'bpmn:Participant') {
        return parent;
      }
      parent = parent.parent;
    }
    return this.canvas.getRootElement();
  }

  /** 池级节点：流程节点（非 lane、非子流程内节点——按画布父链判定） */
  private isPoolLevelNode(element: any): boolean {
    const type = element.businessObject?.$type;
    if (!type || type === 'bpmn:Lane') {
      return false;
    }
    let parent = element.parent;
    while (parent) {
      const pt = parent.businessObject?.$type;
      // 到根（根 bo=平面指向的语义根：协作或流程）即池级
      if (pt === 'bpmn:Participant' || pt === 'bpmn:Collaboration' || pt === 'bpmn:Process') {
        return true;
      }
      if (isSubProcessFamily(pt)) {
        return false;
      }
      parent = parent.parent;
    }
    return true;
  }

  private isFlowNode(element: any): boolean {
    return isFlowNodeType(element.businessObject?.$type);
  }

  private isBoundaryHost(candidate: any, boundarySource: any): boolean {
    return candidate === boundarySource?.host;
  }

  private isRootElement(element: any): boolean {
    return !element.parent && !!element.children;
  }
}

/**
 * 只保留祖先链不在选区内的最顶层元素（选中"池+池内元素"时对齐作用于池本身）；
 * 数量不足 minimum 直接判不可行。
 */
function selectTopLevel(elements: any[], minimum: number): any[] | false {
  const selected = new Set(elements);
  const topLevel = elements.filter((element) => {
    let parent = element.parent;
    while (parent) {
      if (selected.has(parent)) {
        return false;
      }
      parent = parent.parent;
    }
    return true;
  });
  return topLevel.length >= minimum ? topLevel : false;
}
