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
 * Schema 结构校验：parseSchema 的守门人，也可独立用于宿主侧（设计器保存前）。
 *
 * 取向：严格校验已知键的类型与互相关系（含规则×类型适用性、条件引用存在性、
 * 选项值唯一性），未知键忽略（协议版本化演进的前向兼容靠 schemaVersion 把关）。
 * 错误逐条以 `路径: 说明` 汇总返回，不做半通过、不做自动修复。
 */
import {
  SCHEMA_VERSION,
  type Condition,
  type FieldDefinition,
  type FieldOption,
  type FormSchema,
  type ScalarValue,
  type ValidationRule,
  type ValidationRuleKind
} from './schema';

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

const FIELD_TYPES: ReadonlySet<string> = new Set([
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'checkbox',
  'date',
  'switch',
  'group'
]);

const CONDITION_OPS: ReadonlySet<string> = new Set(['eq', 'ne', 'in', 'notIn', 'empty', 'notEmpty']);

const RULE_KINDS: ReadonlySet<string> = new Set([
  'required',
  'min',
  'max',
  'minLength',
  'maxLength',
  'pattern'
]);

/** 规则 kind 允许出现的字段类型（required 全类型适用） */
const RULE_TYPE_FIT: Record<Exclude<ValidationRuleKind, 'required'>, ReadonlySet<string>> = {
  min: new Set(['number', 'date']),
  max: new Set(['number', 'date']),
  minLength: new Set(['text', 'textarea']),
  maxLength: new Set(['text', 'textarea']),
  pattern: new Set(['text', 'textarea'])
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isScalar(v: unknown): v is ScalarValue {
  const t = typeof v;
  return t === 'string' || t === 'number' || t === 'boolean';
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

interface WalkContext {
  errors: string[];
  /** 全文档已见 id（含 group），用于唯一性判定 */
  seenIds: Set<string>;
  /** 全文档数据字段 id，条件引用的存在性判定（group 不可被引用） */
  dataFieldIds: Set<string>;
  /** 条件引用先行收集，收完字段后回查（允许前向引用） */
  conditionRefs: Array<{ path: string; fieldId: string }>;
}

function checkOptionalString(ctx: WalkContext, parent: Record<string, unknown>, key: string, path: string): void {
  const v = parent[key];
  if (v !== undefined && typeof v !== 'string') {
    ctx.errors.push(`${path}.${key}: 须为字符串`);
  }
}

function checkOptionalBoolean(ctx: WalkContext, parent: Record<string, unknown>, key: string, path: string): void {
  const v = parent[key];
  if (v !== undefined && typeof v !== 'boolean') {
    ctx.errors.push(`${path}.${key}: 须为布尔值`);
  }
}

function checkCondition(raw: unknown, path: string, ctx: WalkContext): void {
  if (!isObject(raw)) {
    ctx.errors.push(`${path}: 须为条件对象`);
    return;
  }
  if (!isNonEmptyString(raw.field)) {
    ctx.errors.push(`${path}.field: 须为非空字符串`);
  } else {
    ctx.conditionRefs.push({ path: `${path}.field`, fieldId: raw.field });
  }
  if (typeof raw.op !== 'string' || !CONDITION_OPS.has(raw.op)) {
    ctx.errors.push(`${path}.op: 须为 ${[...CONDITION_OPS].join(' / ')} 之一`);
    return;
  }
  const value = raw.value;
  if (raw.op === 'eq' || raw.op === 'ne') {
    if (!isScalar(value)) {
      ctx.errors.push(`${path}.value: ${raw.op} 条件须为单标量`);
    }
  } else if (raw.op === 'in' || raw.op === 'notIn') {
    if (!Array.isArray(value) || value.length === 0 || !value.every(isScalar)) {
      ctx.errors.push(`${path}.value: ${raw.op} 条件须为非空标量数组`);
    }
  } else if (value !== undefined) {
    ctx.errors.push(`${path}.value: ${raw.op} 条件不应携带 value`);
  }
}

function checkRules(raw: unknown, fieldType: string, path: string, ctx: WalkContext): void {
  if (!Array.isArray(raw)) {
    ctx.errors.push(`${path}: 须为数组`);
    return;
  }
  raw.forEach((rule: unknown, i: number) => {
    const rulePath = `${path}[${i}]`;
    if (!isObject(rule)) {
      ctx.errors.push(`${rulePath}: 须为规则对象`);
      return;
    }
    const kind = rule.kind;
    if (typeof kind !== 'string' || !RULE_KINDS.has(kind)) {
      ctx.errors.push(`${rulePath}.kind: 须为 ${[...RULE_KINDS].join(' / ')} 之一`);
      return;
    }
    if (kind !== 'required') {
      const fit = RULE_TYPE_FIT[kind as Exclude<ValidationRuleKind, 'required'>];
      if (!fit.has(fieldType)) {
        ctx.errors.push(`${rulePath}.kind: ${kind} 规则不适用于 ${fieldType} 字段`);
      }
      if (kind === 'pattern') {
        if (!isNonEmptyString(rule.value)) {
          ctx.errors.push(`${rulePath}.value: pattern 规则须为非空正则源字符串`);
        } else {
          try {
            new RegExp(rule.value);
          } catch {
            ctx.errors.push(`${rulePath}.value: 正则无法编译`);
          }
        }
      } else if (kind === 'min' || kind === 'max') {
        // number 取数值界；date 取 YYYY-MM-DD 界（与引擎的字典序比较配套）
        if (fieldType === 'date') {
          if (typeof rule.value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rule.value)) {
            ctx.errors.push(`${rulePath}.value: ${kind}（date）规则须为 YYYY-MM-DD 日期字符串`);
          }
        } else if (typeof rule.value !== 'number' || !Number.isFinite(rule.value)) {
          ctx.errors.push(`${rulePath}.value: ${kind} 规则须为有限数值`);
        }
      } else if (typeof rule.value !== 'number' || !Number.isFinite(rule.value)) {
        ctx.errors.push(`${rulePath}.value: ${kind} 规则须为有限数值`);
      }
    }
    checkOptionalString(ctx, rule, 'message', rulePath);
  });
}

function checkOptions(raw: unknown, path: string, ctx: WalkContext): void {
  if (!Array.isArray(raw) || raw.length === 0) {
    ctx.errors.push(`${path}: 须为非空选项数组`);
    return;
  }
  const seen = new Set<string>();
  raw.forEach((option: unknown, i: number) => {
    const optPath = `${path}[${i}]`;
    if (!isObject(option)) {
      ctx.errors.push(`${optPath}: 须为选项对象`);
      return;
    }
    if (!isNonEmptyString(option.label)) {
      ctx.errors.push(`${optPath}.label: 须为非空字符串`);
    }
    if (!isScalar(option.value)) {
      ctx.errors.push(`${optPath}.value: 须为标量`);
    } else {
      const key = `${typeof option.value}:${String(option.value)}`;
      if (seen.has(key)) {
        ctx.errors.push(`${optPath}.value: 选项值重复（${String(option.value)}）`);
      }
      seen.add(key);
    }
  });
}

function checkDefaultValue(field: Record<string, unknown>, path: string, ctx: WalkContext): void {
  const value = field.defaultValue;
  if (value === undefined) {
    return;
  }
  const type = field.type as string;
  const fail = (): void => {
    ctx.errors.push(`${path}.defaultValue: 与 ${type} 字段的值形状不符`);
  };
  if (type === 'text' || type === 'textarea' || type === 'date') {
    if (value !== null && typeof value !== 'string') fail();
  } else if (type === 'number') {
    if (value !== null && typeof value !== 'number') fail();
  } else if (type === 'select' || type === 'radio') {
    const multiple = isObject(field.props) && field.props.multiple === true;
    if (multiple) {
      if (value !== null && (!Array.isArray(value) || !value.every(isScalar))) fail();
    } else if (value !== null && !isScalar(value)) {
      fail();
    }
  } else if (type === 'checkbox') {
    const grouped = isObject(field.props) && Array.isArray(field.props.options);
    if (grouped) {
      if (value !== null && (!Array.isArray(value) || !value.every(isScalar))) fail();
    } else if (typeof value !== 'boolean') {
      fail();
    }
  } else if (type === 'switch') {
    if (typeof value !== 'boolean') fail();
  }
}

function checkProps(field: Record<string, unknown>, path: string, ctx: WalkContext): void {
  const props = field.props;
  if (props === undefined) {
    return;
  }
  if (!isObject(props)) {
    ctx.errors.push(`${path}.props: 须为对象`);
    return;
  }
  const type = field.type as string;
  checkOptionalString(ctx, props, 'placeholder', `${path}.props`);
  if (type === 'text' || type === 'textarea') {
    if (props.maxLength !== undefined && (typeof props.maxLength !== 'number' || props.maxLength < 1)) {
      ctx.errors.push(`${path}.props.maxLength: 须为正数`);
    }
  }
  if (type === 'textarea' && props.rows !== undefined && (typeof props.rows !== 'number' || props.rows < 1)) {
    ctx.errors.push(`${path}.props.rows: 须为正数`);
  }
  if (type === 'text') {
    checkOptionalBoolean(ctx, props, 'clearable', `${path}.props`);
  }
  if (type === 'number') {
    for (const key of ['min', 'max'] as const) {
      const v = props[key];
      if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v))) {
        ctx.errors.push(`${path}.props.${key}: 须为数值`);
      }
    }
    const step = props.step;
    if (step !== undefined && (typeof step !== 'number' || !Number.isFinite(step))) {
      ctx.errors.push(`${path}.props.step: 须为数值`);
    } else if (typeof step === 'number' && step <= 0) {
      ctx.errors.push(`${path}.props.step: 须为正数`);
    }
  }
  if (type === 'select') {
    checkOptions(props.options, `${path}.props.options`, ctx);
    checkOptionalBoolean(ctx, props, 'multiple', `${path}.props`);
    checkOptionalBoolean(ctx, props, 'clearable', `${path}.props`);
  }
  if (type === 'radio') {
    checkOptions(props.options, `${path}.props.options`, ctx);
  }
  if (type === 'checkbox' && props.options !== undefined) {
    checkOptions(props.options, `${path}.props.options`, ctx);
  }
}

function checkField(raw: unknown, path: string, ctx: WalkContext, depth: number): void {
  if (!isObject(raw)) {
    ctx.errors.push(`${path}: 须为字段对象`);
    return;
  }
  if (!isNonEmptyString(raw.id)) {
    ctx.errors.push(`${path}.id: 须为非空字符串`);
  } else if (ctx.seenIds.has(raw.id)) {
    ctx.errors.push(`${path}.id: 与其他字段重复（${raw.id}）`);
  } else {
    ctx.seenIds.add(raw.id);
  }
  const type = raw.type;
  if (typeof type !== 'string' || !FIELD_TYPES.has(type)) {
    ctx.errors.push(`${path}.type: 须为 ${[...FIELD_TYPES].join(' / ')} 之一`);
    return;
  }
  checkOptionalString(ctx, raw, 'label', path);
  checkOptionalString(ctx, raw, 'description', path);
  checkOptionalBoolean(ctx, raw, 'required', path);
  checkOptionalBoolean(ctx, raw, 'disabled', path);
  if (raw.visibleWhen !== undefined) {
    checkCondition(raw.visibleWhen, `${path}.visibleWhen`, ctx);
  }
  if (raw.disabledWhen !== undefined) {
    checkCondition(raw.disabledWhen, `${path}.disabledWhen`, ctx);
  }
  if (raw.rules !== undefined) {
    checkRules(raw.rules, type, `${path}.rules`, ctx);
  }
  checkDefaultValue(raw, path, ctx);
  checkProps(raw, path, ctx);
  if (type === 'group') {
    // 一期布局契约：分组仅允许单层（组内再嵌组直接判非法，杜绝树形歧义）
    if (depth >= 1) {
      ctx.errors.push(`${path}: group 仅允许单层嵌套`);
    }
    if (!Array.isArray(raw.children)) {
      ctx.errors.push(`${path}.children: 须为数组`);
      return;
    }
    raw.children.forEach((child: unknown, i: number) => {
      checkField(child, `${path}.children[${i}]`, ctx, depth + 1);
    });
  } else {
    ctx.dataFieldIds.add(raw.id as string);
  }
}

/** 校验未知对象是否为合法 FormSchema；合法与非法都给出完整错误清单，绝不部分通过 */
export function validateSchema(input: unknown): SchemaValidationResult {
  const ctx: WalkContext = {
    errors: [],
    seenIds: new Set(),
    dataFieldIds: new Set(),
    conditionRefs: []
  };
  if (!isObject(input)) {
    return { valid: false, errors: ['根节点: 须为对象'] };
  }
  if (input.schemaVersion !== SCHEMA_VERSION) {
    ctx.errors.push(`schemaVersion: 须为 ${SCHEMA_VERSION}`);
  }
  if (!isNonEmptyString(input.id)) {
    ctx.errors.push('id: 须为非空字符串');
  }
  checkOptionalString(ctx, input, 'name', '根节点');
  checkOptionalString(ctx, input, 'description', '根节点');
  if (!Array.isArray(input.fields)) {
    ctx.errors.push('fields: 须为数组');
  } else {
    input.fields.forEach((field: unknown, i: number) => {
      checkField(field, `fields[${i}]`, ctx, 0);
    });
  }
  // 条件引用回查（允许前向引用，故字段收集完成后统一判定）
  for (const ref of ctx.conditionRefs) {
    if (!ctx.dataFieldIds.has(ref.fieldId)) {
      ctx.errors.push(`${ref.path}: 引用的字段（${ref.fieldId}）不存在或不是数据字段`);
    }
  }
  return { valid: ctx.errors.length === 0, errors: ctx.errors };
}

/** 类型守卫便捷形式 */
export function isValidSchema(input: unknown): input is FormSchema {
  return validateSchema(input).valid;
}

export type { Condition, FieldDefinition, FieldOption, FormSchema, ValidationRule };
