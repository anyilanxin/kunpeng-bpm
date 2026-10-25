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
<!--
  表格列清单编辑器：行式管理（label/必填/上移/下移/删除 + 类型下拉加列）。
  列的深属性（rules/props/条件）属缓执行项——协议列本就无条件，rules/props 后续
  按需扩展行内子面板。
-->
<script setup lang="ts">
import { inject, ref } from 'vue';
import { ElButton, ElInput, ElOption, ElSelect, ElSwitch } from 'element-plus';
import type { TableField, TableColumnDefinition } from '@kunpeng-io/form-js';
import { DESIGNER_CONTEXT } from '../../context';
import { COLUMN_TYPES, FIELD_TYPE_LABELS } from '../../model/templates';

const props = defineProps<{
  field: TableField;
}>();

const ctx = inject(DESIGNER_CONTEXT)!;

const newColumnType = ref<TableColumnDefinition['type']>('text');
const tableId = () => props.field.id;

function updateColumn(index: number, patch: Record<string, unknown>): void {
  ctx.run(() => ctx.model.updateColumn(tableId(), index, patch));
}
</script>

<template>
  <div class="fjd-editor-rows">
    <div v-for="(column, i) in field.columns" :key="column.id" class="fjd-editor-row">
      <span class="fjd-editor-note">{{ FIELD_TYPE_LABELS[column.type] }}</span>
      <ElInput :model-value="column.label" size="small" placeholder="列标题" style="flex: 1" @change="(v: string) => updateColumn(i, { label: v })" />
      <ElSwitch
        :model-value="column.required === true"
        size="small"
        @change="(v) => updateColumn(i, { required: v === true ? true : undefined })"
      />
      <ElButton link size="small" :disabled="i === 0" @click="ctx.run(() => ctx.model.moveColumn(tableId(), i, i - 1))">↑</ElButton>
      <ElButton link size="small" :disabled="i === field.columns.length - 1" @click="ctx.run(() => ctx.model.moveColumn(tableId(), i, i + 1))">↓</ElButton>
      <ElButton link type="danger" size="small" @click="ctx.run(() => ctx.model.removeColumn(tableId(), i))">删</ElButton>
      <div class="fjd-editor-note fjd-editor-col-id">{{ column.id }}</div>
    </div>
    <div class="fjd-editor-row">
      <ElSelect v-model="newColumnType" size="small" style="width: 110px">
        <ElOption v-for="t in COLUMN_TYPES" :key="t" :label="FIELD_TYPE_LABELS[t]" :value="t" />
      </ElSelect>
      <ElButton link type="primary" size="small" @click="ctx.run(() => ctx.model.addColumn(tableId(), newColumnType))">+ 添加列</ElButton>
    </div>
  </div>
</template>
