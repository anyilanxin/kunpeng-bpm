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
 * 多选对齐 / 分布弹框菜单（菜单 id：bpmn-align）。
 * 六个对齐项 + 两个分布项同框分组展示，各自走规则门控——两个元素只有对齐，
 * 三个及以上才出现分布（BpmnRules.canAlignElements / canDistributeElements）。
 * 几何计算全部由 diagram-js 内置 AlignElements / DistributeElements 服务承担，
 * 条目只负责把选区翻译成 trigger 调用。
 */
import { alignIconHtml } from '@kunpeng-io/kernel-shared';

export class BpmnAlignMenuProvider {
  static readonly MENU_ID = 'bpmn-align';

  static $inject = ['popupMenu', 'alignElements', 'distributeElements', 'rules', 'bpmnI18n'];

  constructor(
    popupMenu: any,
    private readonly alignElements: any,
    private readonly distributeElements: any,
    private readonly rules: any,
    private readonly i18n: any
  ) {
    this.popupMenu = popupMenu;
    popupMenu.registerProvider(BpmnAlignMenuProvider.MENU_ID, this);
  }

  private readonly popupMenu: any;

  getPopupMenuEntries(target: any): Record<string, any> {
    // 多选 context pad 把整个选区作为 target 传入
    const elements = Array.isArray(target) ? target : [target];
    const entries: Record<string, any> = {};

    if (this.rules.allowed('elements.align', { elements }) !== false) {
      const titles: Record<string, string> = {
        left: '左对齐',
        center: '水平居中',
        right: '右对齐',
        top: '上对齐',
        middle: '垂直居中',
        bottom: '下对齐'
      };
      for (const alignment of ['left', 'center', 'right', 'top', 'middle', 'bottom'] as const) {
        entries[`align-${alignment}`] = {
          group: 'align',
          className: 'kp-align-menu-entry',
          title: this.i18n.t(titles[alignment]),
          imageHtml: alignIconHtml(`align-${alignment}`),
          action: () => {
            this.alignElements.trigger(elements, alignment);
            this.popupMenu.close();
          }
        };
      }
    }

    if (this.rules.allowed('elements.distribute', { elements }) !== false) {
      for (const direction of ['horizontal', 'vertical'] as const) {
        entries[`distribute-${direction}`] = {
          group: 'distribute',
          className: 'kp-align-menu-entry',
          title: this.i18n.t(direction === 'horizontal' ? '水平分布' : '垂直分布'),
          imageHtml: alignIconHtml(`distribute-${direction}`),
          action: () => {
            this.distributeElements.trigger(elements, direction);
            this.popupMenu.close();
          }
        };
      }
    }

    return entries;
  }
}
