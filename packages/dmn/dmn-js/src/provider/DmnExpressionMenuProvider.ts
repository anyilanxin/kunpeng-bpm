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
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * BKM 表达式切换弹框（用户定规 2026-10-26）：context pad「切换表达式」钮
 * 打开，两选项 Literal expression / Empty（当前模式置灰，家族替换菜单惯例）；
 * Empty=不可下钻（左上角无角标）。切走走 modeling.switchBkmExpression
 * （命令栈可撤销，element.changed 令角标即时增删）。
 */
import type PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import type { DmnModeling } from '../command/DmnModeling';
import { bkmExpressionMode } from '../meta/ElementTypes';

export const EXPRESSION_MENU_ID = 'dmn-bkm-expression';

export class DmnExpressionMenuProvider {
  static $inject = ['popupMenu', 'modeling', 'dmnI18n'];

  static readonly PRIORITY = 1000;

  constructor(
    popupMenu: PopupMenu,
    private readonly modeling: DmnModeling,
    private readonly i18n: { t(s: string): string }
  ) {
    popupMenu.registerProvider(EXPRESSION_MENU_ID, DmnExpressionMenuProvider.PRIORITY, this as never);
  }

  getPopupMenuEntries(target: any): Record<string, unknown> {
    const t = this.i18n.t.bind(this.i18n);
    const current = bkmExpressionMode(target.businessObject);
    const switchTo = (mode: 'literal' | 'empty') => () => this.modeling.switchBkmExpression(target, mode);
    return {
      literal: {
        label: t('Literal expression'),
        className: 'dmn-expression-entry-literal',
        disabled: current === 'literal',
        action: switchTo('literal')
      },
      empty: {
        label: t('Empty'),
        className: 'dmn-expression-entry-empty',
        disabled: current === 'empty',
        action: switchTo('empty')
      }
    };
  }
}
