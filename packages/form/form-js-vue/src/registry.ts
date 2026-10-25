/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and directories/ that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
import type { Component } from 'vue';
import type { DataFieldType } from '@kunpeng-io/form-js';

/**
 * 字段组件注册表：宿主按 type 覆盖内置字段组件（接自家 UI 库 / 自定义控件的正式口子）。
 *
 * 自定义组件契约（与内置字段组件同形）：
 * - props：{ field: 具体字段类型, value: FieldValue, disabled: boolean }
 * - emit：`update:value`（协议值——字符串/数值/布尔/数组/null，日期为 YYYY-MM-DD 字符串）
 */
export type FieldComponent = Component;

const registry = new Map<string, FieldComponent>();

/** 覆盖/注册某类型的字段组件（后注册者生效；类型不限内置集合，可扩展自定义 type） */
export function registerField(type: DataFieldType | (string & {}), component: FieldComponent): void {
  registry.set(type, component);
}

export function getFieldComponent(type: string): FieldComponent | undefined {
  return registry.get(type);
}
