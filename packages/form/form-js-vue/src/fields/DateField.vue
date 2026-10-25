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
<!-- 协议日期值为 YYYY-MM-DD 字符串：value-format 让控件层直接吞吐字符串，无需 Date 互转 -->
<script setup lang="ts">
import { ElDatePicker } from 'element-plus';
import type { DateField, FieldValue } from '@kunpeng-io/form-js';

defineProps<{
  field: DateField;
  value: FieldValue;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: FieldValue): void;
}>();
</script>

<template>
  <el-date-picker
    type="date"
    value-format="YYYY-MM-DD"
    :model-value="typeof value === 'string' ? value : undefined"
    :placeholder="field.props?.placeholder"
    :disabled="disabled"
    style="width: 100%"
    @update:model-value="(v: string | null) => emit('update:value', v ?? null)"
  />
</template>
