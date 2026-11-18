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
 * 泳道命令：插道（序列前/后，朝向感知）/ 分割（divide 2|3）/ 删道（兄弟回收）。
 *
 * 轴语义（util/PoolGeometry）：水平池泳道=行带沿 y 堆叠、垂直池泳道=列带沿 x
 * 堆叠；'top'/'left' 归一为序列前端、'bottom'/'right' 为后端（旧线 API
 * 契约延续，两种朝向下同名同义）。
 *
 * 简化语义（登记于开发计划）：插入/分割不自动平移既有内容——带在内容下方滑动，
 * 元素归属（flowNodeRef）由 BpmnUpdater 按几何重算。
 */
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type { BpmnElementFactory } from '../factory/BpmnElementFactory';
import type { BpmnFactory } from '../factory/BpmnFactory';
import type { OrientationService } from '../meta/Orientation';
import { SIZES } from '../meta/ElementTypes';
import {
  LANE_EPS,
  growPoolAlong,
  growPoolFront,
  laneStackAxis,
  laneBandRect,
  normalizeLanePosition,
  poolInnerRect,
  shiftAlongAxis,
  sortedBySpan,
  spanLength,
  spanStart,
  withSpan,
  type RectLike
} from '../util/PoolGeometry';
import { applyRect } from '@kunpeng-io/kernel-shared';

function rectOf(el: any): RectLike {
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

function sortedLanes(participant: any, axis: 'x' | 'y'): any[] {
  return sortedBySpan(
    (participant.children ?? []).filter((c: any) => c.businessObject?.$type === 'bpmn:Lane'),
    axis
  );
}

function findParticipant(element: any): any | null {
  let current = element;
  while (current) {
    if (current.businessObject?.$type === 'bpmn:Participant') {
      return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * 插道前置校验（供 BpmnModeling 在进入命令栈前调用）：diagram-js 的
 * CommandStack 先 _pushAction 再调 handler.execute，execute 内抛错会留下
 * 永不弹出的 action 帧，此后所有命令的 elements.changed（重绘/DI 同步）
 * 全部失效——校验必须在 stack.execute 之前完成并抛出。
 */
export function assertAddLaneAllowed(
  container: any,
  position: 'top' | 'bottom' | 'left' | 'right' | 'divide',
  count: number | undefined,
  horizontal: boolean
): void {
  if (!findParticipant(container)) {
    throw new Error('只能在池内添加泳道');
  }
  if (normalizeLanePosition(position) === 'divide') {
    const isPoolWithoutLanes = container.businessObject?.$type === 'bpmn:Participant'
      && !(container.children ?? []).some((c: any) => c.businessObject?.$type === 'bpmn:Lane');
    if (!isPoolWithoutLanes) {
      throw new Error('分割只作用于初始（无泳道）的池');
    }
    const parts = count ?? 2;
    if (parts !== 2 && parts !== 3) {
      throw new Error(`分割只支持 2 或 3 段，收到：${parts}`);
    }
    // 跨度不校验：均分段厚不足最小带厚时 divide 侧生长目标带（见其注释）
  }
}

/** 删道前置校验（理由同 assertAddLaneAllowed） */
export function assertRemoveLaneAllowed(lane: any): void {
  if (!findParticipant(lane)) {
    throw new Error('泳道必须归属一个池');
  }
}

export class AddLaneHandler implements CommandHandler {
  static $inject = ['canvas', 'elementFactory', 'bpmnFactory', 'eventBus', 'orientationService'];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementFactory: BpmnElementFactory,
    private readonly bpmnFactory: BpmnFactory,
    private readonly eventBus: EventBus,
    private readonly orientationService: OrientationService
  ) {}

  execute(context: any): any[] {
    // 前置条件由 BpmnModeling 经 assertAddLaneAllowed 在命令栈外校验
    const direction = normalizeLanePosition(context.position);
    const target = context.container;
    const participant = findParticipant(target);
    context.participant = participant;
    const horizontal = this.orientationService.isHorizontal();
    const axis = laneStackAxis(horizontal);

    if (direction === 'divide') {
      return this.divide(context, target, participant, axis, horizontal);
    }
    return this.insert(context, target, participant, axis, horizontal, direction);
  }

  /** 插道：序列前端/后端插入条带；首道铺满内容区（池不增长） */
  private insert(
    context: any,
    target: any,
    participant: any,
    axis: 'x' | 'y',
    horizontal: boolean,
    direction: 'before' | 'after'
  ): any[] {
    const thickness = SIZES.LANE_H;
    const inner = poolInnerRect(participant, SIZES.POOL_HEADER, horizontal);
    const siblings = sortedLanes(participant, axis);

    // 幂等合并（分割=组合插入复用本方法）：oldPool 只在首次快照（多次
    // 生长回退一步还原原池），shifted 保留首快照（重复让位还原到位）
    context.oldPool ??= rectOf(participant);
    context.shifted ??= [];
    context.carved ??= null;
    context.created ??= [];

    // (1) 无道池插道（2026-11-18 用户定规"首击即见带"）：先建铺满内容区的
    // 首道（池进入泳道形态），随即落入下方"全池首道"让位分支完成插入——
    // 一次点击即得两条可见泳道，不再是首击无视觉变化的纯形态切换
    if (siblings.length === 0) {
      const first = this.createLane(context, participant, inner);
      context.created.push(first);
      siblings.push(first);
    }

    // 插入坐标：目标为泳道→紧贴其前/后缘；目标为池→内容区首端 / 最远带尾
    const targetIsLane = target.businessObject?.$type === 'bpmn:Lane';
    const insertAt = targetIsLane
      ? direction === 'before'
        ? spanStart(target, axis)
        : spanStart(target, axis) + spanLength(target, axis)
      : direction === 'before'
        ? spanStart(inner, axis)
        : siblings.reduce(
            (end: number, lane: any) => Math.max(end, spanStart(lane, axis) + spanLength(lane, axis)),
            spanStart(inner, axis)
          );

    // (2) 全池首道（唯一且跨满内容区）：池沿堆叠轴增长，既有带整体平移让
    // 出首/尾段给新带——带形不缩（保持内容容量），新带占用池生长出来的空
    // 间，条带始终铺满内容区（若改为"收缩既有带+池不增长"，带会被压破
    // 最小厚度；"收缩+增长"则会留出带覆盖不到的尾部缺口）
    if (siblings.length === 1 && spanLength(siblings[0], axis) >= spanLength(inner, axis) - LANE_EPS) {
      const full = siblings[0];
      const fullStart = spanStart(full, axis);
      const fullLen = spanLength(full, axis);
      if (direction === 'before') {
        // 前缘生长（2026-11-18 修"上插视觉恒向下追加"）：既有带与内容绝对位
        // 全不动，池沿前缘长出，新带占长出的空间——新带恒在内容上方
        context.carved = null;
        growPoolFront(participant, axis, thickness);
        context.created.push(this.createLane(context, participant, laneBandRect(inner, fullStart - thickness, thickness, horizontal)));
      } else {
        context.carved = { lane: full, rect: rectOf(full) };
        context.created.push(this.createLane(context, participant, laneBandRect(inner, fullStart + fullLen, thickness, horizontal)));
        growPoolAlong(participant, axis, thickness);
      }
      return [participant, full, ...context.created];
    }

    // (3) 前端前插（目标=池的 before，或首道前缘 before）：池前缘生长、
    // 既有带与内容全不动，新带占长出的空间（同全池首道前插语义）
    if (direction === 'before' && insertAt <= spanStart(inner, axis) + LANE_EPS) {
      growPoolFront(participant, axis, thickness);
      context.created.push(this.createLane(context, participant, laneBandRect(inner, spanStart(inner, axis) - thickness, thickness, horizontal)));
      return [participant, ...context.created];
    }

    // (3) 常规插入：插入点及之后的既有带平移让位，池沿堆叠轴增长
    for (const lane of siblings) {
      if (spanStart(lane, axis) >= insertAt - LANE_EPS) {
        if (!context.shifted.some((e: any) => e.lane === lane)) {
          context.shifted.push({ lane, rect: rectOf(lane) });
        }
        applyRect(lane, shiftAlongAxis(lane, axis, thickness));
      }
    }
    context.created.push(this.createLane(context, participant, laneBandRect(inner, insertAt, thickness, horizontal)));
    growPoolAlong(participant, axis, thickness);
    return [participant, ...context.created, ...context.shifted.map((s: any) => s.lane)];
  }

  /**
   * 分割=组合插入（2026-11-18 用户定规新语义，取代均分）：分割 2 段=当前
   * 泳道上方插一条；分割 3 段=上插一条+下插一条（当前泳道居中）；无道池=
   * 先建铺满首道作"当前泳道"再同法组合。纵向布局（垂直池）由 axis 语义
   * 天然覆盖（上/下=列带左/右）。单命令单步撤销：复用 insert 的幂等合并
   * context（oldPool 首照、shifted 首快照去重、created 累积）。
   */
  private divide(context: any, target: any, participant: any, axis: 'x' | 'y', horizontal: boolean): any[] {
    // parts 合法性由 assertAddLaneAllowed 保证（2|3；对象=泳道或无道池）
    const parts = context.count ?? 2;
    context.oldPool ??= rectOf(participant);
    context.created ??= [];
    context.shifted ??= [];
    context.carved ??= null;
    context.target = null;
    context.oldTarget = null;

    let anchor = target;
    if (target === participant) {
      const inner = poolInnerRect(participant, SIZES.POOL_HEADER, horizontal);
      anchor = this.createLane(context, participant, inner);
      context.created.push(anchor);
    }
    const changed: any[] = [participant];
    const merge = (els: any[]): void => {
      for (const el of els) {
        if (!changed.includes(el)) {
          changed.push(el);
        }
      }
    };
    merge(this.insert(context, anchor, participant, axis, horizontal, 'before'));
    if (parts === 3) {
      merge(this.insert(context, anchor, participant, axis, horizontal, 'after'));
    }
    return changed;
  }

  private createLane(context: any, participant: any, rect: RectLike): any {
    // 泳道不预置默认名：名称由用户直编或属性面板给出（与任务/事件一致）
    const laneBo = this.bpmnFactory.createLane({});
    const lane = this.elementFactory.createShape({
      id: laneBo.id,
      businessObject: laneBo,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    });
    this.canvas.addShape(lane, participant);
    this.eventBus.fire('bpmn.lane.added', { lane });
    context.lane = context.lane ?? lane;
    return lane;
  }

  revert(context: any): any[] {
    const changed: any[] = [];
    for (const lane of context.created ?? []) {
      this.canvas.removeShape(lane);
      this.eventBus.fire('bpmn.lane.removed', { lane });
      this.bpmnFactory.destroy(lane.businessObject);
    }
    for (const entry of context.shifted ?? []) {
      applyRect(entry.lane, entry.rect);
      changed.push(entry.lane);
    }
    if (context.carved) {
      applyRect(context.carved.lane, context.carved.rect);
      changed.push(context.carved.lane);
    }
    if (context.oldPool && context.participant) {
      applyRect(context.participant, context.oldPool);
      changed.push(context.participant);
    }
    if (context.oldTarget && context.target) {
      applyRect(context.target, context.oldTarget);
      changed.push(context.target);
    }
    return changed;
  }
}

export class RemoveLaneHandler implements CommandHandler {
  static $inject = ['canvas', 'eventBus', 'orientationService'];

  constructor(
    private readonly canvas: Canvas,
    private readonly eventBus: EventBus,
    private readonly orientationService: OrientationService
  ) {}

  execute(context: any): any[] {
    // 归属池由 BpmnModeling 经 assertRemoveLaneAllowed 在命令栈外校验
    const lane = context.lane;
    const participant = findParticipant(lane);
    context.participant = participant;
    context.bounds = rectOf(lane);
    context.oldParent = lane.parent;

    const axis = laneStackAxis(this.orientationService.isHorizontal());
    const inner = poolInnerRect(participant, SIZES.POOL_HEADER, this.orientationService.isHorizontal());
    const siblings = sortedLanes(participant, axis).filter((s: any) => s !== lane);
    const start = spanStart(lane, axis);
    const end = start + spanLength(lane, axis);

    // 兄弟回收：优先下邻道吃满，其次上邻；无邻可吃时池沿堆叠轴收缩
    // （唯一且跨满内容区的"全池首道"删除=池退回无道形态，池形不变）
    const below = siblings
      .filter((s: any) => spanStart(s, axis) >= end - LANE_EPS)
      .sort((a: any, b: any) => spanStart(a, axis) - spanStart(b, axis))[0];
    const above = siblings
      .filter((s: any) => spanStart(s, axis) + spanLength(s, axis) <= start + LANE_EPS)
      .sort((a: any, b: any) => spanStart(b, axis) - spanStart(a, axis))[0];

    context.grown = null;
    context.grownRect = null;
    context.shrinkPool = 0;
    if (below) {
      context.grown = below;
      context.grownRect = rectOf(below);
      applyRect(below, withSpan(below, axis, start, spanLength(below, axis) + spanLength(lane, axis)));
    } else if (above) {
      context.grown = above;
      context.grownRect = rectOf(above);
      applyRect(above, withSpan(above, axis, spanStart(above, axis), spanLength(above, axis) + spanLength(lane, axis)));
    } else {
      const spansFull = spanLength(lane, axis) >= spanLength(inner, axis) - LANE_EPS;
      if (siblings.length > 0 || !spansFull) {
        context.shrinkPool = spanLength(lane, axis);
        growPoolAlong(participant, axis, -context.shrinkPool);
      }
    }

    this.canvas.removeShape(lane);
    this.eventBus.fire('bpmn.lane.removed', { lane });
    return [participant, ...(context.grown ? [context.grown] : [])];
  }

  revert(context: any): any[] {
    const { lane, participant, grown, grownRect, shrinkPool, oldParent } = context;
    if (grown && grownRect) {
      applyRect(grown, grownRect);
    }
    if (shrinkPool) {
      growPoolAlong(participant, laneStackAxis(this.orientationService.isHorizontal()), shrinkPool);
    }
    this.canvas.addShape(lane, oldParent ?? participant);
    // 语义/DI 挂接与 execute 对称（BpmnUpdater 经此事件维护常驻树）
    this.eventBus.fire('bpmn.lane.added', { lane });
    return [participant, lane, ...(grown ? [grown] : [])];
  }
}
