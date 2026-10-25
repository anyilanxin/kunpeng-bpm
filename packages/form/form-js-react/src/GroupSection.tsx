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
/* 分组容器（单层，协议已保证组内不再嵌组）：组级 visibleWhen/disabled 由引擎链式求值 */
import type { FieldValue, FormData, FormEngine, GroupField } from '@kunpeng-io/form-js';
import FieldRow from './FieldRow';

interface GroupSectionProps {
  field: GroupField;
  data: FormData;
  engine: FormEngine;
  errors: Record<string, string>;
  onSetValue: (id: string, value: FieldValue) => void;
}

export default function GroupSection({ field, data, engine, errors, onSetValue }: GroupSectionProps) {
  if (!engine.isVisible(field.id, data)) {
    return null;
  }
  return (
    <section className="form-js-group">
      {field.label ? <div className="form-js-group-title">{field.label}</div> : null}
      {field.children.map((child) => (
        <FieldRow
          key={child.id}
          field={child}
          data={data}
          engine={engine}
          errors={errors}
          onSetValue={onSetValue}
        />
      ))}
    </section>
  );
}
