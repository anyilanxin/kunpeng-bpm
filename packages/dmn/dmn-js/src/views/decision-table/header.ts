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
 * 表头渲染：clause 族标（首列 When/Then/Annotations、次列 And）+ 列名/类型
 * （名 16px、类型 12px 右对齐）+ 族尾 hover 骑缝加列圆钮 + 铅笔开列编辑
 * 弹层（对齐 dmn-js ref-clause-editor：名 + 类型 + 删列）。
 */
import { createElement } from 'inferno-create-element';
import { BUILTIN_TYPES, type ColSpec } from './sheet';
import type { TableCommands } from './commands';
import type { ColumnTools } from './columns';

export function createHeaderTools(opts: {
  table: any;
  commands: TableCommands;
  columns: ColumnTools;
}) {
  const h = createElement;
  const { table, commands, columns } = opts;
  let clauseEditorPop: HTMLElement | null = null;

  const openClauseEditor = (anchor: HTMLElement, spec: ColSpec): void => {
    closeClauseEditor();
    if (!spec.clause) return;
    const bo = spec.clause;
    const isInput = spec.colType === 'input';
    const name0 = isInput ? bo.get('inputExpression')?.get('text') ?? '' : bo.get('name') ?? '';
    const type0 = isInput ? bo.get('inputExpression')?.get('typeRef') ?? '' : bo.get('typeRef') ?? '';
    const familyClauses: any[] = table.get(spec.family === 'input' ? 'input' : spec.family === 'output' ? 'output' : 'annotation') ?? [];

    const pop = document.createElement('div');
    pop.className = 'ref-clause-editor';
    const row1 = document.createElement('div');
    row1.className = 'dms-form-control';
    const lbl1 = document.createElement('label');
    lbl1.className = 'dms-label';
    lbl1.textContent = isInput ? 'Input expression' : 'Output name';
    const nameInput = document.createElement('input');
    nameInput.className = 'dms-input-label';
    nameInput.value = name0;
    row1.append(lbl1, nameInput);
    const row2 = document.createElement('div');
    row2.className = 'dms-form-control clause-type-select';
    const lbl2 = document.createElement('label');
    lbl2.className = 'dms-label';
    lbl2.textContent = isInput ? 'Input type' : 'Output type';
    const typeSelect = document.createElement('select');
    typeSelect.className = 'clause-type-native';
    for (const t of BUILTIN_TYPES) {
      const o = document.createElement('option');
      o.value = t; o.textContent = t;
      typeSelect.append(o);
    }
    if (type0 && !BUILTIN_TYPES.includes(type0)) {
      const o = document.createElement('option');
      o.value = type0; o.textContent = type0;
      typeSelect.append(o);
    }
    typeSelect.value = type0 || 'string';
    row2.append(lbl2, typeSelect);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-clause-action';
    removeBtn.textContent = `删除${isInput ? '输入' : '输出'}列`;
    if (familyClauses.length <= 1) removeBtn.disabled = true;
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeClauseEditor();
      commands.removeClause(spec);
    });
    pop.append(row1, row2, removeBtn);

    const host = anchor.closest('.dmn-tablejs-host') as HTMLElement ?? document.body;
    const aRect = anchor.getBoundingClientRect();
    const hRect = host.getBoundingClientRect();
    pop.style.position = 'absolute';
    pop.style.top = `${aRect.bottom - hRect.top + 4}px`;
    pop.style.left = `${aRect.left - hRect.left}px`;
    pop.style.zIndex = '60';
    host.append(pop);
    nameInput.focus();
    nameInput.select();
    const commit = () => {
      closeClauseEditor();
      if (nameInput.value !== name0) commands.commitColName(spec, nameInput.value);
      if ((typeSelect.value || 'string') !== (type0 || 'string')) commands.commitColType(spec, typeSelect.value);
    };
    pop.addEventListener('mousedown', (e) => e.stopPropagation());
    const onDoc = (e: MouseEvent) => {
      if (!pop.contains(e.target as Node) && e.target !== anchor) {
        commit();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeClauseEditor();
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
    };
    (pop as any).__cleanup = () => {
      document.removeEventListener('mousedown', onDoc, true);
      document.removeEventListener('keydown', onKey);
    };
    document.addEventListener('mousedown', onDoc, true);
    document.addEventListener('keydown', onKey);
    clauseEditorPop = pop;
  };

  const closeClauseEditor = (): void => {
    if (clauseEditorPop) {
      (clauseEditorPop as any).__cleanup?.();
      clauseEditorPop.remove();
      clauseEditorPop = null;
    }
  };

  const headerCell = (spec: ColSpec, colId: string): any => {
    const width = columns.clauseWidth(spec);
    const style = width ? { width: `${width}px` } : undefined;
    if (spec.colType === 'rownum') {
      return h('th', {
        class: 'index-column',
        'data-element-id': colId,
        style
      }, [columns.resizeHandleVdom(spec)]);
    }
    const cellCls = spec.colType === 'input' ? 'input-cell' : spec.colType === 'output' ? 'output-cell' : 'annotation-cell';
    const children: any[] = [];
    // 族尾加列圆钮（hover 列时浮现，骑右缘中点）
    if (spec.isFamilyTail && (spec.family === 'input' || spec.family === 'output')) {
      children.push(h('div', { class: `add-${spec.family} actionable` }, [
        h('button', {
          class: 'action-icon tjs-plus',
          type: 'button',
          title: spec.family === 'input' ? 'Add input' : 'Add output',
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            commands.addClause(spec.family as 'input' | 'output');
          }
        }, '+')
      ]));
    }
    // 铅笔（hover 浮现）：开列编辑弹层
    if (spec.clause) {
      children.push(h('button', {
        class: 'edit-button tjs-pencil',
        type: 'button',
        'aria-label': 'Edit clause',
        title: '编辑列',
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          openClauseEditor(e.currentTarget as HTMLElement, spec);
        }
      }, '\u270E'));
    }
    // clause 族标（首列 When/Then/Annotations、次列 And）
    children.push(h('div', { class: 'clause' }, spec.group));
    if (spec.clause) {
      const name = spec.colType === 'input'
        ? spec.clause.get('inputExpression')?.get('text') ?? ''
        : spec.clause.get('name') ?? '';
      const type = spec.colType === 'input'
        ? spec.clause.get('inputExpression')?.get('typeRef') ?? ''
        : spec.clause.get('typeRef') ?? '';
      children.push(h('div', {
        class: spec.colType === 'input' ? 'input-expression' : 'output-name',
        title: name
      }, name));
      children.push(h('div', {
        class: spec.colType === 'input' ? 'input-variable' : 'output-variable',
        title: type
      }, type));
    }
    children.push(columns.resizeHandleVdom(spec));
    return h('th', {
      class: cellCls,
      'data-element-id': colId,
      style
    }, children);
  };

  return { headerCell, openClauseEditor, closeClauseEditor };
}
