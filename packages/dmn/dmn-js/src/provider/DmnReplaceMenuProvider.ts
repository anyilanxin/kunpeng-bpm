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
 * 替换菜单 Provider（用户定规 2026-10-27，参照 bpmn 线 BpmnReplaceMenuProvider）：
 * pad「替换类型」（扳手钮）→ 弹框（**规则约束的互替**——Decision⇄BKM 同族
 * invocable、InputData⇄KnowledgeSource 同族源/知识源；注记/连线不替）。
 * 当前元素置灰（家族替换菜单惯例）；动作走 modeling.replaceElement（可撤销）。
 * 条目名取类型注册表 label，图标=用户资产 dmnicons。
 */
import type PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import type { DmnElementTypes } from '../meta/ElementTypes';
import { metaId } from '../meta/ElementTypes';
import { DmnIcons } from '../icons/DmnIconSet';

export const REPLACE_MENU_ID = 'dmn-replace';

/** 可替换族（规则约束）：同 family 的互替——invocable（Decision/BKM）、source（InputData/KS） */
export const REPLACEABLE_FAMILIES: Record<string, string[]> = {
  invocable: ['dmn:Decision', 'dmn:BusinessKnowledgeModel'],
  source: ['dmn:InputData', 'dmn:KnowledgeSource']
};

export class DmnReplaceMenuProvider {
  static $inject = ['popupMenu', 'dmnElementTypes', 'modeling', 'dmnI18n'];

  static readonly PRIORITY = 1000;

  constructor(
    popupMenu: PopupMenu,
    private readonly elementTypes: DmnElementTypes,
    private readonly modeling: any,
    private readonly i18n: { t(s: string): string }
  ) {
    popupMenu.registerProvider(REPLACE_MENU_ID, DmnReplaceMenuProvider.PRIORITY, this as never);
  }

  getPopupMenuEntries(target: any): Record<string, unknown> {
    const t = this.i18n.t.bind(this.i18n);
    const bo = target?.businessObject;
    const type = bo?.$type;
    const meta = this.elementTypes.shapeMetaOf(type);
    if (!meta?.replaceFamily) {
      return {};
    }
    const candidates = REPLACEABLE_FAMILIES[meta.replaceFamily] ?? [];
    const entries: Record<string, unknown> = {};
    for (const candidateType of candidates) {
      if (candidateType === type) {
        continue;
      }
      const candidate = this.elementTypes.shapeMetaOf(candidateType);
      if (!candidate) {
        continue;
      }
      entries[`replace-${metaId(candidate)}`] = {
        label: t(candidate.label),
        className: 'dmn-replace-entry',
        imageHtml: `<span class="dmn-replace-icon">${DmnIcons.iconOfElement({ $type: candidateType }, 20)}</span>`,
        action: () => this.modeling.replaceElement(target, { type: candidateType })
      };
    }
    return entries;
  }
}
