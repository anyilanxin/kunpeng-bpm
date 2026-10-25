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
import type { ComponentType } from 'react';
import type { FieldDefinition, FieldValue } from '@kunpeng-io/form-js';

/**
 * 字段组件契约（与 Vue 版同形，回调名从 update:value 换 React 惯例 onChange）：
 * props { field, value, disabled } + onChange(value) 回传新值；值归一规则同协议。
 */
export interface FieldComponentProps<F extends FieldDefinition = FieldDefinition> {
  field: F;
  value: FieldValue;
  disabled: boolean;
  onChange: (value: FieldValue) => void;
}

/** 具体字段组件按自身字段类型收窄 field（FieldComponentProps<TextField> 等），注册时天然兼容本签名 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldComponent = ComponentType<FieldComponentProps<any>>;

const customFields = new Map<string, FieldComponent>();

/** 注册/覆写自定义字段类型（优先于内置 antd 字段） */
export function registerField(type: string, component: FieldComponent): void {
  customFields.set(type, component);
}

export function getFieldComponent(type: string): FieldComponent | undefined {
  return customFields.get(type);
}
