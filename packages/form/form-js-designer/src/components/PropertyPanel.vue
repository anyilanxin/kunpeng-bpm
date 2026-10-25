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
<!-- 属性面板（D3 全量编辑器；本骨架先承载选中态概览与 table 列清单占位） -->
<script setup lang="ts">
import { inject } from 'vue';
import { FIELD_TYPE_LABELS } from '../model/templates';
import type { FieldDefinition, FormSchema } from '@kunpeng-io/form-js';
import { DESIGNER_CONTEXT } from '../context';

defineProps<{
  field: FieldDefinition | null;
  schema: FormSchema;
}>();

const ctx = inject(DESIGNER_CONTEXT);
if (!ctx) {
  throw new Error('PropertyPanel 必须在 FormDesigner 内使用');
}
</script>

<template>
  <aside class="fjd-props">
    <div class="fjd-panel-title">属性</div>
    <div v-if="!field" class="fjd-props-empty">选中画布字段后编辑属性</div>
    <div v-else class="fjd-props-body">
      <div class="fjd-props-row"><span class="fjd-props-key">类型</span><span>{{ FIELD_TYPE_LABELS[field.type] }}</span></div>
      <div class="fjd-props-row"><span class="fjd-props-key">id</span><span>{{ field.id }}</span></div>
      <div class="fjd-props-row"><span class="fjd-props-key">标题</span><span>{{ field.label || '—' }}</span></div>
      <div v-if="field.type === 'table'" class="fjd-props-rows">
        <div class="fjd-props-key">列清单（编辑器下一阶段接入）</div>
      </div>
    </div>
  </aside>
</template>
