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
 * 命令：element.setColor —— 元素填充/描边颜色（bioc 命名空间 DI 属性）。
 *
 * 颜色存放在画布元素（element.colors），序列化为 DI 属性
 * bioc:fill / bioc:stroke（BPMN-in-Color 社区扩展惯例，规范外的通用互操作
 * 约定）；导入侧由 Reader/Builder 建到元素上。未设置的字段传 undefined =
 * 清除该字段（渲染回落主题缺省）。
 */
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';

export interface ElementColors {
  fill?: string;
  stroke?: string;
}

export class SetColorHandler implements CommandHandler {
  execute(context: any): any[] {
    // context 由 BpmnModeling.setColor 构造（elements 恒为数组、colors 恒有值），
    // 异常形态让 TypeError 直接抛出（禁止兜底）
    const elements: any[] = context.elements;
    const colors: ElementColors = context.colors;
    const next: ElementColors = {
      ...(colors.fill !== undefined ? { fill: colors.fill } : {}),
      ...(colors.stroke !== undefined ? { stroke: colors.stroke } : {})
    };

    context.oldColors = {};
    elements.forEach((element) => {
      const old = element.colors;
      context.oldColors[element.id] = old ? { ...old } : undefined;
      // 全空 = 移除字段（元素回落主题缺省，序列化不写 bioc 属性）
      element.colors = Object.keys(next).length > 0 ? next : undefined;
    });
    return this.changed(elements);
  }

  revert(context: any): any[] {
    context.elements.forEach((element: any) => {
      const old = context.oldColors[element.id];
      element.colors = old ? { ...old } : undefined;
    });
    return this.changed(context.elements);
  }

  /** 脏标记范围 = 元素 + 其外部标签（标签字色派生自宿主有效描边色，
   * 宿主变色不改标签自身 colors，须一并重绘才能跟色） */
  private changed(elements: any[]): any[] {
    const all = new Set<any>();
    for (const element of elements) {
      all.add(element);
      for (const label of element.labels ?? []) {
        all.add(label);
      }
    }
    return [...all];
  }
}
