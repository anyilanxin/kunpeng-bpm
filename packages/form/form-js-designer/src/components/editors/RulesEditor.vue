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
<!-- 规则行编辑器：kind 适用性过滤与协议校验同源（RULE_TYPE_FIT）；value 形态随 kind/字段类型切换 -->
<script setup lang="ts">
import { computed } from 'vue';
import { ElButton, ElDatePicker, ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus';
import { RULE_TYPE_FIT } from '@kunpeng-io/form-js';
import type { FieldDefinition, ValidationRule, ValidationRuleKind } from '@kunpeng-io/form-js';

const props = defineProps<{
  field: FieldDefinition;
}>();

const emit = defineEmits<{
  (e: 'change', rules: ValidationRule[]): void;
}>();

const KIND_LABELS: Record<ValidationRuleKind, string> = {
  required: '必填',
  min: '最小值',
  max: '最大值',
  minLength: '最少字符',
  maxLength: '最多字符',
  pattern: '正则'
};

const rules = () => props.field.rules ?? [];
const kindEntries = computed(() =>
  (Object.keys(KIND_LABELS) as ValidationRuleKind[]).filter((kind) => {
    if (kind === 'required') {
      return false;
    }
    return RULE_TYPE_FIT[kind].has(props.field.type);
  })
);

function emitRows(next: ValidationRule[]): void {
  emit('change', next);
}

function updateRule(index: number, patch: Partial<ValidationRule>): void {
  const next = rules().map((r) => ({ ...r }));
  if (!next[index]) {
    return;
  }
  Object.assign(next[index], patch);
  emitRows(next);
}

function onKindChange(index: number, kind: ValidationRuleKind): void {
  const next = rules().map((r) => ({ ...r }));
  if (!next[index]) {
    return;
  }
  // kind 切换后 value 形态可能变化，重置交由用户重填
  next[index] = { kind };
  emitRows(next);
}

function addRule(): void {
  const kind = kindEntries.value[0];
  if (!kind) {
    return;
  }
  emitRows([...rules().map((r) => ({ ...r })), { kind }]);
}

function removeRule(index: number): void {
  emitRows(
    rules().filter((_, i) => i !== index)
  );
}
</script>

<template>
  <div class="fjd-editor-rows">
    <div v-for="(rule, i) in rules()" :key="i" class="fjd-editor-row">
      <ElSelect :model-value="rule.kind" size="small" style="width: 96px" @change="(k) => onKindChange(i, k as ValidationRuleKind)">
        <ElOption v-for="k in kindEntries" :key="k" :label="KIND_LABELS[k]" :value="k" />
      </ElSelect>
      <ElDatePicker
        v-if="field.type === 'date' && (rule.kind === 'min' || rule.kind === 'max')"
        :model-value="typeof rule.value === 'string' ? rule.value : undefined"
        value-format="YYYY-MM-DD"
        size="small"
        style="flex: 1"
        @change="(v: any) => updateRule(i, { value: v ?? undefined })"
      />
      <ElInput
        v-else-if="rule.kind === 'pattern'"
        :model-value="typeof rule.value === 'string' ? rule.value : ''"
        size="small"
        placeholder="正则源"
        style="flex: 1"
        @change="(v: string) => updateRule(i, { value: v === '' ? undefined : v })"
      />
      <ElInputNumber
        v-else-if="rule.kind !== 'required'"
        :model-value="typeof rule.value === 'number' ? rule.value : undefined"
        size="small"
        style="flex: 1"
        @change="(v: any) => updateRule(i, { value: v ?? undefined })"
      />
      <ElButton link type="danger" size="small" @click="removeRule(i)">删</ElButton>
    </div>
    <div v-for="(rule, i) in rules()" :key="'m' + i" class="fjd-editor-row">
      <span class="fjd-editor-note">第 {{ i + 1 }} 条文案</span>
      <ElInput :model-value="rule.message" size="small" placeholder="默认文案" style="flex: 1" @change="(v: string) => updateRule(i, { message: v === '' ? undefined : v })" />
    </div>
    <ElButton link type="primary" size="small" :disabled="kindEntries.length === 0" @click="addRule">+ 添加规则</ElButton>
  </div>
</template>
