/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH Classpath-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/*
 * FormDesigner——设计器根组件：三栏布局（字段面板 / 画布 / 属性面板）。
 *
 * 状态策略：DesignerModel 是 UI 无关命令式核心（非响应式），组件层以 revision
 * 计数驱动视图——任何命令成功后 bump，computed 随之重取 tree()/schema()；命令
 * 抛错（容器规则/id 冲突）走统一 run() 捕获并以消息提示，模型不动、视图即稳。
 */
<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DesignerModel } from '../model/DesignerModel';
import type { FieldDefinition, FormSchema } from '@kunpeng-io/form-js';
import { DESIGNER_CONTEXT } from '../context';
import FieldPalette from './FieldPalette.vue';
import DesignCanvas from './DesignCanvas.vue';
import PropertyPanel from './PropertyPanel.vue';

const props = defineProps<{
  /** 初始 Schema（编辑已有表单）；缺省空画布 */
  schema?: FormSchema;
}>();

const emit = defineEmits<{
  (e: 'update:schema', schema: FormSchema): void;
}>();

const model = new DesignerModel(props.schema);
const revision = ref(0);
const selectedId = ref<string | null>(null);

// DesignerModel 是 mutate 式命令核心（树内引用恒稳），Vue 的 props 浅比较会跳过
// 引用未变的子组件——视图侧一律取深拷贝，每次 revision 产全新结构驱动全树重渲
const fields = computed(() => {
  revision.value;
  return structuredClone(model.tree());
});
const currentSchema = computed(() => {
  revision.value;
  return model.schema();
});

watch(
  currentSchema,
  (schema) => {
    emit('update:schema', schema);
  },
  { immediate: true }
);

/** 命令统一入口：成功 bump 视图，失败提示且模型不动 */
function run(command: () => void): void {
  try {
    command();
    revision.value += 1;
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : String(error));
  }
}

function onSelect(id: string): void {
  selectedId.value = id;
}

function onRemove(id: string): void {
  if (selectedId.value === id) {
    selectedId.value = null;
  }
  run(() => model.removeField(id));
}

const selectedField = computed<FieldDefinition | null>(() => {
  revision.value;
  if (!selectedId.value) {
    return null;
  }
  try {
    return structuredClone(model.field(selectedId.value));
  } catch {
    return null;
  }
});

function select(id: string | null): void {
  selectedId.value = id;
}

provide(DESIGNER_CONTEXT, { model, run, select, selectedId });
</script>

<template>
  <div class="fjd-designer">
    <FieldPalette />
    <DesignCanvas :fields="fields" :selected-id="selectedId" @select="onSelect" @remove="onRemove" />
    <PropertyPanel :field="selectedField" :schema="currentSchema" @select="onSelect" />
  </div>
</template>

<style scoped>
.fjd-designer {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
</style>
