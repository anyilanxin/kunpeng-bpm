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
<!-- 字段面板：10 类字段拖出源（clone 模式，拖入画布即新建实例） -->
<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { FIELD_TYPE_LABELS } from '../model/templates';
import { DESIGNER_CONTEXT } from '../context';
import { attachPaletteSortable } from '../dnd';
import type Sortable from 'sortablejs';

const ctx = inject(DESIGNER_CONTEXT);
if (!ctx) {
  throw new Error('FieldPalette 必须在 FormDesigner 内使用');
}
const listEl = ref<HTMLElement>();
let sortable: Sortable | null = null;

onMounted(() => {
  if (listEl.value) {
    listEl.value.classList.add('fjd-palette-list');
    sortable = attachPaletteSortable(listEl.value, ctx);
  }
});
onBeforeUnmount(() => {
  sortable?.destroy();
});

const entries = Object.entries(FIELD_TYPE_LABELS) as Array<[string, string]>;
</script>

<template>
  <aside class="fjd-palette">
    <div class="fjd-panel-title">字段</div>
    <div ref="listEl" class="fjd-palette-list">
      <div v-for="[type, label] in entries" :key="type" class="fjd-palette-item" :data-type="type">
        {{ label }}
      </div>
    </div>
  </aside>
</template>
