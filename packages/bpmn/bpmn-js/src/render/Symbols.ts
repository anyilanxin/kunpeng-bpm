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
 * BPMN 记法符号库。
 *
 * 形状框（事件圆/网关菱形/任务盒/数据件轮廓）为依据规范记法文字描述自行设计
 * 的描边几何（规范不定义像素路径）；框内字形类标记（事件符号/网关标记/任务
 * 字标/循环/多实例标记行）一律取标准图标集的内部字形（icons/IconSet glyph*
 * 键，见 iconSetGlyph）——面板图标与画布字形同源（2026-10-21 全量一致性核对），
 * 带框整元素剪影不入画布（画布框遵循规范记法描边）。
 * - 事件符号取自对应事件图标（捕获=空心变体，抛出=实心变体，规范 §10.3）；
 * - 网关标记取自对应网关图标（X / + / O / 双圆，规范 §10.4.2-§10.4.5）；
 * - 任务族字标置于任务盒左上角（规范 §10.3 标记位约定，面板记法图标同位，见 icons/BpmnIcons）。
 */
import { append, create, attr } from 'tiny-svg';
import { GLYPH_CENTERS, iconSetAsset, type IconSetKey } from '../icons/IconSet';

export interface StyleTheme {
  stroke: string;
  fill: string;
  labelColor: string;
}

/**
 * 图标集剪影字形（标准图标集 path，"面板=画布"基准）：以 (cx,cy) 为中心、
 * 边长 box 等比缩放填充（按资产自身 viewBox 宽计算系数；glyph* 资产已归一
 * 100 方盒并保留纵横比）。用于事件符号/网关标记/任务字标/循环标记行等框内
 * 字形；带框整元素剪影不入画布——画布形状框遵循 BPMN 规范描边记法（见文件头）。
 *
 * 居中按墨迹中心（GLYPH_CENTERS）而非归一盒中心——字形紧 bbox 贴盒原点
 * 归一，窄高/横宽形的墨迹中心偏离盒中心，按盒中心平移会系统性偏心。
 */
/**
 * 字形资产解析缓存：同一 key 的 SVG 片段只解析一次，后续绘制走 cloneNode
 * （重绘风暴下避免逐元素重复 innerHTML 解析；缓存体为离屏 <g> 模板）。
 */
const glyphTemplates = new Map<IconSetKey, SVGElement>();

function glyphTemplate(key: IconSetKey): SVGElement {
  let template = glyphTemplates.get(key);
  if (!template) {
    template = create('g');
    template.innerHTML = iconSetAsset(key).body;
    glyphTemplates.set(key, template);
  }
  return template;
}

function iconSetGlyph(g: Element, key: IconSetKey, cx: number, cy: number, box: number, fill: string): void {
  const asset = iconSetAsset(key);
  const k = box / asset.w;
  const c = GLYPH_CENTERS[key] ?? { x: asset.w / 2, y: asset.h / 2 };
  const group = create('g');
  attr(group, {
    transform: `translate(${(cx - c.x * k).toFixed(2)} ${(cy - c.y * k).toFixed(2)}) scale(${k.toFixed(5)})`,
    fill
  });
  const template = glyphTemplate(key);
  for (let i = 0; i < template.childNodes.length; i++) {
    group.appendChild(template.childNodes[i].cloneNode(true));
  }
  append(g, group);
}

/** 在组内画路径 */
function path(g: Element, d: string, stroke: string, fill: string, strokeWidth = 1.6): any {
  const p = create('path');
  attr(p, { d, fill, stroke, 'stroke-width': strokeWidth, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  return append(g, p) as any;
}

/** 在组内画线段（面板记法图标亦复用，见 icons/BpmnIcons） */
export function line(g: Element, x1: number, y1: number, x2: number, y2: number, stroke: string, w = 1.4): any {
  const l = create('line');
  attr(l, { x1, y1, x2, y2, stroke, 'stroke-width': w, 'stroke-linecap': 'round' });
  return append(g, l) as any;
}

/** 在组内画圆（面板记法图标亦复用，见 icons/BpmnIcons） */
export function circle(g: Element, cx: number, cy: number, r: number, stroke: string, fill: string, w = 1.6): any {
  const c = create('circle');
  attr(c, { cx, cy, r, fill, stroke, 'stroke-width': w });
  return append(g, c) as any;
}

/** 网关菱形闭合路径（纯几何串；画布连线端点与主体同源消费） */
export function diamondPath(cx: number, cy: number, hw: number, hh: number): string {
  return `M${cx},${cy - hh} L${cx + hw},${cy} L${cx},${cy + hh} L${cx - hw},${cy} Z`;
}

/** 网关菱形主体（描边 2；面板记法图标同源调用，保证"面板=画布"逐路径一致） */
export function drawGatewayShape(g: Element, width: number, height: number, theme: StyleTheme): void {
  const diamond = create('path');
  attr(diamond, {
    d: diamondPath(width / 2, height / 2, width / 2, height / 2),
    fill: theme.fill,
    stroke: theme.stroke,
    'stroke-width': 2
  });
  append(g, diamond);
}

const N = (v: number): string => v.toFixed(2);

/** 事件符号字形键（捕获=空心变体，源自对应 start-event/catch 图标内部字形） */
const EVENT_GLYPH: Record<string, IconSetKey> = {
  message: 'glyphEventMessage',
  timer: 'glyphEventTimer',
  error: 'glyphEventError',
  escalation: 'glyphEventEscalation',
  signal: 'glyphEventSignal',
  terminate: 'glyphEventTerminate',
  conditional: 'glyphEventConditional',
  link: 'glyphEventLink',
  multiple: 'glyphEventMultiple',
  parallelMultiple: 'glyphEventParallelMultiple',
  cancel: 'glyphEventCancel',
  compensation: 'glyphEventCompensation'
};

/** 抛出语义实心变体（规范 §10.3 抛出=实心）：message/escalation/signal/link/error/multiple/cancel/compensation 有双态 */
const EVENT_GLYPH_THROW: Partial<Record<string, IconSetKey>> = {
  message: 'glyphEventMessageThrow',
  escalation: 'glyphEventEscalationThrow',
  signal: 'glyphEventSignalThrow',
  link: 'glyphEventLinkThrow',
  error: 'glyphEventErrorThrow',
  multiple: 'glyphEventMultipleThrow',
  cancel: 'glyphEventCancelThrow',
  compensation: 'glyphEventCompensationThrow'
};

/** 字形边长系数（自有取值）：按图标集 32 视框内「字形紧bbox / 内环 28.5」占比换算到画布内径 r */
const EVENT_GLYPH_BOX: Record<string, number> = {
  message: 1.02,
  timer: 1.07,
  error: 0.96,
  escalation: 0.99,
  signal: 0.96,
  terminate: 1.14,
  conditional: 0.95,
  link: 0.97,
  multiple: 1.07,
  parallelMultiple: 0.97,
  cancel: 0.99,
  compensation: 1.02
};

/** 事件定义符号：绘制在事件圆心 (cx,cy)，内径 r；抛出语义（结束/中间抛出）取实心变体 */
export function drawEventSymbol(
  g: Element,
  symbol: string,
  cx: number,
  cy: number,
  r: number,
  theme: StyleTheme,
  throwSemantics = false
): void {
  const key = (throwSemantics ? EVENT_GLYPH_THROW[symbol] : undefined) ?? EVENT_GLYPH[symbol];
  if (!key) {
    return;
  }
  iconSetGlyph(g, key, cx, cy, r * EVENT_GLYPH_BOX[symbol], theme.stroke);
}

/** 网关标记字形键（源自对应 gateway 图标内部字形） */
const GATEWAY_GLYPH: Record<string, IconSetKey> = {
  exclusive: 'glyphGatewayXor',
  parallel: 'glyphGatewayParallel',
  inclusive: 'glyphGatewayInclusive',
  eventBased: 'glyphGatewayEventBased',
  complex: 'glyphGatewayComplex',
  /** 实例化事件网关（规范 §10.6.6）：标记=多实例开始事件记法（五边形） */
  eventBasedInstantiate: 'glyphEventMultiple',
  /** 并行事件网关（instantiate+eventGatewayType=Parallel）：标记=并行多实例记法（开口加号） */
  eventBasedParallel: 'glyphEventParallelMultiple'
};

/** 字形边长系数（自有取值）：按图标集「字形紧bbox / 菱形 32」占比换算，h=菱形半宽×0.72 */
const GATEWAY_GLYPH_BOX: Record<string, number> = {
  exclusive: 1.06,
  parallel: 1.41,
  inclusive: 1.29,
  eventBased: 1.33,
  complex: 0.88,
  eventBasedInstantiate: 1.07,
  eventBasedParallel: 0.97
};

/** 网关标记：菱形中心 (cx,cy)，标记半区 h（渲染器传入菱形半宽×0.72） */
export function drawGatewayMarker(g: Element, type: string, cx: number, cy: number, h: number, theme: StyleTheme): void {
  const key = GATEWAY_GLYPH[type];
  if (!key) {
    return;
  }
  iconSetGlyph(g, key, cx, cy, h * GATEWAY_GLYPH_BOX[type], theme.stroke);
}

/** 任务族字标字形键（源自对应任务图标内部字形，实心/空心随图标：send 实心信封、receive 空心信封） */
const TASK_GLYPH: Record<string, IconSetKey> = {
  taskUser: 'glyphTaskUser',
  taskService: 'glyphTaskService',
  taskScript: 'glyphTaskScript',
  taskManual: 'glyphTaskManual',
  taskSend: 'glyphTaskSend',
  taskReceive: 'glyphTaskReceive',
  taskBusinessRule: 'glyphTaskBusinessRule'
};

/** 字形边长系数（自有取值）：按图标集「字形紧bbox / 任务内框 28」占比，作用于标记区半尺寸 s */
const TASK_GLYPH_BOX: Record<string, number> = {
  taskUser: 1.5,
  taskService: 1.65,
  taskScript: 1.6,
  taskManual: 1.9,
  taskSend: 1.75,
  taskReceive: 1.75,
  taskBusinessRule: 1.2
};

/** 任务族标记字形（画布与面板图标共用，保证"面板=画布"）：中心 (cx,cy)，半尺寸 s */
export function taskGlyph(g: Element, symbol: string, cx: number, cy: number, s: number, theme: StyleTheme): void {
  const key = TASK_GLYPH[symbol];
  if (!key) {
    return;
  }
  iconSetGlyph(g, key, cx, cy, s * TASK_GLYPH_BOX[symbol], theme.stroke);
}

/** 任务族标记：任务盒左上角（规范 §10.3 标记位），字形与面板记法图标共用 taskGlyph。
 * 墨迹边长统一取任务高的 25%（自有取值：78px 任务→约 19.5px，实测 22% 以下
 * 在常规缩放下存在感不足、与主流建模器对比明显偏小），并按各字形紧 bbox
 * 系数反推标记区半尺寸，保证不同标记墨迹视觉大小一致（此前统一半尺寸时
 * user 与 manual 墨迹相差近 30%）。
 */
export function drawTaskMarker(g: Element, symbol: string, shape: { x: number; y: number; width: number; height: number }, theme: StyleTheme): void {
  const visual = Math.min(21, shape.height * 0.25);
  const cx = visual / 2 + 7;
  const cy = visual / 2 + 7;
  taskGlyph(g, symbol, cx, cy, visual / TASK_GLYPH_BOX[symbol], theme);
}

/** 折叠子流程标记：底部中央 [+] 方块（规范：折叠 SP 显示加号框）；cx 可选——与循环标记并存时错开成标记行 */
export function drawCollapsedMarker(g: Element, shape: { width: number; height: number }, theme: StyleTheme, cx?: number): void {
  const size = 16;
  const x = (cx ?? shape.width / 2) - size / 2;
  const y = shape.height - size / 2 - 2;
  path(g, `M${N(x)},${N(y)} h${N(size)} v${N(size)} h${N(-size)} Z`, theme.stroke, '#fff', 1.4);
  line(g, x + size / 2, y + 4, x + size / 2, y + size - 4, theme.stroke, 1.7);
  line(g, x + 4, y + size / 2, x + size - 4, y + size / 2, theme.stroke, 1.7);
}

/** 数据对象：纸盒 + 右上折角（规范 §10.3.1 Artifacts） */
export function drawDataObjectShape(g: Element, shape: { x: number; y: number; width: number; height: number }, theme: StyleTheme): void {
  // 局部坐标（gfx 组自带 translate）
  const { width, height } = shape;
  const x = 0;
  const y = 0;
  const fold = Math.min(12, width * 0.35);
  path(
    g,
    `M${N(x)},${N(y)} h${N(width - fold)} L${N(x + width)},${N(y + fold)} v${N(height - fold)} h${N(-width)} Z`,
    theme.stroke,
    theme.fill === 'none' ? 'none' : '#fff',
    1.8
  );
  path(g, `M${N(x + width - fold)},${N(y)} v${N(fold)} h${N(fold)}`, theme.stroke, 'none', 1.4);
}

/** 文本注记：左侧开口括号（规范 Text Annotation 记法；横勾 10px/线宽 2px 对齐用户参考规格样例） */
export function drawAnnotationBracket(g: Element, shape: { x: number; y: number; width: number; height: number }, theme: StyleTheme): void {
  const { height } = shape;
  const x = 0;
  const y = 0;
  const arm = 10;
  path(g, `M${N(x + arm)},${N(y)} H${N(x)} V${N(y + height)} H${N(x + arm)}`, theme.stroke, 'none', 2);
}

/** 数据存储：椭圆柱 + 两道刻痕弧（规范 §10.3.1 DataStoreReference 记法）。几何为自有取值：顶椭圆扁比 ry≈高 14%（规范示例为扁椭圆），刻痕与顶椭圆同曲率。 */
export function drawDataStoreShape(g: Element, shape: { x: number; y: number; width: number; height: number }, theme: StyleTheme): void {
  const { width, height } = shape;
  const rx = width / 2;
  const ry = Math.min(7, height * 0.14);
  const top = ry + 1;
  const bottom = height - ry - 1;
  // 柱体：左壁 → 底半椭圆（下凸）→ 右壁 → 顶椭圆下半（下凸）闭合
  path(
    g,
    `M0,${N(top)} V${N(bottom)} A${N(rx)},${N(ry)} 0 0 0 ${N(width)},${N(bottom)} V${N(top)} ` +
      `A${N(rx)},${N(ry)} 0 0 1 0,${N(top)} Z`,
    theme.stroke,
    theme.fill === 'none' ? 'none' : '#fff',
    1.8
  );
  // 顶椭圆完整描边（上下两半均覆盖）
  const ellipseEl = create('ellipse');
  attr(ellipseEl, { cx: N(rx), cy: N(top), rx: N(rx), ry: N(ry), fill: theme.fill === 'none' ? 'none' : '#fff', stroke: theme.stroke, 'stroke-width': 1.8 });
  append(g, ellipseEl);
  // 两道刻痕：顶椭圆下方的前半弧（下凸），间距取 2.6×ry（规范示例等距刻痕）
  for (const dy of [ry * 2.4, ry * 4.2]) {
    const y = top + dy;
    if (y < bottom - ry * 0.6) {
      path(g, `M0,${N(y)} A${N(rx)},${N(ry)} 0 0 0 ${N(width)},${N(y)}`, theme.stroke, 'none', 1.3);
    }
  }
}

/** 活动循环特性标记种类（规范 §10.2.2）：标准循环 ↻ / 多实例并行 ‖‖‖ / 多实例顺序 ≡ */
export type LoopMarkerKind = 'loop' | 'parallel' | 'sequential';

/**
 * 活动 loopCharacteristics 标记：底部中央标记行（规范 §10.3.1）。
 * 标记字形=标准图标集剪影（markerLoop 环形箭头 / markerMiParallel 三竖条 /
 * markerMiSequential 三横条，icons/IconSet 同源），边长 14——与折叠 [+] 方块 16
 * 同族略小，保持标记行两级视觉。cx 可选：与折叠 [+] 并存时错开。
 */
export function drawLoopMarker(g: Element, shape: { width: number; height: number }, kind: LoopMarkerKind, theme: StyleTheme, cx?: number): void {
  const centerX = cx ?? shape.width / 2;
  const bottom = shape.height - 4;
  const key: IconSetKey = kind === 'loop' ? 'markerLoop' : kind === 'parallel' ? 'markerMiParallel' : 'markerMiSequential';
  iconSetGlyph(g, key, centerX, bottom - 7, 14, theme.stroke);
}

/** 补偿活动标记（规范 §10.5：底部标记行双三角）：图标集 markerCompensation 剪影同源 */
export function drawCompensationMarker(g: Element, cx: number, bottom: number, theme: StyleTheme): void {
  iconSetGlyph(g, 'markerCompensation', cx, bottom - 7, 14, theme.stroke);
}

/**
 * Ad-hoc 子流程标记（规范 §10.5.5：底部波浪号 ~）。图标集无此资产——
 * 按规范记法文字自绘描边几何（与外框同属规范描边层，非图标集字形；
 * 待图标库补充资产后可替换为 iconSetGlyph 同源字形）。
 * 几何为自有取值：两段半圆弧拼成波浪，宽 16、高 6，圆帽描边与标记行同重。
 */
export function drawAdHocMarker(g: Element, cx: number, bottom: number, theme: StyleTheme): void {
  const w = 16;
  const h = 6;
  const x = cx - w / 2;
  const y = bottom - h - 2;
  path(
    g,
    `M${N(x)},${N(y + h)} A${N(w / 4)},${N(h)} 0 0 1 ${N(x + w / 2)},${N(y)} A${N(w / 4)},${N(h)} 0 0 1 ${N(x + w)},${N(y + h)}`,
    theme.stroke,
    'none',
    1.6
  );
}

/** 活动底部标记行内容（规范 §12.3.2：标记成组居中；折叠 [+] 为主锚） */
export interface ActivityMarkerRow {
  loop?: LoopMarkerKind;
  /** 补偿活动（forCompensation）：位于 [+] 左侧 */
  compensation?: boolean;
  /** Ad-hoc 子流程：位于 [+] 右侧 */
  adHoc?: boolean;
  /** 折叠子流程 [+] 方块 */
  collapsed?: boolean;
}

/**
 * 活动底部标记行（规范 §12.3.2：全部标记成组、整组居中于底边中央；
 * 补偿在 [+] 左、波浪号在 [+] 右）。间距 22（[+] 方块 16 + 6 间隙，自有取值）。
 */
export function drawActivityMarkerRow(
  g: Element,
  shape: { width: number; height: number },
  row: ActivityMarkerRow,
  theme: StyleTheme
): void {
  const items: Array<(cx: number) => void> = [];
  const bottom = shape.height - 4;
  if (row.compensation) {
    items.push((cx) => drawCompensationMarker(g, cx, bottom, theme));
  }
  if (row.loop) {
    items.push((cx) => drawLoopMarker(g, shape, row.loop!, theme, cx));
  }
  if (row.collapsed) {
    items.push((cx) => drawCollapsedMarker(g, shape, theme, cx));
  }
  if (row.adHoc) {
    items.push((cx) => drawAdHocMarker(g, cx, bottom, theme));
  }
  if (items.length === 0) {
    return;
  }
  const gap = 22;
  const startX = shape.width / 2 - ((items.length - 1) * gap) / 2;
  items.forEach((draw, i) => draw(startX + i * gap));
}

/**
 * 事务子流程边框（规范 §10.5.6：双线边框=外框 + 内框偏移）。偏移 5（自有取值：
 * 外框描边 2 与内框描边 1.5 之间留 1.5 视觉缝，环重接近事件双环比例）。
 */
export function drawTransactionBorder(
  g: Element,
  shape: { width: number; height: number },
  theme: StyleTheme
): void {
  const inset = 5;
  const outer = create('rect');
  attr(outer, {
    x: 0, y: 0, width: shape.width, height: shape.height,
    rx: 9, ry: 9,
    fill: theme.fill, stroke: theme.stroke, 'stroke-width': 2
  });
  append(g, outer);
  const inner = create('rect');
  attr(inner, {
    x: inset, y: inset,
    width: shape.width - inset * 2, height: shape.height - inset * 2,
    rx: 6, ry: 6,
    fill: 'none', stroke: theme.stroke, 'stroke-width': 1.5
  });
  append(g, inner);
}

