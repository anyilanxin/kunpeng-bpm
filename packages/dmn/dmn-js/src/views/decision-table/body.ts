/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and licenses/ directory that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * for more details (a copy is included in the licenses/ directory that
 * accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 表体渲染：规则行（行号右对齐 + hover 删行钮、空输入格 - 居中）、
 * 单击选中态（蓝 outline，由 table-js selection 驱动）、双击就地编辑态。
 */
import { createElement } from 'inferno-create-element';
import type { ColSpec } from './sheet';
import type { EditState } from './editing';
import { editInput } from './editing';
import type { TableCommands } from './commands';

export function createBodyCell(opts: {
  instance: any;
  edit: EditState;
  commands: TableCommands;
  getColSpecs: () => ColSpec[];
  cancelEdit: () => void;
}) {
  const h = createElement;
  const { instance, edit, commands, getColSpecs, cancelEdit } = opts;

  return function bodyCell(cell: any, colIndex: number): any {
    const spec = getColSpecs()[colIndex];
    const row = cell.row;
    const rowIndex = row.root.rows.indexOf(row);
    const isSelected = instance.get('selection').get() === cell;
    const isEditing = edit.cellId === cell.id && edit.kind === 'cell';
    let content: any = null;
    let cls = '';
    if (spec.colType === 'rownum') {
      cls = 'rule-index';
      const rule = row.businessObject;
      content = [
        h('span', { class: 'rule-index-value' }, String(rowIndex + 1)),
        h('button', {
          class: 'rule-index-remove',
          type: 'button',
          title: '删除规则',
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            commands.removeRule(rule);
          }
        }, '\u2715')
      ];
    } else if (spec.colType === 'annotation') {
      cls = 'annotation';
      const text = commands.cellText(cell);
      content = text || null;
    } else {
      cls = spec.colType === 'input' ? 'input-cell' : 'output-cell';
      if (isEditing) {
        cls += ' editing';
        content = editInput(commands.cellText(cell), (v) => commands.commitCell(cell, v), cancelEdit);
      } else {
        const text = commands.cellText(cell);
        if (spec.colType === 'input' && !text) cls += ' empty';
        content = text || (spec.colType === 'input' ? '-' : null);
      }
    }
    return h('td', {
      class: cls + (isSelected ? ' selected' : ''),
      'data-element-id': cell.id
    }, content);
  };
}
