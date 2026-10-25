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
import { ElRadio, ElRadioGroup } from 'element-plus';
import type { FieldValue, RadioField } from '@kunpeng-io/form-js';

const props = defineProps<{
  field: RadioField;
  value: FieldValue;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: FieldValue): void;
}>();

// 协议选项值允许 boolean，radio 值域收窄为标量；控件回传 undefined（清空）归一为 null
const controlValue = computed(() =>
  typeof props.value === 'string' || typeof props.value === 'number' || typeof props.value === 'boolean'
    ? props.value
    : undefined
);
</script>

<template>
  <el-radio-group
    :model-value="controlValue"
    :disabled="disabled"
    @update:model-value="(v: string | number | boolean | undefined) => emit('update:value', v ?? null)"
  >
    <el-radio v-for="option in field.props?.options" :key="String(option.value)" :value="option.value">
      {{ option.label }}
    </el-radio>
  </el-radio-group>
</template>
