/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH Classpath-exception-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and licenses/ directory that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/* 数据字段的表单行：label/必填星号/错误外显（antd Form.Item 仅作排版与展示载体，不接 form store） */
import { Form } from 'antd';
import type { FieldDefinition, FieldValue, FormData, FormEngine } from '@kunpeng-io/form-js';
import FieldControl from './FieldControl';

interface FieldRowProps {
  field: FieldDefinition;
  data: FormData;
  engine: FormEngine;
  errors: Record<string, string>;
  onSetValue: (id: string, value: FieldValue) => void;
}

export default function FieldRow({ field, data, engine, errors, onSetValue }: FieldRowProps) {
  if (!engine.isVisible(field.id, data)) {
    return null;
  }
  const disabled = engine.isDisabled(field.id, data);
  const error = errors[field.id];
  return (
    <Form.Item
      label={field.label}
      required={field.required}
      help={error}
      validateStatus={error ? 'error' : undefined}
    >
      <FieldControl
        field={field}
        value={data[field.id] ?? null}
        disabled={disabled}
        onChange={(v) => onSetValue(field.id, v)}
      />
      {field.description ? <div className="form-js-field-desc">{field.description}</div> : null}
    </Form.Item>
  );
}
