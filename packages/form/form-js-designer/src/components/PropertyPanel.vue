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
<!-- 属性面板：选中字段的协议属性全量编辑（分区：公共/默认值/类型 props/规则/条件/表格列） -->
<script setup lang="ts">
import { computed, inject } from 'vue';
import {
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
  ElSwitch
} from 'element-plus';
import type { FieldDefinition, FieldOption, FormSchema } from '@kunpeng-io/form-js';
import { DESIGNER_CONTEXT } from '../context';
import OptionsEditor from './editors/OptionsEditor.vue';
import RulesEditor from './editors/RulesEditor.vue';
import ConditionEditor from './editors/ConditionEditor.vue';
import TableColumnsEditor from './editors/TableColumnsEditor.vue';

const props = defineProps<{
  field: FieldDefinition | null;
  schema: FormSchema;
}>();

const ctx = inject(DESIGNER_CONTEXT)!;

/** 模板联合类型不窄化：props 访问统一走宽形态助手（unknown 会卡 EP 组件 prop 类型） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fieldProps = computed<any>(() => (props.field as any).props);

/** 提交补丁（ctx.updateField：模型浅合并 + id 改名选中随迁；undefined 值键=删除该属性） */
function set(patch: Record<string, unknown>): void {
  const id = props.field?.id;
  if (!id) {
    return;
  }
  ctx.updateField(id, patch);
}

function setProp(patch: Record<string, unknown>): void {
  set({ props: { ...(fieldProps.value ?? {}), ...patch } });
}

const optionItems = () => (fieldProps.value?.options as FieldOption[]) ?? [];
</script>

<template>
  <aside class="fjd-props">
    <div class="fjd-panel-title">属性</div>
    <div v-if="!field" class="fjd-props-empty">选中画布字段后编辑属性</div>
    <div v-else class="fjd-props-body">
      <div class="fjd-props-section">基础</div>
      <div class="fjd-props-form-row">
        <span class="fjd-props-label">id</span>
        <ElInput :model-value="field.id" size="small" @change="(v: string) => set({ id: v })" />
      </div>
      <div class="fjd-props-form-row">
        <span class="fjd-props-label">标题</span>
        <ElInput :model-value="field.label" size="small" @change="(v: string) => set({ label: v })" />
      </div>
      <div class="fjd-props-form-row">
        <span class="fjd-props-label">说明</span>
        <ElInput
          :model-value="field.description"
          size="small"
          placeholder="选填"
          @change="(v: string) => set({ description: v === '' ? undefined : v })"
        />
      </div>
      <div class="fjd-props-form-row">
        <span class="fjd-props-label">必填</span>
        <ElSwitch :model-value="field.required === true" size="small" @change="(v) => set({ required: v === true ? true : undefined })" />
        <span class="fjd-props-label" style="margin-left: 16px">禁用</span>
        <ElSwitch :model-value="field.disabled === true" size="small" @change="(v) => set({ disabled: v === true ? true : undefined })" />
      </div>

      <template v-if="field.type !== 'group' && field.type !== 'table'">
        <div class="fjd-props-section">默认值</div>
        <div class="fjd-props-form-row">
          <span class="fjd-props-label">值</span>
          <template v-if="field.type === 'switch' || (field.type === 'checkbox' && !fieldProps?.options)">
            <ElSwitch :model-value="field.defaultValue === true" size="small" @change="(v) => set({ defaultValue: v === true })" />
          </template>
          <template v-else-if="field.type === 'number'">
            <ElInputNumber
              :model-value="typeof field.defaultValue === 'number' ? field.defaultValue : undefined"
              size="small"
              @change="(v: any) => set({ defaultValue: v ?? null })"
            />
          </template>
          <template v-else-if="field.type === 'date'">
            <ElDatePicker
              :model-value="typeof field.defaultValue === 'string' ? field.defaultValue : undefined"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 100%"
              @change="(v: any) => set({ defaultValue: v ?? null })"
            />
          </template>
          <template v-else-if="(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && fieldProps?.options">
            <ElSelect
              :model-value="(field.defaultValue as string | number | boolean | (string | number | boolean)[] | undefined) ?? undefined"
              :multiple="field.type === 'checkbox' || fieldProps?.multiple === true"
              clearable
              size="small"
              style="width: 100%"
              @change="(v: any) => set({ defaultValue: v ?? null })"
            >
              <ElOption v-for="o in optionItems()" :key="String(o.value)" :label="o.label" :value="o.value" />
            </ElSelect>
          </template>
          <template v-else>
            <ElInput
              :model-value="typeof field.defaultValue === 'string' ? field.defaultValue : ''"
              size="small"
              clearable
              @change="(v: string) => set({ defaultValue: v === '' ? undefined : v })"
            />
          </template>
        </div>
      </template>

      <template v-if="field.type === 'text' || field.type === 'textarea' || field.type === 'number' || field.type === 'date' || field.type === 'select'">
        <div class="fjd-props-section">控件参数</div>
        <div v-if="field.type !== 'number'" class="fjd-props-form-row">
          <span class="fjd-props-label">占位</span>
          <ElInput :model-value="fieldProps?.placeholder" size="small" @change="(v: string) => setProp({ placeholder: v === '' ? undefined : v })" />
        </div>
        <template v-if="field.type === 'number'">
          <div class="fjd-props-form-row">
            <span class="fjd-props-label">最小</span>
            <ElInputNumber :model-value="fieldProps?.min" size="small" @change="(v) => setProp({ min: v ?? undefined })" />
          </div>
          <div class="fjd-props-form-row">
            <span class="fjd-props-label">最大</span>
            <ElInputNumber :model-value="fieldProps?.max" size="small" @change="(v) => setProp({ max: v ?? undefined })" />
          </div>
          <div class="fjd-props-form-row">
            <span class="fjd-props-label">步进</span>
            <ElInputNumber :model-value="fieldProps?.step" size="small" :min="0.1" @change="(v) => setProp({ step: v ?? undefined })" />
          </div>
        </template>
        <template v-if="field.type === 'textarea'">
          <div class="fjd-props-form-row">
            <span class="fjd-props-label">行数</span>
            <ElInputNumber :model-value="fieldProps?.rows" size="small" :min="1" @change="(v) => setProp({ rows: v ?? undefined })" />
          </div>
        </template>
        <div v-if="field.type === 'select'" class="fjd-props-form-row">
          <span class="fjd-props-label">多选</span>
          <ElSwitch :model-value="fieldProps?.multiple === true" size="small" @change="(v) => setProp({ multiple: v === true ? true : undefined })" />
        </div>
      </template>

      <template v-if="field.type === 'select' || field.type === 'radio' || field.type === 'checkbox'">
        <div class="fjd-props-section">选项</div>
        <OptionsEditor :field="field" @change="(options) => setProp({ options })" />
      </template>

      <template v-if="field.type === 'table'">
        <div class="fjd-props-section">行数约束</div>
        <div class="fjd-props-form-row">
          <span class="fjd-props-label">最少</span>
          <ElInputNumber :model-value="fieldProps?.minRows" size="small" :min="0" @change="(v) => setProp({ minRows: v ?? undefined })" />
          <span class="fjd-props-label" style="margin-left: 10px">最多</span>
          <ElInputNumber :model-value="fieldProps?.maxRows" size="small" :min="0" @change="(v) => setProp({ maxRows: v ?? undefined })" />
        </div>
        <div class="fjd-props-section">列</div>
        <TableColumnsEditor :field="field" />
      </template>

      <template v-if="field.type !== 'group' && field.type !== 'table'">
        <div class="fjd-props-section">校验规则</div>
        <RulesEditor :field="field" @change="(rules) => set({ rules })" />
      </template>

      <template v-if="field.type !== 'group'">
        <div class="fjd-props-section">联动条件</div>
        <div class="fjd-props-cond">
          <span class="fjd-props-label">显隐</span>
          <ConditionEditor :schema="schema" :self-id="field.id" :condition="field.visibleWhen" @change="(c) => set({ visibleWhen: c })" />
        </div>
        <div class="fjd-props-cond">
          <span class="fjd-props-label">禁用</span>
          <ConditionEditor :schema="schema" :self-id="field.id" :condition="field.disabledWhen" @change="(c) => set({ disabledWhen: c })" />
        </div>
      </template>
    </div>
  </aside>
</template>
