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
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { DateField } from '@kunpeng-io/form-js';
import type { FieldComponentProps } from '../registry';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function DateControl({ field, value, disabled, onChange }: FieldComponentProps<DateField>) {
  // 协议日期值是 YYYY-MM-DD 字符串，antd DatePicker 值是 dayjs 对象——两侧显式互转；
  // 非协议格式字符串不进控件（dayjs 对无效输入产 Invalid 对象）
  const controlValue = typeof value === 'string' && ISO_DATE.test(value) ? dayjs(value) : undefined;
  return (
    <DatePicker
      value={controlValue}
      placeholder={field.props?.placeholder}
      disabled={disabled}
      style={{ width: '100%' }}
      onChange={(date) => onChange(date ? date.format('YYYY-MM-DD') : null)}
    />
  );
}
