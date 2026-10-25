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
  字段块：画布结构树的节点。group = 容器块（子级为可拖入子容器，sortable 挂载于
  组件自身生命周期）；table = 表格块（列以徽标只读呈现，列编辑走属性面板）。
-->
<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElButton } from 'element-plus';
import { FIELD_TYPE_LABELS } from '../model/templates';
import type { FieldDefinition } from '@kunpeng-io/form-js';
import { DESIGNER_CONTEXT } from '../context';
import { attachCanvasSortable } from '../dnd';
import type Sortable from 'sortablejs';

const props = defineProps<{
  field: FieldDefinition;
}>();

const ctx = inject(DESIGNER_CONTEXT);
if (!ctx) {
  throw new Error('FieldBlock 必须在 FormDesigner 内使用');
}

const selected = computed(() => ctx.selectedId.value === props.field.id);
const childrenEl = ref<HTMLElement>();
let sortable: Sortable | null = null;

onMounted(() => {
  if (props.field.type === 'group' && childrenEl.value) {
    sortable = attachCanvasSortable(childrenEl.value, props.field.id, ctx);
  }
});
onBeforeUnmount(() => {
  sortable?.destroy();
});
</script>

<template>
  <div class="fjd-block" :class="{ 'fjd-block-selected': selected }" :data-id="field.id" @click.stop="ctx.select(field.id)">
    <div class="fjd-block-head">
      <span class="fjd-drag-handle">≡</span>
      <span class="fjd-block-type">{{ FIELD_TYPE_LABELS[field.type] }}</span>
      <span class="fjd-block-label">{{ field.label || field.id }}</span>
      <span class="fjd-block-id">{{ field.id }}</span>
      <ElButton link type="danger" size="small" class="fjd-block-remove" @click.stop="ctx.run(() => ctx.model.removeField(field.id))">
        删除
      </ElButton>
    </div>
    <div v-if="field.type === 'group'" class="fjd-block-children" :ref="(el) => { childrenEl = el as HTMLElement }">
      <div v-if="field.children.length === 0" class="fjd-canvas-empty">拖入组内字段</div>
      <FieldBlock v-for="child in field.children" :key="child.id" :field="child" />
    </div>
    <div v-else-if="field.type === 'table'" class="fjd-block-columns">
      <span v-for="column in field.columns" :key="column.id" class="fjd-column-chip">
        {{ column.label || column.id }}·{{ FIELD_TYPE_LABELS[column.type] }}
      </span>
    </div>
  </div>
</template>
