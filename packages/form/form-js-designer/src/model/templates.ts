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
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/*
 * 字段模板：拖入新字段时的最小合法初始形态（结构校验可过的最小集）。
 * label 取类型中文名；未声明的可选键一律不写入（保持产出 Schema 干净）。
 */
import type { FieldDefinition, TableColumnDefinition } from '@kunpeng-io/form-js';

export const FIELD_TYPE_LABELS: Record<FieldDefinition['type'], string> = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  select: '下拉选择',
  radio: '单选组',
  checkbox: '勾选',
  date: '日期',
  switch: '开关',
  group: '分组',
  table: '明细表'
};

/** 表格列允许的类型（8 类标量，与结构校验白名单同源） */
export const COLUMN_TYPES: readonly TableColumnDefinition['type'][] = [
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'checkbox',
  'date',
  'switch'
];

export function fieldTemplate(type: FieldDefinition['type']): FieldDefinition {
  switch (type) {
    case 'text':
      return { id: '', type, label: FIELD_TYPE_LABELS[type] };
    case 'textarea':
      return { id: '', type, label: FIELD_TYPE_LABELS[type], props: { rows: 3 } };
    case 'number':
      return { id: '', type, label: FIELD_TYPE_LABELS[type] };
    case 'select':
      return {
        id: '',
        type,
        label: FIELD_TYPE_LABELS[type],
        props: { options: [{ label: '选项一', value: 'opt1' }, { label: '选项二', value: 'opt2' }] }
      };
    case 'radio':
      return {
        id: '',
        type,
        label: FIELD_TYPE_LABELS[type],
        props: { options: [{ label: '选项一', value: 'opt1' }, { label: '选项二', value: 'opt2' }] }
      };
    case 'checkbox':
      return { id: '', type, label: FIELD_TYPE_LABELS[type] };
    case 'date':
      return { id: '', type, label: FIELD_TYPE_LABELS[type] };
    case 'switch':
      return { id: '', type, label: FIELD_TYPE_LABELS[type] };
    case 'group':
      return { id: '', type, label: FIELD_TYPE_LABELS[type], children: [] };
    case 'table':
      return {
        id: '',
        type,
        label: FIELD_TYPE_LABELS[type],
        columns: [
          { id: '', type: 'text', label: '列一' },
          { id: '', type: 'number', label: '列二' }
        ]
      };
  }
}

export function columnTemplate(type: TableColumnDefinition['type']): TableColumnDefinition {
  return fieldTemplate(type) as TableColumnDefinition;
}
