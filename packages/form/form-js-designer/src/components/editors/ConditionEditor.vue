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
  条件编辑器（visibleWhen/disabledWhen 共用）：引用字段下拉（数据字段，减自身）+
  操作符下拉（引用 table 仅 empty/notEmpty，切换目标时非法 op 自动收敛）+
  值控件随 op 形态（eq/ne 单值、in/notIn 逗号分隔多值、empty/notEmpty 无值）。
-->
<script setup lang="ts">
import { computed } from 'vue';
import { ElButton, ElInput, ElOption, ElSelect } from 'element-plus';
import type { Condition, FormSchema } from '@kunpeng-io/form-js';

const props = defineProps<{
  schema: FormSchema;
  selfId: string;
  condition?: Condition;
}>();

const emit = defineEmits<{
  (e: 'change', condition: Condition | undefined): void;
}>();

interface FieldRef {
  id: string;
  type: string;
}

/** 可引用的数据字段（含组内；减自身与 group）——引用合法性由结构校验同源约束 */
const referable = computed<FieldRef[]>(() => {
  const out: FieldRef[] = [];
  const walk = (fields: FormSchema['fields']): void => {
    for (const field of fields) {
      if (field.type === 'group') {
        walk(field.children);
      } else if (field.id !== props.selfId) {
        out.push({ id: field.id, type: field.type });
      }
    }
  };
  walk(props.schema.fields);
  return out;
});

const target = computed(() => referable.value.find((f) => f.id === props.condition?.field));
const isTableTarget = computed(() => target.value?.type === 'table');

const OP_LABELS: Array<{ op: Condition['op']; label: string }> = [
  { op: 'eq', label: '等于' },
  { op: 'ne', label: '不等于' },
  { op: 'in', label: '属于' },
  { op: 'notIn', label: '不属于' },
  { op: 'empty', label: '为空' },
  { op: 'notEmpty', label: '非空' }
];

const ops = computed(() => (isTableTarget.value ? OP_LABELS.filter((o) => o.op === 'empty' || o.op === 'notEmpty') : OP_LABELS));
const valueless = computed(() => props.condition?.op === 'empty' || props.condition?.op === 'notEmpty');

function ensure(cond: Condition | undefined): Condition {
  return cond ?? { field: referable.value[0]?.id ?? '', op: 'notEmpty' };
}

function onFieldChange(fieldId: string): void {
  const next = { ...ensure(props.condition), field: fieldId };
  const nextIsTable = referable.value.find((f) => f.id === fieldId)?.type === 'table';
  if (nextIsTable && next.op !== 'empty' && next.op !== 'notEmpty') {
    next.op = 'notEmpty';
    delete next.value;
  }
  emit('change', next);
}

function onOpChange(op: Condition['op']): void {
  const next = { ...ensure(props.condition), op };
  if (op === 'empty' || op === 'notEmpty') {
    delete next.value;
  } else if (next.value === undefined) {
    next.value = op === 'in' || op === 'notIn' ? [] : '';
  }
  emit('change', next);
}

function onScalarValue(raw: string): void {
  const next = { ...ensure(props.condition) };
  const t = target.value?.type;
  if (t === 'number' && /^-?\d+(\.\d+)?$/.test(raw)) {
    next.value = Number(raw);
  } else if (t === 'switch' || t === 'checkbox') {
    next.value = raw === 'true' ? true : raw === 'false' ? false : raw;
  } else {
    next.value = raw;
  }
  emit('change', next);
}

function onListValue(raw: string): void {
  const next = { ...ensure(props.condition) };
  next.value = raw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map((s) => (/^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s));
  emit('change', next);
}

const scalarText = () => String(props.condition?.value ?? '');
const listText = () => (Array.isArray(props.condition?.value) ? (props.condition?.value as Array<string | number>).join(',') : '');
</script>

<template>
  <div class="fjd-cond">
    <template v-if="!condition">
      <ElButton link type="primary" size="small" :disabled="referable.length === 0" @click="emit('change', ensure(undefined))">
        + 添加
      </ElButton>
    </template>
    <template v-else>
      <div class="fjd-editor-row">
        <ElSelect :model-value="condition.field" size="small" style="flex: 1" @change="(v: string) => onFieldChange(v)">
          <ElOption v-for="f in referable" :key="f.id" :label="`${f.id}（${f.type}）`" :value="f.id" />
        </ElSelect>
        <ElSelect :model-value="condition.op" size="small" style="width: 88px" @change="(v) => onOpChange(v as Condition['op'])">
          <ElOption v-for="o in ops" :key="o.op" :label="o.label" :value="o.op" />
        </ElSelect>
        <ElButton link type="danger" size="small" @click="emit('change', undefined)">删</ElButton>
      </div>
      <ElInput
        v-if="!valueless && (condition.op === 'eq' || condition.op === 'ne')"
        :model-value="scalarText()"
        size="small"
        placeholder="比较值"
        @change="(v: string) => onScalarValue(v)"
      />
      <ElInput
        v-else-if="!valueless"
        :model-value="listText()"
        size="small"
        placeholder="值1,值2（逗号分隔）"
        @change="(v: string) => onListValue(v)"
      />
    </template>
  </div>
</template>
