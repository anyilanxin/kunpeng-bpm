/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates this
 * particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file in the licenses/ directory that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 图标 SVG 外壳单一来源：IconSet / ToolIcons / AlignIcons / BpmnIcons 四处
 * 此前各自内联同款 `<svg …>` 模板与 `.entry` 包装（评估 B7），收敛于此。
 */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/** 方形视框 SVG 外壳（body 为内部标记串） */
export function svgShell(body: string, viewBoxSize: number, size: number): string {
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}

/** 矩形视框 SVG 外壳（IconSet 资产按各自 w×h 视框） */
export function svgShellRect(body: string, viewBoxW: number, viewBoxH: number, size: number): string {
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${viewBoxW} ${viewBoxH}" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}

/** palette / context pad 动作条目外壳（裸 SVG 收不到交互，必须包标准 .entry） */
export function entryShell(svg: string): string {
  return `<div class="entry" draggable="true">${svg}</div>`;
}
