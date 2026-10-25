<!--
  Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
  SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
  DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.

  This code is free software; you can redistribute it and/or modify it
  under the terms of the GNU General Public License version 2 only, as
  published by the Free Software Foundation. The copyright holder designates
  this particular file as subject to the "Classpath" exception as provided
  in the LICENSE file and licenses/ directories that accompany this code.

  This code is distributed in the hope that it will be useful, but WITHOUT
  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
  FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
  version 2 for more details (a copy is included in the licenses/ directory
  that accompanied this code).

  You should have received a copy of the GNU General Public License version
  2 along with this work; if not, write to the Free Software Foundation,
  Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
-->
<!-- 选项行编辑器：label/value 行式管理；value 输入按数字/布尔/字符串自动定型；末行不可删（结构校验要求非空） -->
<script setup lang="ts">
import { ElButton, ElInput } from 'element-plus';
import type { FieldOption, RadioField, SelectField, CheckboxField } from '@kunpeng-io/form-js';

const props = defineProps<{
  field: SelectField | RadioField | CheckboxField;
}>();

const emit = defineEmits<{
  (e: 'change', options: FieldOption[]): void;
}>();

function parseScalar(raw: string): string | number | boolean {
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  return raw;
}

const options = () => props.field.props?.options ?? [];

function updateRow(index: number, key: 'label' | 'value', raw: string): void {
  const next = options().map((o) => ({ ...o }));
  if (!next[index]) {
    return;
  }
  if (key === 'value') {
    next[index].value = parseScalar(raw);
  } else {
    next[index].label = raw;
  }
  emit('change', next);
}

function addRow(): void {
  const next = options().map((o) => ({ ...o }));
  next.push({ label: `选项${next.length + 1}`, value: `opt${next.length + 1}` });
  emit('change', next);
}

function removeRow(index: number): void {
  const current = options();
  if (current.length <= 1) {
    emit('change', current.map((o) => ({ ...o })));
    return;
  }
  emit(
    'change',
    current.filter((_, i) => i !== index)
  );
}
</script>

<template>
  <div class="fjd-editor-rows">
    <div v-for="(option, i) in options()" :key="i" class="fjd-editor-row">
      <ElInput :model-value="option.label" size="small" placeholder="label" @change="(v: string) => updateRow(i, 'label', v)" />
      <ElInput :model-value="String(option.value)" size="small" placeholder="value" @change="(v: string) => updateRow(i, 'value', v)" />
      <ElButton link type="danger" size="small" :disabled="options().length <= 1" @click="removeRow(i)">删</ElButton>
    </div>
    <ElButton link type="primary" size="small" @click="addRow">+ 添加选项</ElButton>
  </div>
</template>
