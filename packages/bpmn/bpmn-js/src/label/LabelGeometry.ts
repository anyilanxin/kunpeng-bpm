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
 * 标签几何 —— 渲染与 XML 导出的唯一标签定位来源（保证所见=所存）。
 * 全部返回"相对宿主元素原点"的局部坐标：渲染在元素 gfx 组内（组自带 translate），
 * 直编与 XML 导出等画布级消费方须自行加回宿主 x/y。
 */
import type TextUtil from 'diagram-js/lib/util/Text';

/** 外部标签排版：宽度上限 92（自有取值：约 7 个 12px 汉字，读起来不换行过多） */
export const EXTERNAL_LABEL_WIDTH = 92;
export const EXTERNAL_FONT = { fontFamily: 'system-ui, sans-serif', fontSize: 11 };
export const INTERNAL_FONT = { fontFamily: 'system-ui, sans-serif', fontSize: 12 };

/** 事件/网关外部标签：形心正下方，间距 6（自有取值） */
const EXTERNAL_GAP = 6;

export interface LabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function externalLabelBox(textUtil: TextUtil, text: string, host: { x: number; y: number; width: number; height: number }): LabelBox | null {
  if (!text) {
    return null;
  }
  const dims = textUtil.getDimensions(text, {
    box: { width: EXTERNAL_LABEL_WIDTH, height: 40 },
    style: EXTERNAL_FONT,
    padding: 0
  });
  return {
    x: host.width / 2 - dims.width / 2,
    y: host.height + EXTERNAL_GAP,
    width: dims.width,
    height: dims.height
  };
}

/** 连线标签：取首末航点中点（自有取值：中段视觉均衡） */
export function connectionLabelBox(textUtil: TextUtil, text: string, waypoints: { x: number; y: number }[]): LabelBox | null {
  if (!text || waypoints.length === 0) {
    return null;
  }
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  const dims = textUtil.getDimensions(text, {
    box: { width: EXTERNAL_LABEL_WIDTH, height: 40 },
    style: EXTERNAL_FONT,
    padding: 0
  });
  const mid = { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
  return {
    x: mid.x - dims.width / 2,
    y: mid.y - dims.height / 2 - 6,
    width: dims.width,
    height: dims.height
  };
}

/** 任务族内部标签：形内居中（内边距 8/6，自有取值） */
export function internalLabelBox(shape: { x: number; y: number; width: number; height: number }): LabelBox {
  const padX = 8;
  const padY = 6;
  return {
    x: padX,
    y: padY,
    width: Math.max(shape.width - padX * 2, 10),
    height: Math.max(shape.height - padY * 2, 10)
  };
}

/** 标签元素最小命中/占位尺寸（与 ExternalLabelBehavior 同值约定：一行 11px 文字高度） */
export const LABEL_MIN = 12;

/**
 * 外部标签元素的绝对坐标框（元素创建/导入建标签的默认几何）：
 * 连线=首末航点中点；形状=形心正下方派生；空文本给可命中的占位框
 * （隐藏态，写入文本时再按文字量收敛）。位置被拖动后以宿主
 * di.label.bounds 为准，不再走此派生。
 */
export function absoluteLabelBox(
  textUtil: TextUtil,
  host: { x: number; y: number; width: number; height: number; waypoints?: { x: number; y: number }[] },
  text: string | undefined
): LabelBox {
  if (host.waypoints) {
    const box = connectionLabelBox(textUtil, text || ' ', host.waypoints);
    if (box) {
      return { x: box.x, y: box.y, width: Math.max(box.width, LABEL_MIN), height: Math.max(box.height, LABEL_MIN) };
    }
  }
  const local = text ? externalLabelBox(textUtil, text, host) : null;
  if (local) {
    return {
      x: host.x + local.x,
      y: host.y + local.y,
      width: Math.max(local.width, LABEL_MIN),
      height: Math.max(local.height, LABEL_MIN)
    };
  }
  return { x: host.x + host.width / 2 - LABEL_MIN, y: host.y + host.height + EXTERNAL_GAP, width: LABEL_MIN * 2, height: LABEL_MIN };
}
