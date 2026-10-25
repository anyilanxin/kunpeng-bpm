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
<!-- 设计画布：根级容器（sortable 挂载点）+ 字段块树渲染 -->
<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue';
import type { FieldDefinition } from '@kunpeng-io/form-js';
import { DESIGNER_CONTEXT } from '../context';
import { attachCanvasSortable } from '../dnd';
import type Sortable from 'sortablejs';
import FieldBlock from './FieldBlock.vue';

defineProps<{
  fields: readonly FieldDefinition[];
  selectedId: string | null;
}>();

const ctx = inject(DESIGNER_CONTEXT);
if (!ctx) {
  throw new Error('DesignCanvas 必须在 FormDesigner 内使用');
}
const rootEl = ref<HTMLElement>();
let sortable: Sortable | null = null;

onMounted(() => {
  if (rootEl.value) {
    sortable = attachCanvasSortable(rootEl.value, null, ctx);
  }
});
onBeforeUnmount(() => {
  sortable?.destroy();
});
</script>

<template>
  <section class="fjd-canvas">
    <div class="fjd-panel-title">画布</div>
    <div ref="rootEl" class="fjd-canvas-root" :data-parent-id="''">
      <div v-if="fields.length === 0" class="fjd-canvas-empty">从左侧拖入字段开始设计</div>
      <FieldBlock v-for="field in fields" :key="field.id" :field="field" />
    </div>
  </section>
</template>
