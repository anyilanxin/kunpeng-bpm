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
 * 文本注记行为：宽度唯一可调维度、高度按文字实测自适应收敛、选中手柄仅留横向两枚（可被插件覆盖的独立行为）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { SIZES } from '../meta/ElementTypes';
import { trimResizeHandles } from '@kunpeng-io/kernel-shared';

/**
 * 文本注记横向调整 + 高度自适应：
 * - 宽度是注记唯一可调维度（换行由宽度决定）；高度不进命令栈，渲染后按
 *   文字实测 bbox 收敛回写（shape + DI 同步），幂等——高相等即停，revert
 *   resize 后按恢复的宽度重算自然收敛；
 * - 引擎默认给选中形状加八向手柄，注记仅保留 w/e 纯横向两枚（其余移除，
 *   与规则层方向拒绝互为表里）。
 * 两个钩子都取 200 优先级（引擎默认 1000 为大者先执行）：确保跑在重画/
 * 手柄添加之后，读到的 bbox / DOM 是最新态。
 */
export class TextAnnotationBehavior {
  static $inject = ['eventBus', 'elementRegistry'];

  constructor(private readonly eventBus: EventBus, private readonly elementRegistry: ElementRegistry) {
    this.eventBus.on('element.changed', 200, (e: any) => this.fitHeight(e.element));
    this.eventBus.on('selection.changed', 200, (e: any) => this.trimHandles(e.newSelection));
  }

  private fitHeight(element: any): void {
    if (element?.businessObject?.$type !== 'bpmn:TextAnnotation') {
      return;
    }
    const gfx = this.elementRegistry.getGraphics(element.id);
    const label = gfx?.querySelector('.djs-visual text') as SVGGraphicsElement | null | undefined;
    // 高 = 文字实测高 + 上下留白 8 + 视觉余量 4；空文字回落默认高 40
    const contentH = label?.getBBox().height ?? 0;
    const target = Math.max(SIZES.ANNOTATION_H, Math.ceil(contentH + 12));
    if (target === element.height) {
      return;
    }
    element.height = target;
    if (element.di?.bounds) {
      element.di.bounds.height = target;
    }
    this.eventBus.fire('element.changed', { element });
  }

  private trimHandles(selection: any[]): void {
    const shape = selection?.length === 1 ? selection[0] : null;
    if (shape?.businessObject?.$type !== 'bpmn:TextAnnotation') {
      return;
    }
    trimResizeHandles('we');
  }
}
