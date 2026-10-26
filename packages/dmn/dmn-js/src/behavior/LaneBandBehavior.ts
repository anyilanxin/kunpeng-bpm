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
 * 泳道带几何行为：带不可重叠的完整不变量在此闭环。
 *
 * 泳道带是池内容区的行政划分（跨轴永远铺满内容区、沿堆叠轴首尾相接），
 * 因此带的 resize 语义=移动带界，不是独立图形的自由缩放：
 * - 前后缘压向邻带 → 邻带等量让位（各保底最小厚度）；
 * - 边缘带的外侧缘 → 池沿随之伸缩；
 * - 拖拽中经 resize.start 收紧约束（活体钳制，不靠提交后回弹）；
 * - 程序化 resize 在 preExecute 做同一钳制（权威收敛，redo 不重放 preExecute，
 *   上下文里已持有钳制后的 newBounds）。
 *
 * 池被直接 resize（用户手柄/空间工具）后按 refitLaneBands 重铺全部带；自动
 * 扩框路径（BpmnAutoResize，hints.autoResize=方向数组）已自带重铺，经提示位
 * 区分避免双重应用。跟随/重铺全部走 modeling.resizeShape 嵌套命令（同一
 * action 帧，undo 单步对称还原；laneBandFollow 提示位阻断递归再入）。
 *
 * 空间工具的移动走 moveShape 直调（不经 canMove），带不可平移的不变量在
 * spaceTool 命令入口兜住：从移动集中剔除泳道。带的重组只有 lane 命令。
 */
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Modeling from 'diagram-js/lib/features/modeling/Modeling';
import { SIZES } from '../meta/ElementTypes';
import type { OrientationService } from '../meta/Orientation';
import { is } from '../util/ModelUtil';
import {
  LANE_EPS,
  MIN_LANE_BAND,
  MIN_LANE_SPAN,
  laneStackAxis,
  poolInnerRect,
  rectsEqual,
  refitLaneBands,
  sortedBySpan,
  spanLength,
  spanStart,
  withSpan
} from '../util/PoolGeometry';
import { trimResizeHandles } from '../util/Dom';

export class LaneBandBehavior extends CommandInterceptor {
  static $inject = ['eventBus', 'modeling', 'orientationService'];

  constructor(
    eventBus: EventBus,
    private readonly modeling: Modeling,
    private readonly orientationService: OrientationService
  ) {
    super(eventBus);

    // 900 < 引擎 Resize.handleStart（默认 1000）：晚于其建立默认约束后作收紧
    eventBus.on('resize.start', 900, (event: any) => this.constrainResize(event.context));

    this.on('shape.resize', 'preExecute', (event: any) => this.clampLaneResize(event.context));
    this.on('shape.resize', 'postExecute', (event: any) => this.onShapeResized(event.context));

    this.on('spaceTool', 'preExecute', (event: any) => {
      const moving = event.context.movingShapes;
      if (moving?.some((s: any) => is(s, 'bpmn:Lane'))) {
        event.context.movingShapes = moving.filter((s: any) => !is(s, 'bpmn:Lane'));
      }
    });

    // 泳道只保留堆叠轴手柄（与规则层方向拒绝互为表里，同注记 w/e 裁剪先例）
    eventBus.on('selection.changed', 200, (event: any) => this.trimLaneHandles(event.newSelection));
  }

  /**
   * 拖拽活体约束：在引擎默认约束（内容 bbox 下限）上收紧带界/池界下限——
   * 拖动框恰好停在"邻带只剩最小厚度 / 池内容区下限"处，而非越界后被提交
   * 钳制回弹。按拖动方向只约束被拖的缘（另一缘不动，不该被牵连）。
   */
  private constrainResize(context: any): void {
    const direction: string | undefined = context?.direction;
    if (!direction) {
      return;
    }
    const shape = context.shape;
    const horizontal = this.orientationService.isHorizontal();
    const axis = laneStackAxis(horizontal);
    const min = { ...(context.resizeConstraints?.min ?? {}) };
    const max = { ...(context.resizeConstraints?.max ?? {}) };
    const raiseMin = (edge: string, bound: number): void => {
      min[edge] = Math.max(min[edge] ?? -Infinity, bound);
    };
    const lowerMax = (edge: string, bound: number): void => {
      max[edge] = Math.min(max[edge] ?? Infinity, bound);
    };
    // 堆叠轴前/后缘的拖动字母与 TRBL 边名（水平池：前=n/top 后=s/bottom；垂直池：前=w/left 后=e/right）
    const frontDir = axis === 'y' ? 'n' : 'w';
    const backDir = axis === 'y' ? 's' : 'e';
    const frontEdge = axis === 'y' ? 'top' : 'left';
    const backEdge = axis === 'y' ? 'bottom' : 'right';

    if (is(shape, 'bpmn:Lane')) {
      const front = spanStart(shape, axis);
      const back = front + spanLength(shape, axis);
      const before = this.adjacentBand(shape, axis, 'before');
      const after = this.adjacentBand(shape, axis, 'after');
      if (direction.includes(frontDir)) {
        // 前缘：向下（收缩自身）保自身最小厚度（上界=back-MIN）；向上（长入
        // 前带）保前带最小厚度（下界=before 前缘+MIN，无前带=池沿侧不受限）
        raiseMin(frontEdge, back - MIN_LANE_BAND);
        lowerMax(frontEdge, before ? spanStart(before, axis) + MIN_LANE_BAND : -Infinity);
      }
      if (direction.includes(backDir)) {
        raiseMin(backEdge, front + MIN_LANE_BAND);
        lowerMax(backEdge, after ? spanStart(after, axis) + spanLength(after, axis) - MIN_LANE_BAND : Infinity);
      }
      context.resizeConstraints = { min, max };
      return;
    }

    if (is(shape, 'bpmn:Participant')) {
      const lanes = (shape.children ?? []).filter((c: any) => is(c, 'bpmn:Lane'));
      if (!lanes.length) {
        return;
      }
      const sorted = sortedBySpan(lanes, axis);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const poolFront = spanStart(shape, axis);
      const poolBack = poolFront + spanLength(shape, axis);
      // 堆叠轴：收缩只吃边缘带（各保底最小厚度），增长不受限
      if (direction.includes(frontDir)) {
        raiseMin(frontEdge, poolFront + (spanLength(first, axis) - MIN_LANE_BAND));
      }
      if (direction.includes(backDir)) {
        raiseMin(backEdge, poolBack - (spanLength(last, axis) - MIN_LANE_BAND));
      }
      // 跨轴收缩不破内容区最小跨度（跨轴缘=另一对方向字母）
      const contentFloor = SIZES.POOL_HEADER + MIN_LANE_SPAN;
      if (horizontal) {
        if (direction.includes('e')) {
          raiseMin('right', shape.x + contentFloor);
        }
        if (direction.includes('w')) {
          lowerMax('left', shape.x + shape.width - contentFloor);
        }
      } else {
        if (direction.includes('s')) {
          raiseMin('bottom', shape.y + contentFloor);
        }
        if (direction.includes('n')) {
          lowerMax('top', shape.y + shape.height - contentFloor);
        }
      }
      context.resizeConstraints = { min, max };
    }
  }

  /** 带界权威钳制（程序化路径；UI 路径已被 constrainResize 活体钳住） */
  private clampLaneResize(context: any): void {
    const lane = context.shape;
    if (!is(lane, 'bpmn:Lane') || context.hints?.laneBandFollow) {
      return;
    }
    const pool = lane.parent;
    if (!is(pool, 'bpmn:Participant')) {
      return;
    }
    const horizontal = this.orientationService.isHorizontal();
    const axis = laneStackAxis(horizontal);
    const inner = poolInnerRect(pool, SIZES.POOL_HEADER, horizontal);
    const before = this.adjacentBand(lane, axis, 'before');
    const after = this.adjacentBand(lane, axis, 'after');
    // 原区间锚点：被拖缘只在自己的合法半区移动，另一缘的"自身保底"锚回
    // 原对侧缘——越冲越远的落点（捕捉放大）只会被压回原区间，不会把整条
    // 带平移出原有范围（平移会让带界跟随把池算成负长度，炸命令栈 action 帧）
    const oldFront = spanStart(lane, axis);
    const oldBack = oldFront + spanLength(lane, axis);

    let rect = { ...context.newBounds };
    // 跨轴永远铺满内容区（跨轴尺寸归池所有）
    rect = axis === 'y'
      ? { ...rect, x: inner.x, width: inner.width }
      : { ...rect, y: inner.y, height: inner.height };

    let back = spanStart(rect, axis) + spanLength(rect, axis);
    if (after) {
      back = Math.min(back, spanStart(after, axis) + spanLength(after, axis) - MIN_LANE_BAND);
    }
    back = Math.max(back, oldFront + MIN_LANE_BAND);
    let front = spanStart(rect, axis);
    if (before) {
      front = Math.max(front, spanStart(before, axis) + MIN_LANE_BAND);
    }
    front = Math.min(front, oldBack - MIN_LANE_BAND);
    // 双缘同动的退化入参：前缘让位（保长度 ≥ 最小带厚）
    if (back < front + MIN_LANE_BAND) {
      front = back - MIN_LANE_BAND;
    }
    context.newBounds = withSpan(rect, axis, front, back - front);
  }

  private onShapeResized(context: any): void {
    const shape = context.shape;
    if (is(shape, 'bpmn:Lane')) {
      if (!context.hints?.laneBandFollow) {
        this.followBandEdges(context);
      }
      return;
    }
    // hints.autoResize 未给=池的直接 resize（用户手柄/空间工具）；自动扩框
    // 路径带方向数组提示且已自带重铺，避免双重应用
    if (is(shape, 'bpmn:Participant') && context.hints?.autoResize === undefined) {
      this.refitPoolLanes(shape, context.oldBounds, context.newBounds);
    }
  }

  /** 带界跟随：邻带等量让位；边缘带外侧缘由池沿吸收 */
  private followBandEdges(context: any): void {
    const lane = context.shape;
    const pool = lane.parent;
    if (!is(pool, 'bpmn:Participant')) {
      return;
    }
    const axis = laneStackAxis(this.orientationService.isHorizontal());
    const oldBounds = context.oldBounds;
    const oldFront = spanStart(oldBounds, axis);
    const oldBack = oldFront + spanLength(oldBounds, axis);
    const newFront = spanStart(lane, axis);
    const newBack = newFront + spanLength(lane, axis);
    const frontDelta = newFront - oldFront;
    const backDelta = newBack - oldBack;
    if (!frontDelta && !backDelta) {
      return;
    }

    // preExecute 已按旧界钳制，邻带判定也锚定旧界（此时邻带尚未动）
    const before = this.adjacentBand(lane, axis, 'before', oldFront);
    const after = this.adjacentBand(lane, axis, 'after', oldBack);
    const hints: any = { laneBandFollow: true, autoResize: false };

    if (frontDelta) {
      if (before) {
        this.modeling.resizeShape(
          before,
          withSpan(before, axis, spanStart(before, axis), spanLength(before, axis) + frontDelta),
          undefined,
          hints
        );
      } else {
        // 首带前沿=池前沿：池随之伸缩，其余带不动（无需重铺）
        this.modeling.resizeShape(
          pool,
          withSpan(pool, axis, newFront, spanLength(pool, axis) - frontDelta),
          undefined,
          hints
        );
      }
    }
    if (backDelta) {
      if (after) {
        this.modeling.resizeShape(
          after,
          withSpan(after, axis, newBack, spanLength(after, axis) - backDelta),
          undefined,
          hints
        );
      } else {
        this.modeling.resizeShape(
          pool,
          withSpan(pool, axis, spanStart(pool, axis), spanLength(pool, axis) + backDelta),
          undefined,
          hints
        );
      }
    }
  }

  /** 池直改尺寸后的带重铺（同 BpmnAutoResize.resize 的重铺语义） */
  private refitPoolLanes(pool: any, oldBounds: any, newBounds: any): void {
    const lanes: any[] = (pool.children ?? []).filter((c: any) => is(c, 'bpmn:Lane'));
    if (!lanes.length) {
      return;
    }
    const fits = refitLaneBands(
      lanes,
      oldBounds,
      newBounds,
      SIZES.POOL_HEADER,
      this.orientationService.isHorizontal()
    );
    for (const { lane, bounds } of fits) {
      if (!rectsEqual(bounds, lane)) {
        this.modeling.resizeShape(lane, bounds, undefined, { laneBandFollow: true, autoResize: false } as any);
      }
    }
  }

  /** 相邻带：before=后缘贴我前缘的带；after=前缘贴我后缘的带（LANE_EPS 容差） */
  private adjacentBand(lane: any, axis: 'x' | 'y', side: 'before' | 'after', edge?: number): any | null {
    const anchor = edge ?? (side === 'before' ? spanStart(lane, axis) : spanStart(lane, axis) + spanLength(lane, axis));
    return ((lane.parent as any)?.children ?? [])
      .find((c: any) => {
        if (!is(c, 'bpmn:Lane') || c === lane) {
          return false;
        }
        return side === 'before'
          ? Math.abs(spanStart(c, axis) + spanLength(c, axis) - anchor) <= LANE_EPS
          : Math.abs(spanStart(c, axis) - anchor) <= LANE_EPS;
      }) ?? null;
  }

  /** 泳道只保留堆叠轴手柄：水平池 n/s、垂直池 w/e */
  private trimLaneHandles(selection: any[]): void {
    const lane = selection?.length === 1 ? selection[0] : null;
    if (!lane || !is(lane, 'bpmn:Lane')) {
      return;
    }
    trimResizeHandles(this.orientationService.isHorizontal() ? 'ns' : 'we');
  }
}
