<!--
  Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
  SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
  DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.

  This code is free software; you can redistribute it and/or modify it
  under the terms of the GNU General Public License version 2 only, as
  published by the Free Software Foundation. The copyright holder designates
  this particular file as subject to the "Classpath" exception as provided
  in the LICENSE file and licenses/ directory that accompany this code.

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
  明细表字段：el-table 行内编辑——列控件复用 FieldControl（列即标量字段定义）；
  数据归宿主（增删行/单元格编辑都 emit 上抛 FormRenderer 统一进数据流）；
  单元格错误键 = `表id[行].列id`（与引擎 issueKey 同源）；行数界约束增删按钮态。
-->
<script setup lang="ts">
import { computed } from 'vue';
import { ElButton, ElFormItem, ElTable, ElTableColumn } from 'element-plus';
import type { FieldValue, FormData, FormEngine, TableField } from '@kunpeng-io/form-js';
import FieldControl from './FieldControl.vue';

const props = defineProps<{
  field: TableField;
  data: FormData;
  engine: FormEngine;
  errors: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'addRow', fieldId: string): void;
  (e: 'removeRow', fieldId: string, rowIndex: number): void;
  (e: 'setCell', fieldId: string, rowIndex: number, columnId: string, value: FieldValue): void;
}>();

const visible = computed(() => props.engine.isVisible(props.field.id, props.data));
const disabled = computed(() => props.engine.isDisabled(props.field.id, props.data));
const rows = computed(() => (Array.isArray(props.data[props.field.id]) ? (props.data[props.field.id] as FormData[]) : []));
const minRows = computed(() => props.field.props?.minRows ?? 0);
const atMax = computed(() => props.field.props?.maxRows !== undefined && rows.value.length >= props.field.props.maxRows);
/** 表级错误（required/minRows/maxRows，键即表 id）；单元格错误经 cellError 按定位键取 */
const tableError = computed(() => props.errors[props.field.id]);

function cellError(rowIndex: number, columnId: string): string | undefined {
  return props.errors[`${props.field.id}[${rowIndex}].${columnId}`];
}
</script>

<template>
  <el-form-item v-if="visible" :label="field.label" :required="field.required" :error="tableError">
    <div class="form-js-table">
      <el-table :data="rows" size="small">
        <el-table-column v-for="column in field.columns" :key="column.id" :label="column.label" min-width="170">
          <template #default="{ row, $index }">
            <FieldControl
              :field="column"
              :value="row[column.id] ?? null"
              :disabled="disabled"
              @update:value="(v) => emit('setCell', field.id, $index, column.id, v)"
            />
            <div v-if="cellError($index, column.id)" class="form-js-cell-error">{{ cellError($index, column.id) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="64" align="center">
          <template #default="{ $index }">
            <el-button
              link
              type="danger"
              size="small"
              :disabled="disabled || rows.length <= minRows"
              @click="emit('removeRow', field.id, $index)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!atMax" class="form-js-table-actions">
        <el-button size="small" :disabled="disabled" @click="emit('addRow', field.id)">添加一行</el-button>
      </div>
      <div v-if="field.description" class="form-js-field-desc">{{ field.description }}</div>
    </div>
  </el-form-item>
</template>

<style scoped>
.form-js-table {
  width: 100%;
}

.form-js-cell-error {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-color-danger);
  margin-top: 2px;
}

.form-js-table-actions {
  margin-top: 8px;
}
</style>
