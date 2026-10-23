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
 * 边界事件贴边几何（规范 §10.6 / Table 10.91：attachedTo: Activity——
 * "An Intermediate Event that is attached to the boundary of an Activity"）。
 *
 * 交互映射：落点须贴近宿主边框才允许附加，创建后圆心对齐到最近边线。
 * 容差取边界事件半径（36 / 2 = 18）：容差内落下时事件圆视觉上恰好接触
 * 边线——自有取值，非抄任何实现。
 */

/** 落点距宿主边框的可附加容差（像素，模型坐标） */
export const ATTACH_EDGE_TOLERANCE = 18;

/** 点到矩形边框的距离：内部=到最近边的垂直距离，外部=到矩形的欧氏距离 */
export function distanceToBorder(
  bounds: { x: number; y: number; width: number; height: number },
  point: { x: number; y: number }
): number {
  const outsideX = Math.max(bounds.x - point.x, 0, point.x - (bounds.x + bounds.width));
  const outsideY = Math.max(bounds.y - point.y, 0, point.y - (bounds.y + bounds.height));
  if (outsideX > 0 || outsideY > 0) {
    return Math.hypot(outsideX, outsideY);
  }
  return Math.min(
    point.x - bounds.x,
    bounds.x + bounds.width - point.x,
    point.y - bounds.y,
    bounds.y + bounds.height - point.y
  );
}

/** 把点投影到矩形最近边线上（圆心贴边：x=左/右边线或 y=上/下边线） */
export function projectOnBorder(
  bounds: { x: number; y: number; width: number; height: number },
  point: { x: number; y: number }
): { x: number; y: number } {
  const left = point.x - bounds.x;
  const right = bounds.x + bounds.width - point.x;
  const top = point.y - bounds.y;
  const bottom = bounds.y + bounds.height - point.y;
  const min = Math.min(left, right, top, bottom);
  if (min === left) return { x: bounds.x, y: point.y };
  if (min === right) return { x: bounds.x + bounds.width, y: point.y };
  if (min === top) return { x: point.x, y: bounds.y };
  return { x: point.x, y: bounds.y + bounds.height };
}

/**
 * 把 createShape 的 position 对齐到宿主最近边线。兼容两种形态：
 * 点（落点中心）直接投影；bounds（左上角+尺寸，CreateElementsHandler
 * 的调用形态）按中心投影后整体平移，保持尺寸不变。
 */
export function snapPositionToBorder(
  host: { x: number; y: number; width: number; height: number },
  position: { x: number; y: number; width?: number; height?: number }
): { x: number; y: number; width?: number; height?: number } {
  if (typeof position.width === 'number' && typeof position.height === 'number') {
    const center = projectOnBorder(host, {
      x: position.x + position.width / 2,
      y: position.y + position.height / 2
    });
    return { x: center.x - position.width / 2, y: center.y - position.height / 2, width: position.width, height: position.height };
  }
  return projectOnBorder(host, position);
}
