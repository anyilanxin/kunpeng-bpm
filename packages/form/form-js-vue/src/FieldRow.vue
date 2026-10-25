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
<!-- 数据字段的表单行：label/必填星号/错误外显（el-form-item 仅作展示载体，不走其校验机制） -->
<script setup lang="ts">
import { computed } from 'vue';
import { ElFormItem } from 'element-plus';
import type { FieldDefinition, FieldValue, FormData, FormEngine } from '@kunpeng-io/form-js';
import FieldControl from './FieldControl.vue';

const props = defineProps<{
  field: FieldDefinition;
  data: FormData;
  engine: FormEngine;
  errors: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'setValue', id: string, value: FieldValue): void;
}>();

const visible = computed(() => props.engine.isVisible(props.field.id, props.data));
const disabled = computed(() => props.engine.isDisabled(props.field.id, props.data));
const error = computed(() => props.errors[props.field.id]);
</script>

<template>
  <el-form-item v-if="visible" :label="field.label" :required="field.required" :error="error">
    <FieldControl
      :field="field"
      :value="data[field.id] ?? null"
      :disabled="disabled"
      @update:value="(v) => emit('setValue', field.id, v)"
    />
    <div v-if="field.description" class="form-js-field-desc">{{ field.description }}</div>
  </el-form-item>
</template>
