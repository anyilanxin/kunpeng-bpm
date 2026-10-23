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
 * 池/泳道朝向几何（纯函数，无服务依赖）。
 *
 * 两种布局形态沿同一组轴语义统一：
 * - 水平池：头带在左（沿 x 偏移 POOL_HEADER），泳道=行带，堆叠轴=y；
 * - 垂直池：头带在顶（沿 y 偏移 POOL_HEADER），泳道=列带，堆叠轴=x。
 * 命令/创建/落点各处共用此模块，不再散落硬编码。
 */

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 泳道带尺寸下限（产品规定，非无限制小）：水平形态宽 600 / 高 250，垂直
 * 形态按朝向转置——跨轴（流向长度）≥600，堆叠轴（带厚）≥250。
 * 分割校验、resize 边界钳制、池内容区下限共享此组常量。
 */
export const MIN_LANE_SPAN = 600;
export const MIN_LANE_BAND = 250;

/** 泳道堆叠轴：水平池沿 y（行带），垂直池沿 x（列带） */
export function laneStackAxis(horizontal: boolean): 'x' | 'y' {
  return horizontal ? 'y' : 'x';
}

/** 池内容区（避开头带）：水平=右侧区，垂直=下方区 */
export function poolInnerRect(pool: RectLike, header: number, horizontal: boolean): RectLike {
  return horizontal
    ? { x: pool.x + header, y: pool.y, width: pool.width - header, height: pool.height }
    : { x: pool.x, y: pool.y + header, width: pool.width, height: pool.height - header };
}

/**
 * 泳道带矩形：给定堆叠轴上的起点与条带厚度，跨轴方向铺满内容区。
 * inner 为池内容区（poolInnerRect 的结果）。
 */
export function laneBandRect(
  inner: RectLike,
  start: number,
  thickness: number,
  horizontal: boolean
): RectLike {
  return horizontal
    ? { x: inner.x, y: start, width: inner.width, height: thickness }
    : { x: start, y: inner.y, width: thickness, height: inner.height };
}

/** 沿堆叠轴读取带起点 / 厚度 */
export function spanStart(band: RectLike, axis: 'x' | 'y'): number {
  return axis === 'x' ? band.x : band.y;
}

export function spanLength(band: RectLike, axis: 'x' | 'y'): number {
  return axis === 'x' ? band.width : band.height;
}

/** 沿堆叠轴平移带（跨轴不动），返回新矩形（不可变风格，便于命令快照） */
export function shiftAlongAxis(band: RectLike, axis: 'x' | 'y', delta: number): RectLike {
  return axis === 'x' ? { ...band, x: band.x + delta } : { ...band, y: band.y + delta };
}

/** 沿堆叠轴设置带起点与长度（divide 收缩/重排用） */
export function withSpan(band: RectLike, axis: 'x' | 'y', start: number, length: number): RectLike {
  return axis === 'x'
    ? { ...band, x: start, width: length }
    : { ...band, y: start, height: length };
}

/** 容器创建尺寸按朝向取形：垂直布局池取转置（瘦高），水平取原形（扁宽） */
export function containerSize(
  width: number,
  height: number,
  horizontal: boolean
): { width: number; height: number } {
  return horizontal ? { width, height } : { width: height, height: width };
}

/**
 * 泳道插入方向归一（旧 @kunpeng-js 线 API 契约）：'top'/'left' 一律视为
 * 堆叠序列的前端（before），'bottom'/'right' 为后端（after）——两对名字在
 * 两种朝向下都合法，语义锚定"序列前后"而非屏幕方位。
 */
export function normalizeLanePosition(
  position: 'top' | 'bottom' | 'left' | 'right' | 'divide'
): 'before' | 'after' | 'divide' {
  if (position === 'divide') {
    return 'divide';
  }
  return position === 'top' || position === 'left' ? 'before' : 'after';
}

/** 泳道带重铺结果：泳道元素（泛型保留宿主引用）与其新矩形 */
export interface LaneBandFit<T extends RectLike> {
  lane: T;
  bounds: RectLike;
}

/**
 * 池边界变化后的泳道带重铺（纯几何，auto-resize 扩池后使用）。
 *
 * 泳道带是池内容区的划分而非独立图形：跨轴方向永远铺满新内容区；
 * 堆叠轴保持各带厚度不变，池在堆叠轴上的增量由对应侧的边缘带吸收
 * （前端增量归首带、后端增量归末带、单带两者皆收），负增量（池收缩）
 * 同式对称削减。带内容不移动，条带始终铺满内容区、无缝无溢出。
 */
export function refitLaneBands<T extends RectLike>(
  lanes: T[],
  oldPool: RectLike,
  newPool: RectLike,
  header: number,
  horizontal: boolean
): LaneBandFit<T>[] {
  const axis = laneStackAxis(horizontal);
  const inner = poolInnerRect(newPool, header, horizontal);
  const growBefore = spanStart(oldPool, axis) - spanStart(newPool, axis);
  const growAfter =
    spanStart(newPool, axis) + spanLength(newPool, axis) -
    (spanStart(oldPool, axis) + spanLength(oldPool, axis));

  const ordered = lanes.slice().sort((a, b) => spanStart(a, axis) - spanStart(b, axis));
  const last = ordered.length - 1;

  return ordered.map((lane, index) => {
    let bounds: RectLike = horizontal
      ? { x: inner.x, y: lane.y, width: inner.width, height: lane.height }
      : { x: lane.x, y: inner.y, width: lane.width, height: inner.height };
    if (index === 0 && growBefore !== 0) {
      bounds = withSpan(
        bounds, axis,
        spanStart(bounds, axis) - growBefore,
        spanLength(bounds, axis) + growBefore
      );
    }
    if (index === last && growAfter !== 0) {
      bounds = withSpan(bounds, axis, spanStart(bounds, axis), spanLength(bounds, axis) + growAfter);
    }
    return { lane, bounds };
  });
}
