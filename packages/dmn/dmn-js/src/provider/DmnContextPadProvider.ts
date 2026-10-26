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
 * 上下文面板 Provider：追加族（按端点矩阵派生合法目标+连线类型）/ 注记 /
 * 替换 / 删除 / 连线。
 *
 * 追加目标不是写死清单：对每个注册表形状跑 requirementBetween 矩阵（当前
 * 元素作 source）——追加即"建一个能连回来的元素"，连线类型同源裁决（矩阵
 * 单一事实源）；注记对任意形状可加（经 Association）。DecisionService 容器
 * P8 开放，追加目标暂不含。
 */
import type { DmnElementTypes, ShapeTypeMeta } from '../meta/ElementTypes';
import { metaId, requirementBetween } from '../meta/ElementTypes';
import { dmnEntryHtml } from '../icons/DmnIcons';
import { toolEntryHtml } from '../icons/ToolIcons';
import { DmnReplaceMenuProvider } from './DmnReplaceMenuProvider';
import { DmnPopup } from './DmnPopup';
import type { DmnMode } from '../mode/DmnMode';

const ANNOTATION = 'dmn:TextAnnotation';
const ASSOCIATION = 'dmn:Association';

export class DmnContextPadProvider {
  static $inject = [
    'contextPad',
    'dmnElementTypes',
    'elementFactory',
    'autoPlace',
    'connect',
    'modeling',
    'dmnPopup',
    'dmnI18n',
    'dmnMode'
  ];

  constructor(
    contextPad: any,
    private readonly elementTypes: DmnElementTypes,
    private readonly elementFactory: any,
    private readonly autoPlace: any,
    private readonly connect: any,
    private readonly modeling: any,
    private readonly dmnPopup: DmnPopup,
    private readonly i18n: any,
    private readonly dmnMode: DmnMode
  ) {
    contextPad.registerProvider(this);
  }

  getContextPadEntries(element: any): Record<string, any> {
    // 预览模式无编辑入口（选择保留——供属性面板等宿主读取当前元素）
    if (!this.dmnMode.isEditable()) {
      return {};
    }
    const bo = element.businessObject;
    if (!bo?.$type?.startsWith('dmn:')) {
      return {};
    }
    const type = bo.$type;
    const entries: Record<string, any> = {};

    // ---- 追加族：矩阵派生的合法需求目标 + 注记（形状限定；连线不追加） ----
    // 同类型追加合法（Decision→Decision 链式决策等核心形态），由矩阵裁决
    if (!element.waypoints) {
      for (const meta of this.elementTypes.paletteShapeEntries()) {
        if (meta.type === ANNOTATION) {
          continue;
        }
        const connectionType = requirementBetween(type, meta.type);
        if (connectionType) {
          entries[`append-${metaId(meta)}`] = this.appendEntry(element, meta, connectionType);
        }
      }
      // 注记（经 Association 关联，任意形状可加）
      if (type !== ANNOTATION) {
        const annotationMeta = this.elementTypes.shapeMeta(ANNOTATION)!;
        entries['annotate'] = this.appendEntry(element, annotationMeta, ASSOCIATION);
      }
    }

    // ---- 替换（DRG 族互换；连线类型由端点决定不可手换） ----
    if (this.elementTypes.shapeMeta(type)?.replaceFamily) {
      entries['replace'] = {
        group: 'edit',
        html: toolEntryHtml('wrench'),
        title: this.i18n.t('替换类型'),
        action: {
          click: () => this.dmnPopup.open(
            element,
            DmnReplaceMenuProvider.MENU_ID,
            { kind: 'pad', target: element },
            this.i18n.t('更改元素类型')
          )
        }
      };
    }

    // ---- 删除 ----
    entries['delete'] = {
      group: 'edit',
      html: toolEntryHtml('trash'),
      title: this.i18n.t('删除（Delete）'),
      action: { click: () => this.modeling.removeElements([element]) }
    };

    // ---- 连线（收尾位——手动连线是低频兜底入口，靠后不抢焦点） ----
    entries['connect'] = {
      group: 'connect',
      html: toolEntryHtml('connect'),
      title: this.i18n.t('连线'),
      action: {
        click: (event: any) => {
          const mid = { x: element.x + element.width / 2, y: element.y + element.height / 2 };
          this.connect.start(event, element, mid, true);
        }
      }
    };

    return entries;
  }

  getMultiElementContextPadEntries(elements: any[]): Record<string, any> {
    if (elements.length < 2 || !this.dmnMode.isEditable()) {
      return {};
    }
    return {
      delete: {
        group: 'edit',
        html: toolEntryHtml('trash'),
        title: this.i18n.t('删除所选（Delete）'),
        action: { click: () => this.modeling.removeElements(elements) }
      }
    };
  }

  /** 追加条目：建形 + autoPlace 摆放（自带避让）+ 连线类型随载荷 */
  private appendEntry(element: any, meta: ShapeTypeMeta, connectionType: string): any {
    return {
      group: 'append',
      html: dmnEntryHtml(meta),
      title: `${this.i18n.t('追加')} ${this.i18n.t(meta.label)}`,
      action: {
        click: () => {
          const shape = this.elementFactory.createShape(this.elementTypes.createAttrs(meta));
          this.autoPlace.append(element, shape, { connection: { type: connectionType } });
        }
      }
    };
  }
}
