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
 * 元素面板 Provider。
 *
 * 条目分两段：
 * - 工具组（抓手/套索/空间/全局连线）+ 类型注册表**快捷集**（默认 8 个高频元素，
 *   见 ElementTypes.PALETTE_QUICK_IDS；宿主 `paletteQuickIds` 配置可整体替换）；
 * - 底部 "…" 条目打开 'bpmn-create' 创建弹框（全量类型、分组头、可搜索），
 *   与 context pad 容器 "+" 同一弹框，宿主为画布根（落点=可视区中心）。
 *
 * 面板插件化三级入口（见 ElementTypes 类注释）：paletteQuickIds 配置 / 本服务
 * 经 additionalModules 覆盖 / palette.registerProvider 追加（sample-plugin 演示）。
 *
 * 元素图标=标准图标集（icons/IconSet 剪影，26px；集合未覆盖类型回退自绘记法）；
 * 工具图标 22px。快捷条目 click 与 dragstart 都走 create.start。
 * 连线不设面板直列（与参考面板一致）：连线经全局连线工具 / context pad 连线钮，
 * 类型由 BpmnRules 按端点推断。
 */
import type { BpmnElementTypes } from '../meta/ElementTypes';
import { metaId } from '../meta/ElementTypes';
import { bpmnEntryHtml } from '../icons/BpmnIcons';
import { toolEntryHtml } from '../icons/ToolIcons';
import { BpmnCreateMenuProvider } from './BpmnElementMenuProvider';
import { BpmnPopup } from './BpmnPopup';
import type { BpmnMode } from '../mode/BpmnMode';

export class BpmnPaletteProvider {
  static $inject = [
    'palette',
    'bpmnElementTypes',
    'create',
    'elementFactory',
    'handTool',
    'lassoTool',
    'spaceTool',
    'globalConnect',
    'canvas',
    'bpmnPopup',
    'bpmnI18n',
    'bpmnMode'
  ];

  constructor(
    palette: any,
    private readonly elementTypes: BpmnElementTypes,
    private readonly create: any,
    private readonly elementFactory: any,
    private readonly handTool: any,
    private readonly lassoTool: any,
    private readonly spaceTool: any,
    private readonly globalConnect: any,
    private readonly canvas: any,
    private readonly bpmnPopup: BpmnPopup,
    private readonly i18n: any,
    private readonly bpmnMode: BpmnMode
  ) {
    palette.registerProvider(this);
  }

  getPaletteEntries(): Record<string, any> {
    // 预览模式无创建入口（样式层已隐藏面板，此处再断条目源，双保险）
    if (!this.bpmnMode.isEditable()) {
      return {};
    }
    const entries: Record<string, any> = {};

    // ---- 工具组 ----
    entries['tool-hand'] = {
      group: 'tools',
      html: toolEntryHtml('hand', 22),
      title: this.i18n.t('抓手工具（按住拖动画布）'),
      action: {
        click: (event: any) => this.handTool.activateHand(event)
      }
    };
    entries['tool-lasso'] = {
      group: 'tools',
      html: toolEntryHtml('lasso', 22),
      title: this.i18n.t('套索工具（框选）'),
      action: {
        // seata/bpmn-js 同款：点击激活套索（crosshair 光标），随后在画布拖拽出框选。
        // 只调 activateSelection——与 activateLasso 叠加会双重 dragging.init，
        // 表现为"点一下套索按钮就立即出现框选"
        click: (event: any) => this.lassoTool.activateSelection(event)
      }
    };
    entries['tool-space'] = {
      group: 'tools',
      html: toolEntryHtml('space', 22),
      title: this.i18n.t('空间工具（腾挪空间）'),
      action: {
        click: (event: any) => this.spaceTool.activateMakeSpace(event)
      }
    };
    entries['tool-connect'] = {
      group: 'tools',
      html: toolEntryHtml('connect', 22),
      title: this.i18n.t('全局连线'),
      action: {
        click: (event: any) => this.globalConnect.start(event)
      }
    };
    // 工具组与元素组之间的原生分隔线（diagram-js separator 条目，seata 同款）
    entries['tool-separator'] = { group: 'tools', separator: true };

    // ---- 快捷集形状条目（默认展示；其余类型经 "…" 弹框） ----
    // 直列分组用 quick-<序号> 逐条独立：diagram-js palette 按分组首现聚簇，
    // 若沿用注册表 paletteGroup（如分组与数据对象同属 artifacts），跨组规定
    // 序（…数据对象→数据存储→池→分组）会被聚簇打乱——独立分组让面板序
    // 与 quickIds 严格一致，创建弹框的分组展示不受影响（另走 PALETTE_GROUPS）
    this.elementTypes.paletteQuickShapeEntries().forEach((meta: any, index: number) => {
      // 无定义中间事件是双语义创建（拖空白=中间事件 / 拖活动上=边界事件），
      // title 单列；其余条目沿用「创建<label>」
      const isPlainIntermediate = metaId(meta) === 'IntermediateThrowEvent' && !meta.eventSymbol;
      entries[`create-${metaId(meta)}`] = {
        group: `quick-${index}`,
        html: bpmnEntryHtml(meta, 26),
        title: isPlainIntermediate
          ? this.i18n.t('创建中间/边界事件（拖到活动上为边界事件）')
          : this.i18n.t(`创建${meta.label}`),
        action: {
          click: (event: any) => this.startCreate(event, meta),
          dragstart: (event: any) => this.startCreate(event, meta)
        }
      };
    });

    // ---- "…"：全量创建弹框（画布根宿主，可视区中心落形） ----
    entries['create-more'] = {
      group: 'more',
      html: toolEntryHtml('more', 22),
      title: this.i18n.t('更多元素'),
      action: {
        click: () => this.bpmnPopup.open(
          this.canvas.getRootElement(),
          BpmnCreateMenuProvider.MENU_ID,
          { kind: 'palette' },
          this.i18n.t('创建元素')
        )
      }
    };

    return entries;
  }

  private newShape(meta: any): any {
    return this.elementFactory.createShape({
      type: meta.type,
      eventSymbol: meta.eventSymbol,
      nonInterrupting: meta.nonInterrupting || undefined,
      symbol: meta.symbol,
      isExpanded: meta.symbol === 'subProcessExpanded' || meta.symbol === 'subProcessEvent' ? true : meta.symbol === 'subProcessCollapsed' ? false : undefined,
      width: meta.type === 'bpmn:SubProcess' && meta.symbol === 'subProcessCollapsed'
        ? this.elementTypes.shapeMeta('bpmn:Task')!.width
        : undefined,
      height: meta.type === 'bpmn:SubProcess' && meta.symbol === 'subProcessCollapsed'
        ? this.elementTypes.shapeMeta('bpmn:Task')!.height
        : undefined
    });
  }

  private startCreate(event: any, meta: any): void {
    const shape = this.newShape(meta);
    this.create.start(event, shape);
  }
}
