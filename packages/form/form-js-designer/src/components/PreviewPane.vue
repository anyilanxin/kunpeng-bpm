<!--
  Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
  SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
  DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.

  This code is free software; you can redistribute it and/or modify it
  under the terms of the GNU General Public License version 2 only, as
  published by the Free Software Foundation. The copyright holder designates
  this particular file as subject to the "Classpath" exception as provided
  in the LICENSE file and /licenses/ directories that accompany this code.

  This code is distributed in the hope that it will be useful, but WITHOUT
  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
  FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
  version 2 for more details (a copy is included in the licenses/ directory
  that accompanied this code).

  You should have received a copy of the GNU General Public License
  version 2 along with this work; if not, write to the Free Software Foundation,
  Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
-->
<!--
  预览面板：内嵌 form-js-vue FormRenderer 实时渲染当前设计产出——预览即真实
  渲染行为（联动/校验全真）。设计态 Schema 变更即重置填写数据（字段集合已变，
  旧数据无意义）。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { FormEngine } from '@kunpeng-io/form-js';
import type { FormData, FormSchema, FormValidationResult } from '@kunpeng-io/form-js';
import { FormRenderer } from '@kunpeng-io/form-js-vue';

const props = defineProps<{
  schema: FormSchema;
}>();

// 引擎随 schema 重建；填写数据随 schema 变更重置为默认值
const engine = computed(() => new FormEngine(props.schema));
const data = ref<FormData>(engine.value.defaults());
watch(engine, (next) => {
  data.value = next.defaults();
  result.value = null;
});

const result = ref<FormValidationResult | null>(null);
</script>

<template>
  <div class="fjd-preview">
    <div class="fjd-preview-bar">
      <span class="fjd-preview-tag">预览</span>
      <span v-if="result" class="fjd-preview-state" :class="result.valid ? 'is-ok' : 'is-bad'">
        {{ result.valid ? '校验通过' : `未通过（${Object.keys(result.byField).length} 个字段）` }}
      </span>
      <span v-else class="fjd-preview-state is-idle">未校验</span>
    </div>
    <div class="fjd-preview-body">
      <FormRenderer :schema="schema" v-model="data" @validate="(r) => (result = r)" />
    </div>
  </div>
</template>

<style scoped>
.fjd-preview {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--el-fill-color-extra-light);
}

.fjd-preview-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
}

.fjd-preview-tag {
  background: var(--el-color-primary);
  color: #fff;
  border-radius: 4px;
  padding: 1px 8px;
}

.fjd-preview-state.is-ok {
  color: var(--el-color-success);
}

.fjd-preview-state.is-bad {
  color: var(--el-color-danger);
}

.fjd-preview-state.is-idle {
  color: var(--el-text-color-secondary);
}
</style>
