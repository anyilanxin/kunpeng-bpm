/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and directories/ that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 内置动作图标（自绘 48×48 viewBox、currentColor 描边，与组件记法图标同语言）。
 * 宿主自定义动作经 ToolbarActionSpec.svg 传入同规格字符串。
 */
const wrap = (paths: string): string =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  undo: wrap(
    '<path d="m15.322 23.78-7.778-7.778 7.778-7.778M8.81 16H29.5C35.851 16 41 21.15 41 27.5 41 33.852 35.851 39 29.5 39H17" />'
  ),
  redo: wrap(
    '<path d="m32.678 23.78 7.778-7.778-7.778-7.778M39.19 16H18.5C12.149 16 7 21.15 7 27.5 7 33.852 12.149 39 18.5 39H31" />'
  ),
  // 布局状态图标（单钮随当前朝向换显）：横=横箭头款、纵=纵箭头款（同构互为
  // 转置，中线虚段标识转置轴），图标本身标识当前态
  orientationHorizontal: wrap(
    '<path d="M38 10H10m0 0 6-6m-6 6 6 6" /><path d="M10 38h28m0 0-6-6m6 6-6 6" /><path d="M24 18v12" stroke-dasharray="4 4" />'
  ),
  orientationVertical: wrap(
    '<path d="M10 38V10m0 0-6 6m6-6 6 6" /><path d="M38 10v28m0 0 6-6m-6 6-6-6" /><path d="M18 24h12" stroke-dasharray="4 4" />'
  ),
  zoomOut: wrap(
    '<path d="M32.607 32.607A14.953 14.953 0 0 0 37 22c0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15 4.142 0 7.892-1.679 10.607-4.393Zm0 0L41.5 41.5M29 22H15" />'
  ),
  zoomIn: wrap(
    '<path d="M32.607 32.607A14.953 14.953 0 0 0 37 22c0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15 4.142 0 7.892-1.679 10.607-4.393Zm0 0L41.5 41.5M29 22H15m7 7V15" />'
  ),
  zoomFit: wrap(
    '<path clip-rule="evenodd" d="M24 6c9.941 0 18 8.059 18 18s-8.059 18-18 18S6 33.941 6 24 14.059 6 24 6Z" />' +
      '<path d="M30 24a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />' +
      '<path d="M30 24a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" fill="currentColor" stroke="none" />'
  ),
  more: wrap(
    '<circle cx="14" cy="24" r="4" fill="currentColor" stroke="none" />' +
      '<circle cx="24" cy="24" r="4" fill="currentColor" stroke="none" />' +
      '<circle cx="34" cy="24" r="4" fill="currentColor" stroke="none" />'
  ),
  setColor: wrap('<path d="M24 6c6 8 12 13.5 12 21a12 12 0 1 1-24 0c0-7.5 6-13 12-21Z" />'),
  clearColor: wrap(
    '<path d="M24 6c6 8 12 13.5 12 21a12 12 0 1 1-24 0c0-7.5 6-13 12-21Z" />' +
      '<path d="M10 38 38 10" />'
  )
} as const;
