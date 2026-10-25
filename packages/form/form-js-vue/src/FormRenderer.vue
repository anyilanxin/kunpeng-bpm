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
<!--
  FormRenderer——协议渲染根组件。

  职责边界：数据归宿主（v-model），校验单一事实源是 FormEngine（每份数据全量求值）；
  错误外显走「已触及字段 / 全量揭示」策略（初始不打扰，提交时 validate() 全量揭示）。
  引擎实例随 schema 派生（computed），引擎/数据均为普通对象不做深层响应式代理。
  validate 事件随数据派发（挂载 immediate + 每次数据变化），语义是「当前数据的校验结果」；
  仅在 validate() 调用时额外揭示全部错误。
-->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElForm } from 'element-plus';
import { FormEngine } from '@kunpeng-io/form-js';
import type { FieldValue, FormData, FormSchema, FormValidationResult } from '@kunpeng-io/form-js';
import FieldRow from './FieldRow.vue';
import GroupSection from './GroupSection.vue';

const props = withDefaults(
  defineProps<{
    schema: FormSchema;
    modelValue: FormData;
    /** 初始即全量外显错误（默认 false：等待字段被触及或 validate() 调用） */
    showAllErrors?: boolean;
  }>(),
  { showAllErrors: false }
);

const emit = defineEmits<{
  (e: 'update:modelValue', data: FormData): void;
  (e: 'validate', result: FormValidationResult): void;
}>();

const engine = computed(() => new FormEngine(props.schema));
const touched = reactive(new Set<string>());
const revealAll = ref(props.showAllErrors);

watch(
  () => props.showAllErrors,
  (v) => {
    revealAll.value = v;
  }
);

const validation = computed(() => engine.value.validate(props.modelValue));

watch(
  validation,
  (result) => {
    emit('validate', result);
  },
  { immediate: true }
);

/** 当前应外显的错误文案：已触及或全量揭示的字段取首条问题 */
const displayed = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {};
  for (const [id, issues] of Object.entries(validation.value.byField)) {
    if (revealAll.value || touched.has(id)) {
      out[id] = issues[0].message;
    }
  }
  return out;
});

function setValue(id: string, value: FieldValue): void {
  touched.add(id);
  emit('update:modelValue', { ...props.modelValue, [id]: value });
}

/** 整单提交入口：揭示全部错误并返回校验结果 */
function validate(): FormValidationResult {
  revealAll.value = true;
  return validation.value;
}

/** 清空触及痕迹与错误揭示（宿主重置数据时配套调用） */
function reset(): void {
  touched.clear();
  revealAll.value = props.showAllErrors;
}

defineExpose({ validate, reset });
</script>

<template>
  <el-form class="form-js-renderer" label-position="top" @submit.prevent>
    <template v-for="field in schema.fields" :key="field.id">
      <GroupSection
        v-if="field.type === 'group'"
        :field="field"
        :data="modelValue"
        :engine="engine"
        :errors="displayed"
        @set-value="setValue"
      />
      <FieldRow
        v-else
        :field="field"
        :data="modelValue"
        :engine="engine"
        :errors="displayed"
        @set-value="setValue"
      />
    </template>
  </el-form>
</template>

<style scoped>
.form-js-renderer :deep(.form-js-field-desc) {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  width: 100%;
}
</style>
