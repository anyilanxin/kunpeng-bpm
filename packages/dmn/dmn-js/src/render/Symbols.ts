/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
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
 * DMN 记法绘制件（形状 path / 端点装饰）——记法语义按 DMN 1.6 §6.2.1，
 * 几何常量自有设计（见 meta/ElementTypes SIZES 注释）。
 * 坐标契约：一律以元素原点 (0,0) 起画（gfx 组自带 translate）。
 */
import { append, attr, create } from 'tiny-svg';
import { SIZES } from '../meta/ElementTypes';

export interface StyleTheme {
  stroke: string;
  fill: string;
  labelColor: string;
}

export const DEFAULT_THEME: StyleTheme = Object.freeze({
  stroke: '#000000',
  fill: '#ffffff',
  labelColor: '#000000'
});

/** 线型记法（规范 §6.2.2：信息需求实线；知识/授权需求虚线；关联点线细） */
export const LINE_WIDTH = 1.5;
export const DASH_REQUIREMENT = '5 3';
export const DASH_ASSOCIATION = '2 3';

/** 决策：矩形（规范 §6.2.1.1 "a rectangle, normally drawn with solid lines"） */
export function drawDecisionShape(visuals: SVGElement, shape: any, theme: StyleTheme): void {
  drawPath(visuals, `M0,0 H${shape.width} V${shape.height} H0 Z`, theme);
}

/**
 * 业务知识模型：双切角矩形（规范 §6.2.1.2 "a rectangle with two clipped
 * corners"）——切角取对角（左上/右下），切边长 BKM_CUT=20：五段闭合 path。
 */
export function drawBkmShape(visuals: SVGElement, shape: any, theme: StyleTheme): void {
  const { width: w, height: h } = shape;
  const c = Math.min(SIZES.BKM_CUT, w / 2, h / 2);
  drawPath(visuals, `M${c},0 H${w} V${h - c} L${w - c},${h} H0 V${c} Z`, theme);
}

/**
 * 输入数据：两侧直边 + 两端半圆（规范 §6.2.1.3 "two parallel straight sides
 * and two semi-circular ends"）——胶囊形 path，半径=高之半。
 */
export function drawInputDataShape(visuals: SVGElement, shape: any, theme: StyleTheme): void {
  const { width: w, height: h } = shape;
  const r = h / 2;
  drawPath(
    visuals,
    `M${r},0 H${w - r} A${r},${r} 0 0 1 ${w - r},${h} H${r} A${r},${r} 0 0 1 ${r},0 Z`,
    theme
  );
}

/**
 * 知识源：三直边 + 一波浪边（规范 §6.2.1.4 "three straight sides and one
 * wavy one"）——波浪落在底边：Q 曲线控制点上下交替（偏移 2×波幅=8，二次
 * 曲线中点偏移为其半 ≈ 波幅 4），波数按宽度自适应（段长约 26，整除收敛）。
 */
export function drawKnowledgeSourceShape(visuals: SVGElement, shape: any, theme: StyleTheme): void {
  const { width: w, height: h } = shape;
  const amp = SIZES.KS_WAVE;
  const waves = Math.max(2, Math.round(w / 26));
  const seg = w / waves;
  let d = `M0,0 H${w} V${h}`;
  for (let i = 0; i < waves; i++) {
    const cx = w - (i + 0.5) * seg;
    const nx = w - (i + 1) * seg;
    const control = (i % 2 === 0 ? 1 : -1) * amp * 2;
    d += ` Q${cx},${h + control} ${nx},${h}`;
  }
  d += ' Z';
  drawPath(visuals, d, theme);
}

/** 文本注记：左侧开口方括号（规范 §6.2.1 Artifacts "a square bracket"） */
export function drawAnnotationBracket(visuals: SVGElement, shape: any, theme: StyleTheme): void {
  const { height: h } = shape;
  const arm = 12;
  drawPath(visuals, `M${arm},0 H0 V${h} H${arm}`, { ...theme, fill: 'none' });
}

/**
 * 决策服务：圆角矩形 + 粗实线（规范 §6.2.1.5 "rectangle with rounded
 * corners, drawn with a heavy solid border"；P8 补顶带输出区与分割线）。
 */
export function drawDecisionServiceShape(visuals: SVGElement, shape: any, theme: StyleTheme): void {
  const { width: w, height: h } = shape;
  const r = 10;
  drawPath(
    visuals,
    `M${r},0 H${w - r} A${r},${r} 0 0 1 ${w},${r} V${h - r} A${r},${r} 0 0 1 ${w - r},${h} H${r} A${r},${r} 0 0 1 0,${h - r} V${r} A${r},${r} 0 0 1 ${r},0 Z`,
    theme,
    3
  );
}

/**
 * 实心箭头（信息需求端头，规范 §6.2.2.1 "a solid arrowhead"）：等腰三角
 * path，轴向长 12、半宽 4（长:半宽 3:1，与 BPMN 线同形态语言）。
 */
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

/** 空心箭头（知识需求端头，规范 §6.2.2.2 "an open arrowhead"）：两翼开口 V 线 */
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

/** 实心圆头（授权需求端头，规范 §6.2.2.3 "a filled circular head"） */
export function appendCircleHead(
  visuals: SVGElement,
  tip: { x: number; y: number },
  stroke: string
): void {
  const circle = create('circle');
  attr(circle, { cx: tip.x - 4, cy: tip.y, r: 4, fill: stroke, stroke: 'none' });
  append(visuals, circle);
}

function drawPath(visuals: SVGElement, d: string, theme: StyleTheme, strokeWidth = LINE_WIDTH): void {
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
