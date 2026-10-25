<!--
  Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
  SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
  DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.

  This code is free software; you can redistribute it and/or modify it
  under the terms of the GNU General Public License version 2 only, as
  published by the Free Software Foundation. The copyright holder designates
  this particular file as subject to the "Classpath" exception as provided
  in the LICENSE file and directories/ that accompany this code.

  This code is distributed in the hope that it will be useful, but WITHOUT
  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
  FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
  version 2 for more details (a copy is included in the licenses/ directory
  that accompanied this code).

  You should have received a copy of the GNU General Public License version
  2 along with this work; if not, write to the Free Software Foundation,
  Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { ElOption, ElSelect } from 'element-plus';
import type { FieldValue, SelectField } from '@kunpeng-io/form-js';

const props = defineProps<{
  field: SelectField;
  value: FieldValue;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: FieldValue): void;
}>();

const multiple = computed(() => props.field.props?.multiple === true);
const controlValue = computed(() =>
  multiple.value
    ? Array.isArray(props.value)
      ? props.value
      : []
    : props.value === null
      ? undefined
      : props.value
);
</script>

<template>
  <el-select
    :model-value="controlValue"
    :multiple="multiple"
    :clearable="field.props?.clearable === true"
    :placeholder="field.props?.placeholder"
    :disabled="disabled"
    style="width: 100%"
    @update:model-value="(v: FieldValue) => emit('update:value', v)"
  >
    <el-option
      v-for="option in field.props?.options"
      :key="String(option.value)"
      :label="option.label"
      :value="option.value"
    />
  </el-select>
</template>
