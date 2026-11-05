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
 * 表达式切换弹框（用户定规 2026-10-27）：context pad「切换表达式」钮打开；
 * **弹框只列可切目标**（当前项不出现——当前处理 a 时只列 b/c，家族替换菜单惯例）。
 * - BKM：Literal expression / Empty（Empty=无下钻角标）
 * - Decision：Decision table / Literal expression / Empty（Empty=无下钻角标）
 * 切换走 modeling.switch*（命令栈可撤销，element.changed 令角标即时增删）。
 */
import type PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import type { DmnModeling } from '../command/DmnModeling';
import { bkmExpressionMode, decisionExpressionMode } from '../meta/ElementTypes';
import { dmnIconBody } from '../icons/DmnIconSet';

export const EXPRESSION_MENU_ID = 'dmn-expression-mode';

/** 弹框条目内联图标（截图定规：Empty=✕、Literal={}、Decision table=网格） */
function entryIcon(kind: 'empty' | 'literal' | 'table'): string {
  if (kind === 'empty') {
    return '<svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 8 L24 24 M24 8 L8 24" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
  }
  if (kind === 'literal') {
    return '<svg viewBox="0 0 32 32" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 6 C6 6 6 10 6 12 C6 15 4 16 3 16 C4 16 6 17 6 20 C6 22 6 26 10 26 M22 6 C26 6 26 10 26 12 C26 15 28 16 29 16 C28 16 26 17 26 20 C26 22 26 26 22 26"/></svg>';
  }
  return `<svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor" aria-hidden="true"><g transform="scale(${20 / 32})">${dmnIconBody('drd')}</g></svg>`;
}

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
    const type = target?.businessObject?.$type;

    if (type === 'dmn:BusinessKnowledgeModel') {
      const current = bkmExpressionMode(target.businessObject);
      const to = (mode: 'literal' | 'empty') => () => this.modeling.switchBkmExpression(target, mode);
      const entries: Record<string, unknown> = {};
      if (current !== 'literal') {
        entries.literal = {
          label: t('Literal expression'),
          className: 'dmn-expression-entry-literal',
          imageHtml: entryIcon('literal'),
          action: to('literal')
        };
      }
      if (current !== 'empty') {
        entries.empty = {
          label: t('Empty'),
          className: 'dmn-expression-entry-empty',
          imageHtml: entryIcon('empty'),
          action: to('empty')
        };
      }
      return entries;
    }

    // Decision（三态：Decision table / Literal expression / Empty）——当前项不列（弹框只列可切目标）
    const current = decisionExpressionMode(target.businessObject);
    const to = (mode: 'table' | 'literal' | 'empty') => () => this.modeling.switchDecisionExpression(target, mode);
    const entries: Record<string, unknown> = {};
    if (current !== 'table') {
      entries.table = {
        label: t('Decision table'),
        className: 'dmn-expression-entry-table',
        imageHtml: entryIcon('table'),
        action: to('table')
      };
    }
    if (current !== 'literal') {
      entries.literal = {
        label: t('Literal expression'),
        className: 'dmn-expression-entry-literal',
        imageHtml: entryIcon('literal'),
        action: to('literal')
      };
    }
    if (current !== 'empty') {
      entries.empty = {
        label: t('Empty'),
        className: 'dmn-expression-entry-empty',
        imageHtml: entryIcon('empty'),
        action: to('empty')
      };
    }
    return entries;
  }
}
