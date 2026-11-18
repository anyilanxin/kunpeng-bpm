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
 * dmn 线内核 UI 英文词典（key=内核源码中文原文；覆盖 palette/context pad/
 * 表达式菜单/工具栏/决策表族视图/字面·Boxed 视图/下钻徽标/命中策略说明）。
 * 表达式菜单的英文记法 key（'Decision table' 等）透传即正确英文，不入词典；
 * 决策表头 When/Then/And/Annotations 为 DMN 记法词，按定规不译。
 */
export const dmnEnUS: Record<string, string> = {
  // ---- 类型 label（ElementTypes，10 条） ----
  '决策': 'Decision',
  '输入数据': 'Input data',
  '知识源': 'Knowledge source',
  '业务知识模型': 'Business knowledge model',
  '决策服务': 'Decision service',
  '注记': 'Text annotation',
  '信息需求': 'Information requirement',
  '知识需求': 'Knowledge requirement',
  '权威需求': 'Authority requirement',
  '关联': 'Association',
  '元素': 'element',

  // ---- palette / context pad ----
  '创建决策': 'Create decision',
  '创建输入数据': 'Create input data',
  '创建知识源': 'Create knowledge source',
  '创建业务知识模型': 'Create business knowledge model',
  '抓手工具（按住拖动画布）': 'Hand tool (drag to pan canvas)',
  '套索工具（框选）': 'Lasso tool (rubber-band select)',
  '删除': 'Delete',
  '连线（按落点自动裁决需求类型）': 'Connect (requirement type resolved by drop target)',
  '切换表达式': 'Switch expression',
  '添加注记': 'Add text annotation',

  // ---- 工具栏（dmn-js-toolbar） ----
  '撤销 (Ctrl+Z)': 'Undo (Ctrl+Z)',
  '重做 (Ctrl+Shift+Z)': 'Redo (Ctrl+Shift+Z)',
  '重置画布': 'Reset canvas',
  '重置缩放 (Ctrl+0)': 'Reset zoom (Ctrl+0)',
  '缩小 (Ctrl+-)': 'Zoom out (Ctrl+-)',
  '放大 (Ctrl++)': 'Zoom in (Ctrl++)',
  '适应画布': 'Fit viewport',
  '更多': 'More',
  '设置选中元素颜色': 'Set color of selected elements',
  '清除选中元素颜色': 'Clear color of selected elements',
  '填充': 'Fill',
  '描边': 'Stroke',
  '确定': 'OK',

  // ---- 决策表族（header/body/columns/titleBar） ----
  '删除输入列': 'Delete input column',
  '删除输出列': 'Delete output column',
  '编辑列': 'Edit column',
  '删除规则': 'Delete rule',
  '拖拽调整列宽': 'Drag to resize column',

  // ---- 命中策略说明（title 两处消费） ----
  '最多命中一条规则（多条命中即报错）': 'At most one rule matches (multiple matches raise an error)',
  '自上而下取首条命中规则': 'First matching rule from top to bottom',
  '按输出优先级取最高的一条': 'Highest-priority output wins',
  '任意命中（多条须同输出，否则报错）': 'Any match (multiple matches must share the same output, else error)',
  '收集全部命中输出（可聚合）': 'Collect all matched outputs (aggregable)',
  '按规则声明序返回全部命中': 'Return all matches in rule declaration order',
  '按输出优先级序返回全部命中': 'Return all matches in output priority order',

  // ---- 字面 / Boxed 视图 ----
  '无表达式 — 点击切换形态': 'No expression — click to switch kind',
  '暂不支持形态 {type} 的网格编辑（本期 boxed 四族占位）': 'Grid editing for {type} not supported yet (boxed placeholder this iteration)',
  '暂不支持形态 {type}（本期 boxed 占位）': '{type} not supported yet (boxed placeholder this iteration)',
  '输入 FEEL 表达式': 'Enter FEEL expression',
  '无体表达式': 'No body expression',
  'Empty（无表达式）——pad 切回 Literal expression 以编辑': 'Empty (no expression) — switch back to Literal expression via pad to edit',
  '参数名（点击编辑）': 'Parameter name (click to edit)',
  '参数类型（点击选择）': 'Parameter type (click to select)',
  '删除参数': 'Delete parameter',
  '添加参数': 'Add parameter',
  '结果名': 'Result name',

  // ---- 下钻徽标 ----
  '编辑{label}': 'Edit {label}'
};
