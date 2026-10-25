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
<!-- 分组容器（单层，协议已保证组内不再嵌组）：组级 visibleWhen/disabled 由引擎链式求值 -->
<script setup lang="ts">
import { computed } from 'vue';
import type { FieldValue, FormData, FormEngine, GroupField } from '@kunpeng-io/form-js';
import FieldRow from './FieldRow.vue';

const props = defineProps<{
  field: GroupField;
  data: FormData;
  engine: FormEngine;
  errors: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'setValue', id: string, value: FieldValue): void;
}>();

const visible = computed(() => props.engine.isVisible(props.field.id, props.data));
</script>

<template>
  <section v-if="visible" class="form-js-group">
    <div v-if="field.label" class="form-js-group-title">{{ field.label }}</div>
    <FieldRow
      v-for="child in field.children"
      :key="child.id"
      :field="child"
      :data="data"
      :engine="engine"
      :errors="errors"
      @set-value="(id, v) => emit('setValue', id, v)"
    />
  </section>
</template>

<style scoped>
.form-js-group {
  margin: 4px 0 8px;
}

.form-js-group-title {
  font-weight: 600;
  font-size: 14px;
  margin: 8px 0 4px;
  color: var(--el-text-color-primary);
}
</style>
