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
<!-- 双形态：无 options = 单布尔勾选；有 options = 多选组（值为标量数组） -->
<script setup lang="ts">
import { computed } from 'vue';
import { ElCheckbox, ElCheckboxGroup } from 'element-plus';
import type { CheckboxField, FieldValue } from '@kunpeng-io/form-js';

const props = defineProps<{
  field: CheckboxField;
  value: FieldValue;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: FieldValue): void;
}>();

const grouped = computed(() => Array.isArray(props.field.props?.options));
// 组值协议允许 boolean 标量，EP 组类型不含 boolean——运行时透传，类型侧收窄声明
const groupValue = computed(() =>
  Array.isArray(props.value) ? (props.value as unknown as (string | number)[]) : []
);
</script>

<template>
  <el-checkbox
    v-if="!grouped"
    :model-value="value === true"
    :disabled="disabled"
    @update:model-value="(v: boolean | string | number) => emit('update:value', v === true)"
  />
  <el-checkbox-group
    v-else
    :model-value="groupValue"
    :disabled="disabled"
    @update:model-value="(v: (string | number)[]) => emit('update:value', v)"
  >
    <el-checkbox v-for="option in field.props?.options" :key="String(option.value)" :value="option.value">
      {{ option.label }}
    </el-checkbox>
  </el-checkbox-group>
</template>
