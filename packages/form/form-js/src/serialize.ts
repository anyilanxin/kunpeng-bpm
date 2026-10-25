/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and directories/ that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */

/**
 * 规范序列化：serialize 输出**键序固定**的规范 JSON（缩进 2）。
 *
 * 字节级往返保证：serialize(parse(serialize(s))) === serialize(s)——
 * 规范化只依已知键按固定次序重排（未知键丢弃，演进靠 schemaVersion 把关），
 * parse 原样保留全部已知键，故规范化幂等、再序列化逐字节稳定。
 * parse 前置结构校验，非法输入抛 FormSchemaError（不做修复、不做部分通过）。
 */
import type {
  Condition,
  FieldDefinition,
  FieldOption,
  FormSchema,
  ValidationRule
} from './schema';
import { validateSchema } from './validate';

/** Schema 非法时由 parseSchema 抛出，携带全部结构错误 */
export class FormSchemaError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(`表单 Schema 校验失败（${errors.length} 处）：\n  ${errors.join('\n  ')}`);
    this.name = 'FormSchemaError';
    this.errors = errors;
  }
}

/** 各类型 props 的固定键序（序列化键序的事实源，与 schema.ts 声明序一致） */
const PROPS_KEY_ORDER: Record<string, readonly string[]> = {
  text: ['placeholder', 'maxLength', 'clearable'],
  textarea: ['placeholder', 'rows', 'maxLength'],
  number: ['min', 'max', 'step', 'placeholder'],
  select: ['options', 'multiple', 'placeholder', 'clearable'],
  radio: ['options'],
  checkbox: ['options'],
  date: ['placeholder'],
  table: ['minRows', 'maxRows']
};

function canonicalCondition(condition: Condition): Record<string, unknown> {
  const out: Record<string, unknown> = { field: condition.field, op: condition.op };
  if (condition.value !== undefined) {
    out.value = condition.value;
  }
  return out;
}

function canonicalRule(rule: ValidationRule): Record<string, unknown> {
  const out: Record<string, unknown> = { kind: rule.kind };
  if (rule.value !== undefined) {
    out.value = rule.value;
  }
  if (rule.message !== undefined) {
    out.message = rule.message;
  }
  return out;
}

function canonicalOption(option: FieldOption): Record<string, unknown> {
  return { label: option.label, value: option.value };
}

function canonicalProps(field: FieldDefinition): Record<string, unknown> | undefined {
  if (field.type === 'group' || field.type === 'switch' || field.props === undefined) {
    return undefined;
  }
  const source = field.props as unknown as Record<string, unknown>;
  const order = PROPS_KEY_ORDER[field.type];
  const out: Record<string, unknown> = {};
  for (const key of order) {
    if (source[key] === undefined) {
      continue;
    }
    out[key] =
      key === 'options' && Array.isArray(source[key])
        ? (source[key] as FieldOption[]).map(canonicalOption)
        : source[key];
  }
  return out;
}

function canonicalField(field: FieldDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = { id: field.id, type: field.type };
  if (field.label !== undefined) {
    out.label = field.label;
  }
  if (field.description !== undefined) {
    out.description = field.description;
  }
  if (field.required !== undefined) {
    out.required = field.required;
  }
  if (field.disabled !== undefined) {
    out.disabled = field.disabled;
  }
  if (field.defaultValue !== undefined) {
    out.defaultValue = field.defaultValue;
  }
  if (field.visibleWhen !== undefined) {
    out.visibleWhen = canonicalCondition(field.visibleWhen);
  }
  if (field.disabledWhen !== undefined) {
    out.disabledWhen = canonicalCondition(field.disabledWhen);
  }
  if (field.rules !== undefined) {
    out.rules = field.rules.map(canonicalRule);
  }
  const props = canonicalProps(field);
  if (props !== undefined) {
    out.props = props;
  }
  if (field.type === 'group') {
    out.children = field.children.map(canonicalField);
  }
  if (field.type === 'table') {
    out.columns = field.columns.map(canonicalField);
  }
  return out;
}

function canonicalSchema(schema: FormSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { schemaVersion: schema.schemaVersion, id: schema.id };
  if (schema.name !== undefined) {
    out.name = schema.name;
  }
  if (schema.description !== undefined) {
    out.description = schema.description;
  }
  out.fields = schema.fields.map(canonicalField);
  return out;
}

/** 规范序列化：键序固定、缩进 2 的 JSON 文本 */
export function serializeSchema(schema: FormSchema): string {
  return JSON.stringify(canonicalSchema(schema), null, 2);
}

/** 解析并结构校验；JSON 语法错误原样抛 SyntaxError，结构非法抛 FormSchemaError */
export function parseSchema(json: string): FormSchema {
  const parsed: unknown = JSON.parse(json);
  const { valid, errors } = validateSchema(parsed);
  if (!valid) {
    throw new FormSchemaError(errors);
  }
  return parsed as FormSchema;
}
