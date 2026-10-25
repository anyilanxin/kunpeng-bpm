/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH Classpath-exception-2.0
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
import { Select } from 'antd';
import type { FieldValue, SelectField } from '@kunpeng-io/form-js';
import type { FieldComponentProps } from '../registry';

export default function SelectControl({ field, value, disabled, onChange }: FieldComponentProps<SelectField>) {
  const props = field.props;
  const multiple = props?.multiple === true;
  // 协议选项值允许 boolean，antd Select 值域不含——类型收窄透传（boolean 选项属罕见形态）
  const options = props?.options?.map((o) => ({ value: o.value as string | number, label: o.label }));
  const controlValue = multiple
    ? Array.isArray(value)
      ? (value as (string | number)[])
      : []
    : value === null
      ? undefined
      : (value as string | number);
  return (
    <Select
      mode={multiple ? 'multiple' : undefined}
      value={controlValue}
      options={options}
      placeholder={props?.placeholder}
      disabled={disabled}
      style={{ width: '100%' }}
      onChange={(v) => onChange((multiple ? v : (v ?? null)) as FieldValue)}
    />
  );
}
