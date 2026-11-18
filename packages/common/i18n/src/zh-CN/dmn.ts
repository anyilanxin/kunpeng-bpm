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
 * dmn 线简体中文词典（key=英文源码原文）。表达式英文记法 key 与决策表头 When/Then/And/
 * Annotations 记法词透传不译（沿 2026-11-18 定规）。
 */
export const dmnZhCN: Record<string, string> = {
  'Decision': '决策',
  'Input data': '输入数据',
  'Knowledge source': '知识源',
  'Business knowledge model': '业务知识模型',
  'Decision service': '决策服务',
  'Text annotation': '注记',
  'Information requirement': '信息需求',
  'Knowledge requirement': '知识需求',
  'Authority requirement': '权威需求',
  'Association': '关联',
  'element': '元素',
  'Create decision': '创建决策',
  'Create input data': '创建输入数据',
  'Create knowledge source': '创建知识源',
  'Create business knowledge model': '创建业务知识模型',
  'Hand tool (drag to pan canvas)': '抓手工具（按住拖动画布）',
  'Lasso tool (rubber-band select)': '套索工具（框选）',
  'Delete': '删除',
  'Connect (requirement type resolved by drop target)': '连线（按落点自动裁决需求类型）',
  'Switch expression': '切换表达式',
  'Add text annotation': '添加注记',
  'Undo (Ctrl+Z)': '撤销 (Ctrl+Z)',
  'Redo (Ctrl+Shift+Z)': '重做 (Ctrl+Shift+Z)',
  'Reset canvas': '重置画布',
  'Reset zoom (Ctrl+0)': '重置缩放 (Ctrl+0)',
  'Zoom out (Ctrl+-)': '缩小 (Ctrl+-)',
  'Zoom in (Ctrl++)': '放大 (Ctrl++)',
  'Fit viewport': '适应画布',
  'More': '更多',
  'Set color of selected elements': '设置选中元素颜色',
  'Clear color of selected elements': '清除选中元素颜色',
  'Fill': '填充',
  'Stroke': '描边',
  'OK': '确定',
  'Delete input column': '删除输入列',
  'Delete output column': '删除输出列',
  'Edit column': '编辑列',
  'Delete rule': '删除规则',
  'Drag to resize column': '拖拽调整列宽',
  'At most one rule matches (multiple matches raise an error)': '最多命中一条规则（多条命中即报错）',
  'First matching rule from top to bottom': '自上而下取首条命中规则',
  'Highest-priority output wins': '按输出优先级取最高的一条',
  'Any match (multiple matches must share the same output, else error)': '任意命中（多条须同输出，否则报错）',
  'Collect all matched outputs (aggregable)': '收集全部命中输出（可聚合）',
  'Return all matches in rule declaration order': '按规则声明序返回全部命中',
  'Return all matches in output priority order': '按输出优先级序返回全部命中',
  'No expression — click to switch kind': '无表达式 — 点击切换形态',
  'Grid editing for {type} not supported yet (boxed placeholder this iteration)': '暂不支持形态 {type} 的网格编辑（本期 boxed 四族占位）',
  '{type} not supported yet (boxed placeholder this iteration)': '暂不支持形态 {type}（本期 boxed 占位）',
  'Enter FEEL expression': '输入 FEEL 表达式',
  'No body expression': '无体表达式',
  'Empty (no expression) — switch back to Literal expression via pad to edit': 'Empty（无表达式）——pad 切回 Literal expression 以编辑',
  'Parameter name (click to edit)': '参数名（点击编辑）',
  'Parameter type (click to select)': '参数类型（点击选择）',
  'Delete parameter': '删除参数',
  'Add parameter': '添加参数',
  'Result name': '结果名',
  'Edit {label}': '编辑{label}',
};
