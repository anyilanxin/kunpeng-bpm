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
 * palette 条目源（用户定规 2026-10-26）：抓手 / 套索两工具 + 创建决策 /
 * 输入数据 / 知识源 / 业务知识模型四 DRG 形状（顺序即面板序）。图标与
 * BPMN 线同款条目结构（分组头「DRG 元素」+ drag 语义）。
 */
import type Palette from 'diagram-js/lib/features/palette/Palette';
import type PaletteProvider from 'diagram-js/lib/features/palette/PaletteProvider';
import type Create from 'diagram-js/lib/features/create/Create';
import type ElementFactory from 'diagram-js/lib/core/ElementFactory';
import type { DmnElementFactory } from '../factory/DmnElementFactory';
import { toolEntryHtml, type ToolIconName } from '../icons/ToolIcons';

/** palette 定规四形状（顺序=面板序：Decision → InputData → KS → BKM；图标=用户资产 dmnicons 定名） */
const CREATE_ENTRIES: Array<{ type: string; label: string; icon: ToolIconName }> = [
  { type: 'dmn:Decision', label: '创建决策', icon: 'decision' },
  { type: 'dmn:InputData', label: '创建输入数据', icon: 'input-data' },
  { type: 'dmn:KnowledgeSource', label: '创建知识源', icon: 'knowledge-source' },
  { type: 'dmn:BusinessKnowledgeModel', label: '创建业务知识模型', icon: 'business-knowledge' }
];

export class DmnPaletteProvider implements PaletteProvider {
  static $inject = ['palette', 'create', 'elementFactory', 'dmnI18n', 'handTool', 'lassoTool'];

  static readonly PRIORITY = 1000;

  constructor(
    palette: Palette,
    private readonly create: Create,
    private readonly elementFactory: DmnElementFactory & ElementFactory,
    private readonly i18n: { t(s: string): string },
    private readonly handTool: any,
    private readonly lassoTool: any
  ) {
    palette.registerProvider(DmnPaletteProvider.PRIORITY, this as unknown as PaletteProvider);
  }

  getPaletteEntries(): Record<string, any> {
    const t = this.i18n.t.bind(this.i18n);
    // 条目 html 一律走 entryShell（.entry 包装是基座 palette 布局/交互样式的
    // 挂载点，裸 html 根没有 entry 类 → 尺寸/悬停/拖拽态全失）；
    // action 必须是函数——diagram-js Palette 只回调函数，字符串是死写
    // （抓手/套索点击无反应的总根源，2026-10-28 修）
    const entries: Record<string, any> = {
      'tool-hand': {
        group: 'tools',
        title: t('抓手工具（按住拖动画布）'),
        html: toolEntryHtml('hand', 22),
        action: {
          click: (event: any) => this.handTool.activateHand(event)
        }
      },
      'tool-lasso': {
        group: 'tools',
        title: t('套索工具（框选）'),
        html: toolEntryHtml('lasso', 22),
        action: {
          // activateSelection（两段式武装 lasso.selection 前缀）在 diagram-js 15
          // 无圈选处理者=框选落空；activateLasso(autoActivate=false)=武装单段
          // lasso 工具，画布下次按下拖拽即框选（自带视觉+end 圈人+不再武装）
          click: (event: any) => this.lassoTool.activateLasso(event, false)
        }
      }
    };
    for (const item of CREATE_ENTRIES) {
      const meta = this.elementFactory.shapeMeta(item.type);
      if (!meta) {
        continue;
      }
      entries[`create-${item.type.split(':')[1]}`] = {
        group: 'drg',
        title: t(item.label),
        html: toolEntryHtml(item.icon, 22),
        action: {
          dragstart: this.dragStart(item.type),
          click: this.dragStart(item.type)
        }
      };
    }
    return entries;
  }

  private dragStart(type: string): (event: Event) => void {
    return (event: Event) => {
      const shape = this.elementFactory.createShape({ type });
      this.create.start(event, shape);
    };
  }
}
