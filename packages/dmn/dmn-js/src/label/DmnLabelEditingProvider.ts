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
 * 名称直编 Provider（diagram-js-direct-editing 契约 {activate, update}）。
 *
 * 编辑带形态（对齐 bpmn 线直编三式的 DMN 子集，2026-10-26 定稿隐形观感）：
 * - DRG 形状（Decision/BKM/InputData/KS）：编辑框=整元素（透明无边框，点击
 *   元素任意处即聚焦；文字垂直居中=渲染 center-middle，内容左右垫 10 保持
 *   换行宽与渲染排版同宽——渲染内容盒 x5 宽-10，所见即所得）；
 * - 注记：隐形框只在内容位置（括号右侧起排，与渲染左上锚同位）；
 * - 连线不可编（DMN 无连线标签体系）。
 * 编辑期已渲染名字由 DmnEditingBehavior 以 label-editing marker 藏去。
 *
 * 坐标契约：TextBox 把 bounds 直接当画布容器 CSS 像素（不做视口变换），
 * 先按模型坐标算框，出口统一经 canvas.getAbsoluteBBox 仿射到视口坐标，
 * 字号随缩放同步（下限 8px 保可读）。
 */
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { DmnMode } from '../mode/DmnMode';
import { getBusinessObject } from '../util/ModelUtil';

/** 形内名字字体（与渲染器 INTERNAL_FONT 同源：12px 是尺寸体系输入） */
const INTERNAL_FONT = { fontFamily: 'system-ui, "PingFang SC", sans-serif', fontSize: 12 } as const;

/** 隐形编辑框样式（TextBox 默认内联白底/#ccc 边须显式覆盖；皮肤全靠内联下发） */
const TRANSPARENT_STYLE = { backgroundColor: 'transparent', border: 'none' } as const;

/** 编辑字号缩放下限：过小无法读/选 */
const MIN_EDIT_FONT = 8;

interface ActivateContext {
  bounds: { x: number; y: number; width: number; height: number };
  text: string;
  style: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export class DmnLabelEditingProvider {
  static $inject = ['directEditing', 'canvas', 'modeling', 'dmnMode'];

  constructor(
    directEditing: any,
    private readonly canvas: Canvas,
    private readonly modeling: any,
    private readonly dmnMode: DmnMode
  ) {
    directEditing.registerProvider(this);
  }

  activate(element: any): ActivateContext | null {
    // 预览模式拒绝直编（只读）；连线不可编（DMN 无连线标签体系）
    if (!this.dmnMode.isEditable() || element.waypoints) {
      return null;
    }
    const bo = getBusinessObject(element);
    if (!bo?.$type?.startsWith('dmn:')) {
      return null;
    }

    const isAnnotation = bo.$type === 'dmn:TextAnnotation';
    const text = isAnnotation ? bo.text : bo.name;

    // 注记：内容框在括号右侧起排（与渲染 box x18/内垫同构取 5+24-14 收敛值，
    // 视觉与渲染文字左上对齐）；DRG 形状：整元素隐形框 + 垂直居中
    const box = isAnnotation
      ? { x: element.x + 5, y: element.y + 6, width: element.width - 10, height: element.height - 12 }
      : { ...element };

    const style: Record<string, unknown> = {
      ...INTERNAL_FONT,
      ...TRANSPARENT_STYLE,
      textAlign: isAnnotation ? 'left' : 'center',
      padding: isAnnotation ? '3px 2px' : '3px 10px'
    };
    const options: Record<string, unknown> = isAnnotation ? {} : { centerVertically: true };
    return this.toViewport(box, text, style, options);
  }

  update(element: any, newText: string): void {
    this.modeling.updateLabel(element, newText?.trim() || '');
  }

  /**
   * 模型框 → 视口 CSS 框（TextBox 消费坐标）：getAbsoluteBBox 仿射位置与
   * 尺寸；字号随 zoom 同步缩放，维持"编辑所见≈最终渲染"。
   */
  private toViewport(
    box: { x: number; y: number; width: number; height: number },
    text: string | undefined,
    style: Record<string, unknown>,
    options: Record<string, unknown>
  ): ActivateContext {
    const zoom = this.canvas.zoom();
    const fontSize = Number(style.fontSize) || 12;
    return {
      // 运行时 getAbsoluteBBox 对纯 bbox 走仿射分支（已核 Canvas 源，bpmn 线同款）
      bounds: this.canvas.getAbsoluteBBox(box as any),
      text: text || '',
      // fontSize 须带单位：CSS 赋值裸数字无效（回落继承字体）
      style: { ...style, fontSize: Math.max(fontSize * zoom, MIN_EDIT_FONT) + 'px' },
      options
    };
  }
}
