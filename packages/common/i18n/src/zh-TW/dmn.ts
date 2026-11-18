/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and directories/ that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * dmn 线繁體中文（zh-TW，value 由 zh-CN 经 OpenCC s2twp 转换生成，术语按需手工精调）词典（key=英文源码原文）。表达式英文记法 key 与决策表头 When/Then/And/
 * Annotations 记法词透传不译（沿 2026-11-18 定规）。
 */
export const dmnZhTW: Record<string, string> = {
  'Decision': '決策',
  'Input data': '輸入資料',
  'Knowledge source': '知識源',
  'Business knowledge model': '業務知識模型',
  'Decision service': '決策服務',
  'Text annotation': '註記',
  'Information requirement': '資訊需求',
  'Knowledge requirement': '知識需求',
  'Authority requirement': '權威需求',
  'Association': '關聯',
  'element': '元素',
  'Create decision': '建立決策',
  'Create input data': '建立輸入資料',
  'Create knowledge source': '建立知識源',
  'Create business knowledge model': '建立業務知識模型',
  'Hand tool (drag to pan canvas)': '抓手工具（按住拖動畫布）',
  'Lasso tool (rubber-band select)': '套索工具（框選）',
  'Delete': '刪除',
  'Connect (requirement type resolved by drop target)': '連線（按落點自動裁決需求型別）',
  'Switch expression': '切換表示式',
  'Add text annotation': '添加註記',
  'Undo (Ctrl+Z)': '撤銷 (Ctrl+Z)',
  'Redo (Ctrl+Shift+Z)': '重做 (Ctrl+Shift+Z)',
  'Reset canvas': '重置畫布',
  'Reset zoom (Ctrl+0)': '重置縮放 (Ctrl+0)',
  'Zoom out (Ctrl+-)': '縮小 (Ctrl+-)',
  'Zoom in (Ctrl++)': '放大 (Ctrl++)',
  'Fit viewport': '適應畫布',
  'More': '更多',
  'Set color of selected elements': '設定選中元素顏色',
  'Clear color of selected elements': '清除選中元素顏色',
  'Fill': '填充',
  'Stroke': '描邊',
  'OK': '確定',
  'Delete input column': '刪除輸入列',
  'Delete output column': '刪除輸出列',
  'Edit column': '編輯列',
  'Delete rule': '刪除規則',
  'Drag to resize column': '拖拽調整列寬',
  'At most one rule matches (multiple matches raise an error)': '最多命中一條規則（多條命中即報錯）',
  'First matching rule from top to bottom': '自上而下取首條命中規則',
  'Highest-priority output wins': '按輸出優先順序取最高的一條',
  'Any match (multiple matches must share the same output, else error)': '任意命中（多條須同輸出，否則報錯）',
  'Collect all matched outputs (aggregable)': '收集全部命中輸出（可聚合）',
  'Return all matches in rule declaration order': '按規則宣告序返回全部命中',
  'Return all matches in output priority order': '按輸出優先順序序返回全部命中',
  'No expression — click to switch kind': '無表示式 — 點選切換形態',
  'Grid editing for {type} not supported yet (boxed placeholder this iteration)': '暫不支援形態 {type} 的網格編輯（本期 boxed 四族佔位）',
  '{type} not supported yet (boxed placeholder this iteration)': '暫不支援形態 {type}（本期 boxed 佔位）',
  'Enter FEEL expression': '輸入 FEEL 表示式',
  'No body expression': '無體表達式',
  'Empty (no expression) — switch back to Literal expression via pad to edit': 'Empty（無表示式）——pad 切回 Literal expression 以編輯',
  'Parameter name (click to edit)': '引數名（點選編輯）',
  'Parameter type (click to select)': '引數型別（點選選擇）',
  'Delete parameter': '刪除引數',
  'Add parameter': '新增引數',
  'Result name': '結果名',
  'Edit {label}': '編輯{label}',
};
