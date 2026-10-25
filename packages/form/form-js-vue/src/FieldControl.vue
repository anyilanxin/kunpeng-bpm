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
<!-- 字段控件分派：注册表覆盖优先，未覆盖落内置 element-plus 实现 -->
<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import type { FieldDefinition, FieldValue } from '@kunpeng-io/form-js';
import { getFieldComponent } from './registry';
import TextField from './fields/TextField.vue';
import TextareaField from './fields/TextareaField.vue';
import NumberField from './fields/NumberField.vue';
import SelectField from './fields/SelectField.vue';
import RadioField from './fields/RadioField.vue';
import CheckboxField from './fields/CheckboxField.vue';
import DateField from './fields/DateField.vue';
import SwitchField from './fields/SwitchField.vue';

const props = defineProps<{
  field: FieldDefinition;
  value: FieldValue;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: FieldValue): void;
}>();

const BUILTIN: Record<string, Component> = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  select: SelectField,
  radio: RadioField,
  checkbox: CheckboxField,
  date: DateField,
  switch: SwitchField
};

const component = computed(() => getFieldComponent(props.field.type) ?? BUILTIN[props.field.type]);
</script>

<template>
  <component
    :is="component"
    :field="field"
    :value="value"
    :disabled="disabled"
    @update:value="(v: FieldValue) => emit('update:value', v)"
  />
</template>
