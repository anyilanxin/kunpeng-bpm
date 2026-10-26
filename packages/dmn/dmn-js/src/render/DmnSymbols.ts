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
 * DMN 记法符号库（规范 §6.2 DRD 记法；轮廓几何对齐用户资产 dmnicons
 * ——2026-10-26 定规「画布图形基于这些图标」）：
 * - Decision：直角矩形（资产 dmn-icon-decision 平边矩形）；
 * - BusinessKnowledgeModel：左上+右下双切角罐形（资产 dmn-icon-business-knowledge）；
 * - InputData：两端半圆胶囊（资产 dmn-icon-input-data）；
 * - KnowledgeSource：底边三扇波浪开底（资产 dmn-icon-knowledge-source 扇贝节奏）；
 * - DecisionService：粗框矩形+顶带+分割线（§6.2.5）；
 * - TextAnnotation：左界线+开放框（§6.2.6）；
 * - 连线端头：信息需求=实心箭头（§6.2.7）、知识需求=虚线空心箭头、
 *   权威需求=虚线实心圆头。
 */
import { append, create, attr } from 'tiny-svg';

export interface StyleTheme {
  stroke: string;
  fill: string;
  labelColor: string;
}

/** 连线宽（与 BPMN 线 LINE_WIDTH 同量级：跨组件一致的视觉密度） */
export const LINE_WIDTH = 1.5;

function drawRectPath(visuals: SVGElement, d: string, theme: StyleTheme, strokeWidth = LINE_WIDTH): void {
  const path = create('path');
  attr(path, {
    d,
    fill: theme.fill,
    stroke: theme.stroke,
    'stroke-width': strokeWidth,
    'stroke-linejoin': 'round'
  });
  append(visuals, path);
}

/** Decision：直角矩形（资产 dmn-icon-decision 平边矩形，无圆角） */
export function drawDecisionShape(visuals: SVGElement, w: number, h: number, theme: StyleTheme): void {
  drawRectPath(visuals, `M0,0 H${w} V${h} H0 Z`, theme);
}

/** BKM：左上+右下双切角罐形（资产 dmn-icon-business-knowledge；切角腿 BKM_CUT） */
export function drawBkmShape(visuals: SVGElement, w: number, h: number, cut: number, theme: StyleTheme): void {
  drawRectPath(visuals, `M${cut},0 H${w} V${h - cut} L${w - cut},${h} H0 V${cut} Z`, theme);
}

/** InputData：两端半圆胶囊（半径=高半） */
export function drawInputDataShape(visuals: SVGElement, w: number, h: number, theme: StyleTheme): void {
  const r = h / 2;
  drawRectPath(visuals, `M${r},0 H${w - r} A${r},${r} 0 0 1 ${w - r},${h} H${r} A${r},${r} 0 0 1 ${r},0 Z`, theme);
}

/** KnowledgeSource：底边三扇波浪（资产扇贝节奏；波幅 wave，开底为记法本义——底边波浪线示意文档源） */
export function drawKnowledgeSourceShape(visuals: SVGElement, w: number, h: number, wave: number, theme: StyleTheme): void {
  const seg = w / 3;
  let d = `M0,0 H${w} V${h - wave}`;
  for (let i = 0; i < 3; i++) {
    const x1 = w - i * seg;
    const x0 = x1 - seg;
    d += ` C${x1 - seg * 0.25},${h + wave} ${x0 + seg * 0.25},${h + wave} ${x0},${h - wave}`;
  }
  drawRectPath(visuals, d + ' Z', theme);
}

/** DecisionService：粗框（宽 3）+顶带着色+分割线（dividerY 相对值） */
export function drawDecisionServiceShape(
  visuals: SVGElement,
  w: number,
  h: number,
  dividerY: number,
  theme: StyleTheme
): void {
  // 顶带（分割线以上）弱着色：区隔输出决策带与封装区
  drawRectPath(visuals, `M0,0 H${w} V${dividerY} H0 Z`, { ...theme, stroke: 'none', fill: '#f2f6fc' });
  drawRectPath(visuals, `M0,0 H${w} V${h} H0 Z`, theme, 3);
  const divider = create('path');
  attr(divider, {
    d: `M0,${dividerY} H${w}`,
    fill: 'none',
    stroke: theme.stroke,
    'stroke-width': LINE_WIDTH
  });
  append(visuals, divider);
}

/** TextAnnotation：左界线 + 三边开放框 */
export function drawTextAnnotationShape(visuals: SVGElement, w: number, h: number, theme: StyleTheme): void {
  const bar = create('path');
  attr(bar, { d: 'M5,0 V' + h, fill: 'none', stroke: theme.stroke, 'stroke-width': 2 });
  append(visuals, bar);
  drawRectPath(visuals, `M5,0 H${w} V${h} H5`, theme);
}

/** 实心箭头（信息需求端头，规范 §6.2.7 "a solid arrowhead"） */
export function appendFilledArrow(
  visuals: SVGElement,
  from: { x: number; y: number },
  tip: { x: number; y: number },
  stroke: string
): void {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const wing = Math.PI / 2;
  const len = 12;
  const halfW = 4;
  const l = {
    x: tip.x - len * Math.cos(angle) + halfW * Math.cos(angle + wing),
    y: tip.y - len * Math.sin(angle) + halfW * Math.sin(angle + wing)
  };
  const r2 = {
    x: tip.x - len * Math.cos(angle) + halfW * Math.cos(angle - wing),
    y: tip.y - len * Math.sin(angle) + halfW * Math.sin(angle - wing)
  };
  const poly = create('path');
  attr(poly, {
    d: `M${tip.x},${tip.y} L${l.x},${l.y} L${r2.x},${r2.y} Z`,
    fill: stroke,
    stroke: 'none'
  });
  append(visuals, poly);
}

/** 空心箭头（知识需求端头，规范 "an open arrowhead"）：两翼开口 V 线 */
export function appendOpenArrow(
  visuals: SVGElement,
  from: { x: number; y: number },
  tip: { x: number; y: number },
  stroke: string
): void {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const len = 12;
  const halfW = 5;
  const wing = (theta: number) => ({
    x: tip.x - len * Math.cos(angle) + halfW * Math.cos(angle + theta),
    y: tip.y - len * Math.sin(angle) + halfW * Math.sin(angle + theta)
  });
  const l = wing(Math.PI / 2);
  const r = wing(-Math.PI / 2);
  const path = create('path');
  attr(path, {
    d: `M${l.x},${l.y} L${tip.x},${tip.y} L${r.x},${r.y}`,
    fill: 'none',
    stroke,
    'stroke-width': LINE_WIDTH,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  });
  append(visuals, path);
}

/** 实心圆头（权威需求端头，规范 "a filled circular head"） */
export function appendCircleHead(
  visuals: SVGElement,
  tip: { x: number; y: number },
  stroke: string
): void {
  const circle = create('circle');
  attr(circle, { cx: tip.x - 4, cy: tip.y, r: 4, fill: stroke, stroke: 'none' });
  append(visuals, circle);
}
