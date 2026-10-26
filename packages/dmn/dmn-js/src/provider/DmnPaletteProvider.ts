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

/** palette 定规四形状（顺序=面板序：Decision → InputData → KS → BKM） */
const CREATE_ENTRIES: Array<{ type: string; label: string; icon: ToolIconName }> = [
  { type: 'dmn:Decision', label: '创建决策', icon: 'grid' },
  { type: 'dmn:InputData', label: '创建输入数据', icon: 'input' },
  { type: 'dmn:KnowledgeSource', label: '创建知识源', icon: 'source' },
  { type: 'dmn:BusinessKnowledgeModel', label: '创建业务知识模型', icon: 'literal' }
];

export class DmnPaletteProvider implements PaletteProvider {
  static $inject = ['palette', 'create', 'elementFactory', 'dmnI18n'];

  static readonly PRIORITY = 1000;

  constructor(
    palette: Palette,
    private readonly create: Create,
    private readonly elementFactory: DmnElementFactory & ElementFactory,
    private readonly i18n: { t(s: string): string }
  ) {
    palette.registerProvider(DmnPaletteProvider.PRIORITY, this as unknown as PaletteProvider);
  }

  getPaletteEntries(): Record<string, any> {
    const t = this.i18n.t.bind(this.i18n);
    // 条目 html 一律走 entryShell（.entry 包装是基座 palette 布局/交互样式的
    // 挂载点，裸 html 根没有 entry 类 → 尺寸/悬停/拖拽态全失）
    const entries: Record<string, any> = {
      'tool-hand': {
        group: 'tools',
        title: t('抓手'),
        html: toolEntryHtml('hand', 22),
        action: { click: 'activateHandTool' }
      },
      'tool-lasso': {
        group: 'tools',
        title: t('套索'),
        html: toolEntryHtml('lasso', 22),
        action: { click: 'activateLassoTool' }
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
