/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
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
/*
 * 明细表字段（与 Vue 版 TableField 同形）：antd Table 行内编辑——列控件复用
 * FieldControl（列即标量字段定义）；数据归宿主（增删行/单元格编辑经回调上抛
 * FormRenderer 统一进数据流）；单元格错误键 = `表id[行].列id`（引擎 issueKey 同源）。
 */
import { Button, Form, Table } from 'antd';
import type { TableProps } from 'antd';
import type { FieldValue, FormData, FormEngine, TableField as TableFieldType } from '@kunpeng-io/form-js';
import FieldControl from './FieldControl';

interface TableControlProps {
  field: TableFieldType;
  data: FormData;
  engine: FormEngine;
  errors: Record<string, string>;
  onAddRow: (fieldId: string) => void;
  onRemoveRow: (fieldId: string, rowIndex: number) => void;
  onSetCell: (fieldId: string, rowIndex: number, columnId: string, value: FieldValue) => void;
}

export default function TableControl({
  field,
  data,
  engine,
  errors,
  onAddRow,
  onRemoveRow,
  onSetCell
}: TableControlProps) {
  if (!engine.isVisible(field.id, data)) {
    return null;
  }
  const disabled = engine.isDisabled(field.id, data);
  const rows = Array.isArray(data[field.id]) ? (data[field.id] as FormData[]) : [];
  const minRows = field.props?.minRows ?? 0;
  const atMax = field.props?.maxRows !== undefined && rows.length >= field.props.maxRows;
  const tableError = errors[field.id];
  const cellError = (rowIndex: number, columnId: string): string | undefined =>
    errors[`${field.id}[${rowIndex}].${columnId}`];

  const columns: TableProps<FormData>['columns'] = [
    ...field.columns.map((column) => ({
      title: column.label,
      key: column.id,
      render: (_: unknown, __: FormData, rowIndex: number) => (
        <div>
          <FieldControl
            field={column}
            value={rows[rowIndex]?.[column.id] ?? null}
            disabled={disabled}
            onChange={(v: FieldValue) => onSetCell(field.id, rowIndex, column.id, v)}
          />
          {cellError(rowIndex, column.id) ? (
            <div className="form-js-cell-error">{cellError(rowIndex, column.id)}</div>
          ) : null}
        </div>
      )
    })),
    {
      title: '操作',
      key: '__actions',
      width: 72,
      align: 'center' as const,
      render: (_: unknown, __: FormData, rowIndex: number) => (
        <Button
          danger
          size="small"
          type="link"
          disabled={disabled || rows.length <= minRows}
          onClick={() => onRemoveRow(field.id, rowIndex)}
        >
          删除
        </Button>
      )
    }
  ];

  return (
    <Form.Item label={field.label} required={field.required} help={tableError} validateStatus={tableError ? 'error' : undefined}>
      <div className="form-js-table">
        <Table<FormData>
          columns={columns}
          dataSource={rows}
          rowKey={(_, index) => String(index)}
          size="small"
          pagination={false}
        />
        {!atMax ? (
          <div className="form-js-table-actions">
            <Button size="small" disabled={disabled} onClick={() => onAddRow(field.id)}>
              添加一行
            </Button>
          </div>
        ) : null}
        {field.description ? <div className="form-js-field-desc">{field.description}</div> : null}
      </div>
    </Form.Item>
  );
}
