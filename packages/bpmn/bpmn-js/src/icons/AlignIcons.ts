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
 * 对齐 / 分布图标（自绘 18 网格 SVG）：圆头轴线 + 描边"固定框" + 半透明"移动框"，
 * 分布方向用括号取代轴线。context pad 触发图标与弹框菜单条目共用一套。
 */
import { svgShell, entryShell } from './shell';

const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.5"';

const axisV = (x: number) => `<path d="M${x},1.5 V16.5" ${STROKE} stroke-linecap="round"/>`;
const axisH = (y: number) => `<path d="M1.5,${y} H16.5" ${STROKE} stroke-linecap="round"/>`;
const boxFixed = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${STROKE}/>`;
const boxMoving = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="currentColor" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>`;
const bracketH = `<path d="M4.5,4 V1.5 H13.5 V4" ${STROKE} stroke-linejoin="round"/>`;
const bracketV = `<path d="M4,13.5 H1.5 V4.5 H4" ${STROKE} stroke-linejoin="round"/>`;

/** 图标库：pad 触发图标 align + 六个对齐方向 + 两个分布方向 */
const ICON_BODIES: Record<string, string> = {
  align: axisV(2) + boxFixed(4.5, 1.5, 12, 6.5) + boxMoving(4.5, 10, 7, 6.5),
  'align-left': axisV(1.5) + boxFixed(1.5, 2, 13.5, 6) + boxMoving(1.5, 10.5, 7.5, 6),
  'align-center': axisV(9) + boxFixed(2.25, 2, 13.5, 6) + boxMoving(5.25, 10.5, 7.5, 6),
  'align-right': axisV(16.5) + boxFixed(3, 2, 13.5, 6) + boxMoving(9, 10.5, 7.5, 6),
  'align-top': axisH(1.5) + boxFixed(2, 1.5, 6, 13.5) + boxMoving(10.5, 1.5, 6, 7.5),
  'align-middle': axisH(9) + boxFixed(2, 2.25, 6, 13.5) + boxMoving(10.5, 5.25, 6, 7.5),
  'align-bottom': axisH(16.5) + boxFixed(2, 3, 6, 13.5) + boxMoving(10.5, 9, 6, 7.5),
  'distribute-horizontal': bracketH + boxFixed(1.5, 5, 6, 11) + boxMoving(10.5, 5, 6, 7.5),
  'distribute-vertical': bracketV + boxFixed(5, 1.5, 11, 6) + boxMoving(5, 10, 7.5, 6)
};

/** 独立 SVG 字符串（弹框菜单条目 imageHtml 用） */
export function alignIconHtml(name: string, size = 20): string {
  return svgShell(ICON_BODIES[name] ?? '', 18, size);
}

/** context pad 自定义条目 html（裸 SVG 收不到交互，必须包标准 .entry 外壳） */
export function alignPadEntryHtml(): string {
  return entryShell(alignIconHtml('align', 18));
}
