/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 */
/**
 * DMN 表达式编辑器的类型选择件（typeRef）：DMN 1.6 内建类型全集
 * （规范 §10.3.1）+ ItemDefinition 引用。下拉为原生 select（宿主样式
 * 浮卡族，见 dmn-js.css）。
 */
export const BUILTIN_TYPES: readonly string[] = [
  'string',
  'boolean',
  'number',
  'integer',
  'long',
  'double',
  'decimal',
  'date',
  'time',
  'date and time',
  'days and time duration',
  'years and months duration',
  'Any'
];

export function buildTypeSelect(current: string | undefined, onChange: (value: string) => void): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'dmn-editor-select';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '—';
  select.appendChild(empty);
  for (const type of BUILTIN_TYPES) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  }
  if (current) {
    select.value = current;
    if (select.value !== current) {
      // ItemDefinition/未知引用：原样保留显示（不吞未知值）
      const custom = document.createElement('option');
      custom.value = current;
      custom.textContent = current;
      select.appendChild(custom);
      select.value = current;
    }
  }
  select.addEventListener('change', () => onChange(select.value || undefined as unknown as string));
  return select;
}
