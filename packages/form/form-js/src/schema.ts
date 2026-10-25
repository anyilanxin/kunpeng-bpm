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
 * 统一设计协议——类型体系。
 *
 * 设计取向（净室自研，勿对照任何上游表单项目）：
 * - 字段以 `type` 判别联合建模，类型专属参数收敛在 `props`，公共属性平铺；
 * - 一切值均为 JSON 安全标量（日期为 `YYYY-MM-DD` 字符串），FormData 可直接
 *   JSON 序列化往返，渲染层负责控件值（如 Date 对象）与协议值的互转；
 * - 联动与校验全部声明式（条件比较 + 规则表），保证 Schema 可离线校验、
 *   可在 Node 端复用（提交侧二次校验）；
 * - `group` 为纯布局容器（单层嵌套），不产出数据。
 */

/** 协议版本：结构变更时递增，解析端按此分派（一期恒 1） */
export const SCHEMA_VERSION = 1;

export type ScalarValue = string | number | boolean;

/** 字段值：标量 / 标量数组 / null（数组用于多选 select 与 checkbox 组） */
export type FieldValue = ScalarValue | ScalarValue[] | null;

/** 表单数据：数据字段 id → 值；group 不占键 */
export type FormData = Record<string, FieldValue>;

export interface FieldOption {
  label: string;
  value: ScalarValue;
}

/**
 * 联动条件操作符。
 * - eq/ne：单标量等值比较；in/notIn：集合隶属；empty/notEmpty：空态判定
 *   （null、''、[] 均视为空；布尔 false 不是空——开关/勾选有明确的假值语义）
 */
export type ConditionOperator = 'eq' | 'ne' | 'in' | 'notIn' | 'empty' | 'notEmpty';

export interface Condition {
  /** 被引用字段的 id（必须是数据字段，不能引用 group） */
  field: string;
  op: ConditionOperator;
  /** eq/ne 单标量；in/notIn 标量数组；empty/notEmpty 省略 */
  value?: ScalarValue | ScalarValue[];
}

export type ValidationRuleKind =
  | 'required'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern';

/**
 * 声明式校验规则。kind 与字段类型的适用关系（结构校验强制）：
 * - required：任意类型
 * - min/max：number（数值界）、date（日期界，ISO 字符串字典序比较）
 * - minLength/maxLength/pattern：text、textarea（字符串）
 */
export interface ValidationRule {
  kind: ValidationRuleKind;
  /** min/max/minLength/maxLength 为数值；pattern 为正则源字符串 */
  value?: number | string;
  /** 覆盖默认错误文案 */
  message?: string;
}

export interface TextFieldProps {
  placeholder?: string;
  maxLength?: number;
  clearable?: boolean;
}

export interface TextareaFieldProps {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export interface NumberFieldProps {
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface SelectFieldProps {
  options: FieldOption[];
  multiple?: boolean;
  placeholder?: string;
  clearable?: boolean;
}

export interface RadioFieldProps {
  options: FieldOption[];
}

/** checkbox 无 options = 单个布尔勾选；有 options = 多选组（值为标量数组） */
export interface CheckboxFieldProps {
  options?: FieldOption[];
}

export interface DateFieldProps {
  placeholder?: string;
}

interface FieldCommon {
  /** 数据键，文档内全局唯一（含 group id） */
  id: string;
  label?: string;
  /** 辅助说明文案（渲染为字段说明） */
  description?: string;
  /** 必填缩写：等价于 rules 前置 { kind: 'required' } */
  required?: boolean;
  disabled?: boolean;
  defaultValue?: FieldValue;
  /** 不满足则字段隐藏（隐藏字段不校验、值保留在数据中） */
  visibleWhen?: Condition;
  /** 不满足则字段禁用 */
  disabledWhen?: Condition;
  rules?: ValidationRule[];
}

export interface TextField extends FieldCommon {
  type: 'text';
  props?: TextFieldProps;
}

export interface TextareaField extends FieldCommon {
  type: 'textarea';
  props?: TextareaFieldProps;
}

export interface NumberField extends FieldCommon {
  type: 'number';
  props?: NumberFieldProps;
}

export interface SelectField extends FieldCommon {
  type: 'select';
  props?: SelectFieldProps;
}

export interface RadioField extends FieldCommon {
  type: 'radio';
  props?: RadioFieldProps;
}

export interface CheckboxField extends FieldCommon {
  type: 'checkbox';
  props?: CheckboxFieldProps;
}

export interface DateField extends FieldCommon {
  type: 'date';
  props?: DateFieldProps;
}

export interface SwitchField extends FieldCommon {
  type: 'switch';
}

/** 分组容器：单层嵌套（children 内不得再出现 group），不产出数据 */
export interface GroupField extends FieldCommon {
  type: 'group';
  children: FieldDefinition[];
}

export type FieldDefinition = FieldCommon & (
  | TextField
  | TextareaField
  | NumberField
  | SelectField
  | RadioField
  | CheckboxField
  | DateField
  | SwitchField
  | GroupField
);

/** 数据字段类型集合（不含 group） */
export type DataFieldType = Exclude<FieldDefinition['type'], 'group'>;

export interface FormSchema {
  schemaVersion: number;
  /** 表单定义 id（宿主侧关联流程定义等场景使用） */
  id: string;
  name?: string;
  description?: string;
  fields: FieldDefinition[];
}
