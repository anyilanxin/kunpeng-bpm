/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that licenses/ directories that accompany this code.
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
 * DMN 布线器：需求连线为直连线（规范记法无肘形要求），端点贴形状边线
 * （中心连线与边界交点——直线几何求交，无避障语义）。
 */
import BaseLayouter from 'diagram-js/lib/layout/BaseLayouter';
import type { LayoutConnectionHints } from 'diagram-js/lib/layout/BaseLayouter';

export class DmnLayouter extends BaseLayouter {
  override layoutConnection(connection: any, hints?: LayoutConnectionHints): any[] {
    void hints;
    const source = connection.source;
    const target = connection.target;
    const sourceCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
    const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
    return [
      intersectRect(source, sourceCenter, targetCenter),
      intersectRect(target, targetCenter, sourceCenter)
    ];
  }
}

/** 中心→中心连线与矩形边线的交点（矩形内起点退中心） */
function intersectRect(rect: any, from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }
  // 半平面裁剪：出矩形边线的 t（参数化 from+t*(to-from)）
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  let t = Infinity;
  if (dx !== 0) {
    const tx = ((dx > 0 ? halfW : -halfW)) / dx;
    if (tx >= 0 && tx < t) t = tx;
  }
  if (dy !== 0) {
    const ty = ((dy > 0 ? halfH : -halfH)) / dy;
    if (ty >= 0 && ty < t) t = ty;
  }
  if (t === Infinity) {
    return { x: cx, y: cy };
  }
  return { x: cx + dx * t, y: cy + dy * t };
}
