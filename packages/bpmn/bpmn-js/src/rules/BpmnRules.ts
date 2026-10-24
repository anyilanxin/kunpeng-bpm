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
 */
import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { BpmnMode } from '../mode/BpmnMode';
import type { OrientationService } from '../meta/Orientation';
import { ATTACH_EDGE_TOLERANCE, distanceToBorder } from '../util/AttachMath';
import {
  isActivityFamily,
  isArtifactFamily,
  isContainerType,
  isDataFamily,
  isFlowNodeType,
  isPoolFamily,
  isSubProcessFamily
} from '../meta/ElementTypes';

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
    const type = context.type ?? this.inferConnectionType(source, target);
    if (!type) {
      return false;
    }
    const verdict = this.validateConnection(type, source, target);
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
    return this.validateConnection(type, source, target);
  }

  /**
   * 连线类型推断（职责链）：按优先级依次过策略，首个命中者定类型，全不中 =
   * 不可连。新增连线语义 = 插入一个策略函数，既有策略不动（开闭）。
   */
  private readonly connectionInferenceChain: Array<(source: any, target: any) => string | null> = [
    (source, target) => this.inferMessageFlow(source, target),
    (source, target) => this.inferDataAssociation(source, target),
    (source, target) => this.inferAssociation(source, target),
    (source, target) => this.inferSequenceFlow(source, target)
  ];

  private inferConnectionType(source: any, target: any): string | null {
    if (!source.businessObject?.$type || !target.businessObject?.$type) {
      return null;
    }
    for (const infer of this.connectionInferenceChain) {
      const type = infer(source, target);
      if (type) {
        return type;
      }
    }
    return null;
  }

  /** 消息流：跨参与者（池↔池；池↔对端池内节点；规范 §8.4.3 Collaboration） */
  private inferMessageFlow(source: any, target: any): string | null {
    const st = source.businessObject?.$type;
    const tt = target.businessObject?.$type;
    const crossPool =
      st === 'bpmn:Participant' || tt === 'bpmn:Participant'
        ? st !== tt || this.poolOf(source) !== this.poolOf(target)
        : this.poolOf(source) !== this.poolOf(target);
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
  private inferSequenceFlow(source: any, target: any): string | null {
    return this.isFlowNode(source) && this.isFlowNode(target) && this.poolOf(source) === this.poolOf(target)
      ? 'bpmn:SequenceFlow'
      : null;
  }

  /**
   * 连线校验（策略表）：每类连线一个独立校验器；未登记类型放行（插件可加规则）。
   * 各校验器职责单一，端点类型缺失的公共判定统一在前置守卫完成。
   */
  private readonly connectionValidators: Record<string, (source: any, target: any) => boolean> = {
    'bpmn:SequenceFlow': (source, target) => this.validateSequenceFlow(source, target),
    'bpmn:MessageFlow': (source, target) => this.validateMessageFlow(source, target),
    'bpmn:Association': (source, target) =>
      isArtifactFamily(source.businessObject?.$type) || isArtifactFamily(target.businessObject?.$type),
    'bpmn:DataAssociation': (source, target) => {
      const st = source.businessObject?.$type;
      const tt = target.businessObject?.$type;
      return (isDataFamily(st) || isDataFamily(tt)) && (isActivityFamily(st) || isActivityFamily(tt));
    }
  };

  private validateConnection(type: string, source: any, target: any): boolean {
    if (!source.businessObject?.$type || !target.businessObject?.$type) {
      return false;
    }
    const validate = this.connectionValidators[type];
    return validate ? validate(source, target) : true;
  }

  /** 顺序流：两侧流节点；结束事件无出边、开始事件无入边、边界事件不作目标；同作用域 */
  private validateSequenceFlow(source: any, target: any): boolean {
    const st = source.businessObject?.$type;
    const tt = target.businessObject?.$type;
    if (!this.isFlowNode(source) || !this.isFlowNode(target)) {
      return false;
    }
    if (st === 'bpmn:EndEvent') return false;
    if (tt === 'bpmn:StartEvent') return false;
    if (st === 'bpmn:BoundaryEvent' && this.isBoundaryHost(target, source)) return false;
    if (tt === 'bpmn:BoundaryEvent') return false; // 其中断语义由 attach 通道承载，不作顺序流目标
    return this.poolOf(source) === this.poolOf(target);
  }

  /** 消息流：端点至少一端为池，或双端均为池级节点；且必须跨参与者 */
  private validateMessageFlow(source: any, target: any): boolean {
    const st = source.businessObject?.$type;
    const tt = target.businessObject?.$type;
    const endpointsValid =
      st === 'bpmn:Participant' || tt === 'bpmn:Participant' ||
      (this.isPoolLevelNode(source) && this.isPoolLevelNode(target));
    return endpointsValid && this.poolOf(source) !== this.poolOf(target);
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
      // 池只能建在根上
      return isRoot;
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
      return !this.rootHasPools() && !this.dropPositionOccupied(context, target);
    }

    const containerOk = isContainerType(target.businessObject?.$type, target.isExpanded);
    return containerOk && !this.dropPositionOccupied(context, target);
  }

  /**
   * 创建落点占用检查：落点落在目标容器既有子元素内部 → 拒绝。元素不可
   * "叠放进"另一个普通元素——DropTargetBehavior 把悬停命中归一到承载容器
   * 后，规则必须自己校验落点，否则开始事件会直接建在任务图形内部（落点
   * 即新元素中心，视觉上=元素进了元素）。分组是框架性制品（框选语义），
   * 既不挡落点也不受此限；无落点（程序化建形）与带源追加（autoPlace 自
   * 带避让）不校验。
   */
  private dropPositionOccupied(context: any, target: any): boolean {
    const position = context.position;
    if (!position || context.source || context.shape?.businessObject?.$type === 'bpmn:Group') {
      return false;
    }
    return (target.children ?? []).some((child: any) => {
      if (child.waypoints || child.labelTarget || child.businessObject?.$type === 'bpmn:Group') {
        return false;
      }
      return position.x > child.x && position.x < child.x + child.width
        && position.y > child.y && position.y < child.y + child.height;
    });
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
    return policy ? policy.allow(context, shape) : false;
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
    if (!target) {
      return true; // 原地平移
    }

    const root = this.canvas.getRootElement();
    return shapes.every((shape) => this.canMoveShape(shape, target, root, shapes, context.position));
  }

  /** 单形状移动策略：池（仅根/原父）→ 边界事件（宿主规则）→ 其余（canContain） */
  private canMoveShape(shape: any, target: any, root: any, shapes: any[], position: any): boolean {
    const type = shape.businessObject?.$type;
    if (type === 'bpmn:Participant') {
      return target === root || target === shape.parent;
    }
    if (type === 'bpmn:BoundaryEvent') {
      return this.canMoveBoundaryEvent(shape, target, shapes, position);
    }
    return this.canContain(shape, target);
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

  private canContain(shape: any, target: any): boolean {
    if (this.isRootElement(target)) {
      return !this.rootHasPools() || shape.businessObject?.$type === 'bpmn:Participant';
    }
    return isContainerType(target.businessObject?.$type, target.isExpanded);
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
