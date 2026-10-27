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
 * version 2 for more details (a copy is included in the licenses/ directory that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * context pad：DRG 形状上=连线工具/注记/删除（Decision/BKM 另有「切换表达式」
 * 钮——BKM：Literal expression/Empty；Decision：Decision table/Literal
 * expression/Empty，弹框当前项置灰）；连线=删除。连线类型由规则层按拖拽
 * 落点现型裁决（connectionTypeFor），pad 只给通用连线入口。
 */
import type ContextPad from 'diagram-js/lib/features/context-pad/ContextPad';
import type Modeling from 'diagram-js/lib/features/modeling/Modeling';
import type Create from 'diagram-js/lib/features/create/Create';
import type ElementFactory from 'diagram-js/lib/core/ElementFactory';
import type PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import { DmnElementFactory } from '../factory/DmnElementFactory';
import { SIZES } from '../meta/ElementTypes';
import { toolEntryHtml } from '../icons/ToolIcons';
import { EXPRESSION_MENU_ID } from './DmnExpressionMenuProvider';
import { REPLACE_MENU_ID, REPLACEABLE_FAMILIES } from './DmnReplaceMenuProvider';

export class DmnContextPadProvider {
  static $inject = ['contextPad', 'modeling', 'elementFactory', 'create', 'connect', 'popupMenu', 'dmnI18n'];

  static readonly PRIORITY = 1000;

  constructor(
    contextPad: ContextPad,
    private readonly modeling: Modeling,
    private readonly elementFactory: DmnElementFactory & ElementFactory,
    private readonly create: Create,
    private readonly connect: any,
    private readonly popupMenu: PopupMenu,
    private readonly i18n: { t(s: string): string }
  ) {
    contextPad.registerProvider(DmnContextPadProvider.PRIORITY, this as never);
  }

  getContextPadEntries(element: any): Record<string, unknown> {
    const t = this.i18n.t.bind(this.i18n);
    const entries: Record<string, unknown> = {};

    if (element.waypoints) {
      entries.delete = this.deleteEntry(element, t('删除'));
      return entries;
    }

    entries.connect = {
      group: 'connect',
      html: toolEntryHtml('connect'),
      title: t('连线（按落点自动裁决需求类型）'),
      action: {
        click: (event: Event, _e: unknown) => this.connect.start(event, element),
        dragstart: (event: Event, _e: unknown) => this.connect.start(event, element)
      }
    };

    const isExpressionCarrier = element.businessObject?.$type === 'dmn:Decision' ||
      element.businessObject?.$type === 'dmn:BusinessKnowledgeModel';
    if (isExpressionCarrier) {
      entries.switchExpression = {
        group: 'model',
        html: toolEntryHtml(element.businessObject?.$type === 'dmn:BusinessKnowledgeModel' ? 'business-knowledge' : 'decision'),
        title: t('切换表达式'),
        action: {
          click: (event: Event, _e: unknown) =>
            this.popupMenu.open(element, EXPRESSION_MENU_ID, this.menuPosition(event))
        }
      };
    }

    // ---- 替换类型（规则约束的互替：Decision⇄BKM、InputData⇄KS；扳手钮） ----
    if (element.businessObject?.$type && REPLACEABLE_FAMILIES[this.elementFactory.shapeMeta(element.businessObject.$type)?.replaceFamily ?? '']) {
      entries.replace = {
        group: 'edit',
        html: toolEntryHtml('wrench'),
        title: t('替换类型'),
        action: {
          click: (event: Event, _e: unknown) =>
            this.popupMenu.open(element, REPLACE_MENU_ID, this.menuPosition(event))
        }
      };
    }

    entries.annotate = {
      group: 'model',
      html: toolEntryHtml('note'),
      title: t('添加注记'),
      action: {
        click: (event: Event) => {
          const shape = this.elementFactory.createShape({
            type: 'dmn:TextAnnotation',
            width: SIZES.ANNOTATION_W,
            height: SIZES.ANNOTATION_H
          });
          this.create.start(event, shape, element);
        }
      }
    };

    entries.delete = this.deleteEntry(element, t('删除'));
    return entries;
  }

  /** 弹框锚点：触发钮的点击位（基座弹层自动收敛进视口） */
  private menuPosition(event: Event): { x: number; y: number } {
    const e = event as MouseEvent;
    return { x: e.clientX, y: e.clientY };
  }

  private deleteEntry(element: any, title: string): Record<string, unknown> {
    return {
      group: 'edit',
      html: toolEntryHtml('trash'),
      title,
      action: {
        click: () => this.modeling.removeElements([element])
      }
    };
  }
}
