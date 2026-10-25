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
 * @kunpeng-io/form-js 出口：统一设计协议（类型 + 校验 + 引擎 + 序列化）。
 * 渲染包（form-js-vue / form-js-react）从这里取协议与引擎，保证跨框架同源。
 */
export {
  SCHEMA_VERSION,
  type CheckboxField,
  type CheckboxFieldProps,
  type Condition,
  type ConditionOperator,
  type DataFieldType,
  type DateField,
  type DateFieldProps,
  type FieldDefinition,
  type FieldOption,
  type FieldValue,
  type FormData,
  type FormSchema,
  type GroupField,
  type NumberField,
  type NumberFieldProps,
  type RadioField,
  type RadioFieldProps,
  type ScalarValue,
  type SelectField,
  type SelectFieldProps,
  type SwitchField,
  type TextField,
  type TextFieldProps,
  type TextareaField,
  type TextareaFieldProps,
  type ValidationRule,
  type ValidationRuleKind
} from './schema';
export { FormEngine, evaluateCondition, isEmptyValue, type FieldIssue, type FormValidationResult, type ValidateOptions } from './engine';
export { FormSchemaError, parseSchema, serializeSchema } from './serialize';
export { isValidSchema, validateSchema, type SchemaValidationResult } from './validate';
