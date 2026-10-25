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
import { ElButton, ElDialog, ElInput, ElMessage, ElRadioButton, ElRadioGroup } from 'element-plus';
import { parseSchema, serializeSchema } from '@kunpeng-io/form-js';
import { DesignerModel } from '../model/DesignerModel';
import type { FieldDefinition, FormSchema } from '@kunpeng-io/form-js';
import { DESIGNER_CONTEXT } from '../context';
import FieldPalette from './FieldPalette.vue';
import DesignCanvas from './DesignCanvas.vue';
import PropertyPanel from './PropertyPanel.vue';
import PreviewPane from './PreviewPane.vue';

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
const mode = ref<'design' | 'preview'>('design');

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

/** 命令统一入口：成功 bump 视图；失败提示且 bump 一次拉回受控控件的错误残留输入 */
function run(command: () => void): void {
  try {
    command();
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : String(error));
  }
  revision.value += 1;
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

/** 属性面板编辑提交：id 改名后选中随迁（selectedId 指向新 id，面板不跳空态） */
function updateField(id: string, patch: Record<string, unknown>): void {
  run(() => {
    model.updateField(id, patch);
    if (typeof patch.id === 'string' && patch.id !== id) {
      selectedId.value = patch.id;
    }
  });
}

// ---------- 导入 / 导出（D4） ----------

const importVisible = ref(false);
const importText = ref('');
const exportVisible = ref(false);
/** 规范序 JSON（serializeSchema）：导出即协议文本，可原样回导入 */
const exportText = computed(() => serializeSchema(currentSchema.value));

function openImport(): void {
  importText.value = '';
  importVisible.value = true;
}

/** 导入：parseSchema 负责结构校验（非法抛 FormSchemaError，明细直出） */
function confirmImport(): void {
  try {
    model.importSchema(parseSchema(importText.value));
    selectedId.value = null;
    importVisible.value = false;
    revision.value += 1;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function copyExport(): Promise<void> {
  try {
    await navigator.clipboard.writeText(exportText.value);
    ElMessage.success('已复制到剪贴板');
  } catch {
    ElMessage.warning('剪贴板不可用，请手动全选复制');
  }
}

provide(DESIGNER_CONTEXT, { model, run, select, selectedId, updateField });
</script>

<template>
  <div class="fjd-designer">
    <div class="fjd-toolbar">
      <ElRadioGroup v-model="mode" size="small">
        <ElRadioButton value="design">设计</ElRadioButton>
        <ElRadioButton value="preview">预览</ElRadioButton>
      </ElRadioGroup>
      <span class="fjd-toolbar-spacer" />
      <ElButton size="small" @click="openImport">导入</ElButton>
      <ElButton size="small" @click="exportVisible = true">导出</ElButton>
    </div>

    <div v-if="mode === 'design'" class="fjd-main">
      <FieldPalette />
      <DesignCanvas :fields="fields" :selected-id="selectedId" @select="onSelect" @remove="onRemove" />
      <PropertyPanel :field="selectedField" :schema="currentSchema" @select="onSelect" />
    </div>
    <PreviewPane v-else :schema="currentSchema" />

    <ElDialog v-model="importVisible" title="导入 Schema" width="560px" append-to-body>
      <ElInput v-model="importText" type="textarea" :rows="10" placeholder="粘贴 form-js Schema JSON" />
      <template #footer>
        <ElButton size="small" @click="importVisible = false">取消</ElButton>
        <ElButton size="small" type="primary" @click="confirmImport">导入</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="exportVisible" title="导出 Schema" width="560px" append-to-body>
      <ElInput :model-value="exportText" type="textarea" :rows="10" readonly />
      <template #footer>
        <ElButton size="small" @click="copyExport">复制</ElButton>
        <ElButton size="small" type="primary" @click="exportVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.fjd-designer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fjd-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fjd-toolbar-spacer {
  flex: 1;
}

.fjd-main {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
</style>
