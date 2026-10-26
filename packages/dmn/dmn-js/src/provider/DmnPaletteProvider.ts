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
 * 元素面板 Provider。
 *
 * 条目两段：工具组（抓手/套索/空间/全局连线）+ 类型注册表全量形状（DMN 形状
 * 集小，**全量直列无"更多元素"弹层**——与 bpmn 线快捷集+弹层结构的关键差异）。
 * 连线不设面板直列：连线类型由端点唯一决定（规范 §6.2.3），经全局连线工具/
 * context pad 连线钮触发、规则层裁决。图标=用户指认面板资产（icons/DmnIcons）。
 * 落形即进名称编辑（DmnEditingBehavior.create.end）。
 */
import type { DmnElementTypes, ShapeTypeMeta } from '../meta/ElementTypes';
import { metaId } from '../meta/ElementTypes';
import { dmnEntryHtml } from '../icons/DmnIcons';
import { toolEntryHtml } from '../icons/ToolIcons';
import type { DmnMode } from '../mode/DmnMode';

export class DmnPaletteProvider {
  static $inject = [
    'palette',
    'dmnElementTypes',
    'create',
    'elementFactory',
    'handTool',
    'lassoTool',
    'spaceTool',
    'globalConnect',
    'dmnI18n',
    'dmnMode'
  ];

  constructor(
    palette: any,
    private readonly elementTypes: DmnElementTypes,
    private readonly create: any,
    private readonly elementFactory: any,
    private readonly handTool: any,
    private readonly lassoTool: any,
    private readonly spaceTool: any,
    private readonly globalConnect: any,
    private readonly i18n: any,
    private readonly dmnMode: DmnMode
  ) {
    palette.registerProvider(this);
  }

  getPaletteEntries(): Record<string, any> {
    // 预览模式无创建入口（样式层已隐藏面板，此处再断条目源，双保险）
    if (!this.dmnMode.isEditable()) {
      return {};
    }
    const entries: Record<string, any> = {};

    // ---- 工具组 ----
    entries['tool-hand'] = {
      group: 'tools',
      html: toolEntryHtml('hand', 22),
      title: this.i18n.t('抓手工具（按住拖动画布）'),
      action: { click: (event: any) => this.handTool.activateHand(event) }
    };
    entries['tool-lasso'] = {
      group: 'tools',
      html: toolEntryHtml('lasso', 22),
      title: this.i18n.t('套索工具（框选）'),
      action: { click: (event: any) => this.lassoTool.activateSelection(event) }
    };
    entries['tool-space'] = {
      group: 'tools',
      html: toolEntryHtml('space', 22),
      title: this.i18n.t('空间工具（腾挪空间）'),
      action: { click: (event: any) => this.spaceTool.activateMakeSpace(event) }
    };
    entries['tool-connect'] = {
      group: 'tools',
      html: toolEntryHtml('connect', 22),
      title: this.i18n.t('全局连线'),
      action: { click: (event: any) => this.globalConnect.start(event) }
    };
    entries['tool-separator'] = { group: 'tools', separator: true };

    // ---- 形状组（注册表全量；palette 分组即注册表 paletteGroup） ----
    for (const meta of this.elementTypes.paletteShapeEntries()) {
      entries[`create-${metaId(meta)}`] = {
        group: meta.paletteGroup,
        html: dmnEntryHtml(meta, 26),
        title: this.i18n.t(`创建${meta.label}`),
        action: {
          click: (event: any) => this.startCreate(event, meta),
          dragstart: (event: any) => this.startCreate(event, meta)
        }
      };
    }

    return entries;
  }

  private startCreate(event: any, meta: ShapeTypeMeta): void {
    // 载荷字段集统一走注册表 createAttrs（单一事实源）
    const shape = this.elementFactory.createShape(this.elementTypes.createAttrs(meta));
    this.create.start(event, shape);
  }
}
