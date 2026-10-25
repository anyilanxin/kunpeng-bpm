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
import { Checkbox } from 'antd';
import type { CheckboxField } from '@kunpeng-io/form-js';
import type { FieldComponentProps } from '../registry';

export default function CheckboxControl({ field, value, disabled, onChange }: FieldComponentProps<CheckboxField>) {
  const options = field.props?.options;
  // 有 options 走组（多选数组），无 options 走独立勾选（boolean）
  if (Array.isArray(options)) {
    // 组值协议允许 boolean 标量，antd 组类型不含——运行时透传，类型侧收窄声明
    const groupValue = Array.isArray(value) ? (value as (string | number)[]) : [];
    return (
      <Checkbox.Group
        options={options.map((o) => ({ value: o.value as string | number, label: o.label }))}
        value={groupValue}
        disabled={disabled}
        onChange={(vals) => onChange(vals)}
      />
    );
  }
  return (
    <Checkbox
      checked={value === true}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}
