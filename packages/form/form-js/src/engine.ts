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
 * FormEngine——表单引擎内核。
 *
 * 设计取向：引擎是**绑定 Schema 的无状态计算服务**（不持有表单数据、不发事件）——
 * 数据归框架层响应式系统所有（Vue ref / React state），引擎只提供纯计算：
 * 默认值推导、可见/禁用求值（联动）、整单校验。这样避免引擎与框架双份状态源
 * 的同步问题，渲染包保持薄绑定；同一引擎可在 Node 端复用做提交侧二次校验。
 *
 * 语义约定：
 * - 空值 = null / '' / []（布尔 false 不是空——开关/勾选有明确假值语义）；
 * - 隐藏字段不参与校验（validate 默认 onlyVisible），但其值保留在数据中不清理；
 * - 字段可见性 = 自身 visibleWhen 与全部祖先组的 visibleWhen 同时满足；禁用态
 *   同理取自身与祖先组 disabled/disabledWhen 的析取（有效值，组态由引擎传播）；
 * - select/radio/checkbox 组的取值必须落在选项集内（越界即校验失败，规则名 option）。
 */
import type {
  Condition,
  FieldDefinition,
  FieldOption,
  FieldValue,
  FormData,
  FormSchema,
  GroupField,
  ScalarValue,
  ValidationRule
} from './schema';

/** 校验规则名（含引擎自动的选项隶属检查 option） */
export type FieldIssueRule =
  | 'required'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'option';

export interface FieldIssue {
  /** 字段 id */
  field: string;
  rule: FieldIssueRule;
  message: string;
}

export interface FormValidationResult {
  valid: boolean;
  issues: FieldIssue[];
  /** 未通过字段 id → 问题清单（稀疏映射，仅含出错字段） */
  byField: Record<string, FieldIssue[]>;
}

export interface ValidateOptions {
  /** 仅校验可见字段（默认 true——隐藏即不拦提交） */
  onlyVisible?: boolean;
}

/** 空态判定：null / undefined / '' / []；false 不算空 */
export function isEmptyValue(value: FieldValue | undefined): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return value === '';
}

/** 求值联动条件（对未知字段取 null 参与——结构校验已保证引用存在，此处不重复防御） */
export function evaluateCondition(condition: Condition, data: FormData): boolean {
  const current: FieldValue | undefined = data[condition.field];
  switch (condition.op) {
    case 'eq':
      return (current ?? null) === condition.value;
    case 'ne':
      return (current ?? null) !== condition.value;
    case 'in': {
      const set = condition.value as ScalarValue[] | undefined;
      if (!Array.isArray(set) || current === null || current === undefined) {
        return false;
      }
      return set.includes(current as ScalarValue);
    }
    case 'notIn':
      return !evaluateCondition({ ...condition, op: 'in' }, data);
    case 'empty':
      return isEmptyValue(current);
    case 'notEmpty':
      return !isEmptyValue(current);
  }
}

// 正则编译缓存（pattern 源字符串在结构校验期已证可编译）
const regexCache = new Map<string, RegExp>();

function compilePattern(source: string): RegExp {
  let re = regexCache.get(source);
  if (!re) {
    re = new RegExp(source);
    regexCache.set(source, re);
  }
  return re;
}

/** option 无宿主规则对象，消息走默认文案 */
interface OptionRule {
  kind: 'option';
}

function ruleMessage(rule: ValidationRule | OptionRule, fieldType: string): string {
  const message = (rule as ValidationRule).message;
  if (message !== undefined) {
    return message;
  }
  switch (rule.kind) {
    case 'required':
      return '不能为空';
    case 'min':
      return fieldType === 'date' ? `不能早于 ${rule.value}` : `不能小于 ${rule.value}`;
    case 'max':
      return fieldType === 'date' ? `不能晚于 ${rule.value}` : `不能大于 ${rule.value}`;
    case 'minLength':
      return `长度不能少于 ${rule.value} 个字符`;
    case 'maxLength':
      return `长度不能超过 ${rule.value} 个字符`;
    case 'pattern':
      return '格式不正确';
    case 'option':
      return '取值不在可选项内';
  }
}

interface FieldIndexEntry {
  field: FieldDefinition;
  /** 祖先组链（外→内；顶层字段为空数组） */
  parents: GroupField[];
}

export class FormEngine {
  readonly schema: FormSchema;
  /** 全部条目（含 group），id → 条目 */
  private readonly entries = new Map<string, FieldIndexEntry>();
  /** 数据字段（不含 group），文档序 */
  private readonly orderedDataFields: FieldIndexEntry[] = [];

  constructor(schema: FormSchema) {
    this.schema = schema;
    const walk = (fields: FieldDefinition[], parents: GroupField[]): void => {
      for (const field of fields) {
        if (field.type === 'group') {
          this.entries.set(field.id, { field, parents });
          walk(field.children, [...parents, field]);
        } else {
          const entry = { field, parents };
          this.entries.set(field.id, entry);
          this.orderedDataFields.push(entry);
        }
      }
    };
    walk(schema.fields, []);
  }

  /** 数据字段清单（文档序，不含 group）——渲染层遍历数据字段用 */
  dataFields(): FieldDefinition[] {
    return this.orderedDataFields.map((e) => e.field);
  }

  /** 按 id 取字段（含 group）；无此 id 抛错（渲染层只遍历 schema 已知 id，不设兜底） */
  field(id: string): FieldDefinition {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`FormEngine: 未知字段 id「${id}」`);
    }
    return entry.field;
  }

  /** 可见性：自身与全部祖先组的 visibleWhen 同时满足 */
  isVisible(id: string, data: FormData): boolean {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`FormEngine: 未知字段 id「${id}」`);
    }
    const chain = [...entry.parents, entry.field];
    return chain.every((f) => f.visibleWhen === undefined || evaluateCondition(f.visibleWhen, data));
  }

  /** 禁用态（有效值）：自身或任一祖先组 disabled/disabledWhen 命中即禁用 */
  isDisabled(id: string, data: FormData): boolean {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`FormEngine: 未知字段 id「${id}」`);
    }
    const chain = [...entry.parents, entry.field];
    return chain.some(
      (f) => f.disabled === true || (f.disabledWhen !== undefined && evaluateCondition(f.disabledWhen, data))
    );
  }

  /** 各类型空数据默认值（defaultValue 未声明时） */
  defaults(): FormData {
    const data: FormData = {};
    for (const { field } of this.orderedDataFields) {
      data[field.id] = field.defaultValue !== undefined ? field.defaultValue : emptyValueOf(field);
    }
    return data;
  }

  /** 整单校验；onlyVisible=true（默认）跳过隐藏字段 */
  validate(data: FormData, options: ValidateOptions = {}): FormValidationResult {
    const onlyVisible = options.onlyVisible !== false;
    const issues: FieldIssue[] = [];
    for (const { field } of this.orderedDataFields) {
      if (onlyVisible && !this.isVisible(field.id, data)) {
        continue;
      }
      issues.push(...this.validateOne(field, data[field.id] ?? null));
    }
    const byField: Record<string, FieldIssue[]> = {};
    for (const issue of issues) {
      (byField[issue.field] ??= []).push(issue);
    }
    return { valid: issues.length === 0, issues, byField };
  }

  private validateOne(field: FieldDefinition, value: FieldValue): FieldIssue[] {
    const issues: FieldIssue[] = [];
    const empty = isEmptyValue(value);
    const rules: ValidationRule[] = [
      ...(field.required === true ? [{ kind: 'required' } as ValidationRule] : []),
      ...(field.rules ?? [])
    ];
    for (const rule of rules) {
      const pass = empty
        ? rule.kind === 'required'
          ? false
          : true // 非必填空值：除 required 外一律放行
        : rulePasses(rule, field, value);
      if (!pass) {
        issues.push({ field: field.id, rule: rule.kind, message: ruleMessage(rule, field.type) });
      }
    }
    // 选项隶属：select / radio / checkbox 组的取值必须落在选项集内（空值放行）
    if (!empty) {
      const options = optionSetOf(field);
      if (options) {
        const values = Array.isArray(value) ? value : [value as ScalarValue];
        for (const v of values) {
          if (!options.has(v)) {
            issues.push({ field: field.id, rule: 'option', message: ruleMessage({ kind: 'option' }, field.type) });
            break;
          }
        }
      }
    }
    return issues;
  }
}

function emptyValueOf(field: FieldDefinition): FieldValue {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return '';
    case 'number':
    case 'date':
      return null;
    case 'select':
      return field.props?.multiple === true ? [] : null;
    case 'radio':
      return null;
    case 'checkbox':
      return field.props?.options ? [] : false;
    case 'switch':
      return false;
    case 'group':
      throw new Error('FormEngine: group 不是数据字段');
  }
}

function optionSetOf(field: FieldDefinition): Set<ScalarValue> | null {
  let options: FieldOption[] | undefined;
  if (field.type === 'select' || field.type === 'radio') {
    options = field.props?.options;
  } else if (field.type === 'checkbox') {
    options = field.props?.options;
  }
  return options ? new Set(options.map((o) => o.value)) : null;
}

function rulePasses(rule: ValidationRule, field: FieldDefinition, value: FieldValue): boolean {
  switch (rule.kind) {
    case 'required':
      return !isEmptyValue(value);
    case 'min':
      // number 数值界 / date ISO 字符串字典序（YYYY-MM-DD 定长，字典序即时间序）
      if (field.type === 'date') {
        return typeof value === 'string' ? value >= (rule.value as string) : true;
      }
      return typeof value === 'number' ? value >= (rule.value as number) : true;
    case 'max':
      if (field.type === 'date') {
        return typeof value === 'string' ? value <= (rule.value as string) : true;
      }
      return typeof value === 'number' ? value <= (rule.value as number) : true;
    case 'minLength':
      return typeof value === 'string' ? value.length >= (rule.value as number) : true;
    case 'maxLength':
      return typeof value === 'string' ? value.length <= (rule.value as number) : true;
    case 'pattern':
      return typeof value === 'string' ? compilePattern(rule.value as string).test(value) : true;
  }
}
