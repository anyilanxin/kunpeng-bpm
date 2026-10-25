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
/* 字段分发：注册表自定义类型优先，回落内置 antd 字段 */
import type { FieldDefinition, FieldValue } from '@kunpeng-io/form-js';
import { getFieldComponent } from './registry';
import type { FieldComponent } from './registry';
import TextControl from './fields/TextControl';
import TextareaControl from './fields/TextareaControl';
import NumberControl from './fields/NumberControl';
import SelectControl from './fields/SelectControl';
import RadioControl from './fields/RadioControl';
import CheckboxControl from './fields/CheckboxControl';
import DateControl from './fields/DateControl';
import SwitchControl from './fields/SwitchControl';

const BUILTIN: Record<string, FieldComponent> = {
  text: TextControl,
  textarea: TextareaControl,
  number: NumberControl,
  select: SelectControl,
  radio: RadioControl,
  checkbox: CheckboxControl,
  date: DateControl,
  switch: SwitchControl
};

interface FieldControlProps {
  field: FieldDefinition;
  value: FieldValue;
  disabled: boolean;
  onChange: (value: FieldValue) => void;
}

export default function FieldControl({ field, value, disabled, onChange }: FieldControlProps) {
  const Component = getFieldComponent(field.type) ?? BUILTIN[field.type];
  if (!Component) {
    throw new Error(`未注册的字段类型：${field.type}`);
  }
  return <Component field={field} value={value} disabled={disabled} onChange={onChange} />;
}
