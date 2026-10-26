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
 * 替换菜单 Provider（PopupMenu 组件 'dmn-replace'）：DRG 族四类互换
 * （Decision/BKM/InputData/KS）；DecisionService 虽登记同族但容器语义
 * P8 开放，暂不入菜单。动作走 modeling.replaceElement（连线语义收敛见
 * command/DmnReplaceHandler：矩阵复核 + 消亡连线摘除，可撤销）。
 */
import type { DmnElementTypes } from '../meta/ElementTypes';
import { metaId } from '../meta/ElementTypes';
import { dmnIconHtml } from '../icons/DmnIcons';
import { replaceTarget } from '../command/DmnReplaceHandler';
import type PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';

export class DmnReplaceMenuProvider {
  static $inject = ['popupMenu', 'dmnElementTypes', 'modeling', 'dmnI18n'];

  static readonly MENU_ID = 'dmn-replace';

  constructor(
    popupMenu: PopupMenu,
    private readonly elementTypes: DmnElementTypes,
    private readonly modeling: any,
    private readonly i18n: any
  ) {
    // 条目在每次 open() 现算（PopupMenu 契约），无缓存无须失效
    popupMenu.registerProvider(DmnReplaceMenuProvider.MENU_ID, this);
  }

  getPopupMenuEntries(target: any): Record<string, any> {
    const bo = target.businessObject;
    const meta = this.elementTypes.shapeMeta(bo?.$type);
    if (!meta?.replaceFamily) {
      return {};
    }
    const familyId = meta.replaceFamily;
    const entries: Record<string, any> = {};
    for (const candidate of this.elementTypes.replaceTargets(familyId)) {
      // 自身排除（$type 即身份）；DecisionService 容器语义 P8 开放暂不互换
      if (
        this.elementTypes.matchesElement(candidate, target) ||
        candidate.type === 'dmn:DecisionService'
      ) {
        continue;
      }
      entries[`replace-${metaId(candidate)}`] = {
        label: this.i18n.t(candidate.label),
        imageHtml: dmnIconHtml(candidate, 20),
        title: this.i18n.t(candidate.label),
        action: () => {
          this.modeling.replaceElement(target, replaceTarget(candidate));
        }
      };
    }
    return entries;
  }
}
