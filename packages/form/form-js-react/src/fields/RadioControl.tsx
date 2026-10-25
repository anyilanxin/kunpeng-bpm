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
import { Radio } from 'antd';
import type { RadioField } from '@kunpeng-io/form-js';
import type { FieldComponentProps } from '../registry';

export default function RadioControl({ field, value, disabled, onChange }: FieldComponentProps<RadioField>) {
  // 协议选项值允许 boolean，radio 值域收窄为标量；控件回传 undefined（清空）归一为 null
  const controlValue =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? value
      : undefined;
  return (
    <Radio.Group
      options={field.props?.options?.map((o) => ({ value: o.value, label: o.label }))}
      value={controlValue}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ?? null)}
    />
  );
}
