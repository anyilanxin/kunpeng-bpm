/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 决策表下钻视图（table-js 底座，版式/交互对齐 kunpeng-modeler 的
 * @kunpeng-js/dmn-js 决策表——同为 table-js 之上的组件层，2026-10-27 用户
 * 裁定「参考 kunpeng-modeler 改」）：
 * - 结构（组件注册对齐 dmn-js-decision-table）：table.before=标题条（决策名
 *   就地编辑 + 竖分隔 + Hit policy 下拉浮层）；table.head=行号空列 + 输入/
 *   输出列头（clause 族标 When/And/Then、名 16px、类型 12px 右对齐、族尾
 *   hover 骑缝圆钮加列、铅笔开列编辑弹层）；table.body=规则行（行号右对齐 +
 *   hover 删行钮、空输入格 - 居中）；table.foot=整行 hover 的加行行；
 * - 交互：单击选择（蓝 outline）、双击就地编辑（浮层）、加列/加行/删列/删行
 *   全走 DmnModeling 命令（可撤销），命令后换根重建（rAF 跳出 Inferno 事件栈）；
 * - 列宽：默认 56/192px 经 vdom 下发 + WeakMap 记忆拖拽（Excel 语义骑缝手柄）。
 */
import { createElement } from 'inferno-create-element';
import Table from '@kunpeng-io/table-js';
import selectionModule from '@kunpeng-io/table-js/lib/features/selection';
import interactionEventsModule from '@kunpeng-io/table-js/lib/features/interaction-events';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnModeling } from '../command/DmnModeling';

export interface TableEditorDeps {
  factory: DmnFactory;
  modeling: DmnModeling;
  /** 图（diagram-js）侧事件总线——命令栈变更监听源（Table 实例自带独立注入器） */
  eventBus: any;
}

/** 列宽记忆（WeakMap 按子句 bo 弱引用：换根重渲后手动调宽不丢） */
const COL_WIDTHS = new WeakMap<object, number>();
const ROWNUM_COL_KEY: object = { col: 'rownum' };
const EMPTY_INPUT_COL_KEY: object = { col: 'empty-input' };
const EMPTY_OUTPUT_COL_KEY: object = { col: 'empty-output' };
const EMPTY_ANN_COL_KEY: object = { col: 'empty-ann' };
const MIN_COL_WIDTH = 40;
/** 默认列宽（对齐 kunpeng-modeler：行号 56 / 数据列 192） */
const INDEX_COL_WIDTH = 56;
const DEFAULT_COL_WIDTH = 192;

/** 命中策略词表（DMN 1.6 §7.2.4；label/explanation 对齐 kunpeng-modeler） */
const HIT_POLICIES: Array<{ value: string; label: string; explanation: string }> = [
  { value: 'UNIQUE', label: 'Unique', explanation: '最多命中一条规则（多条命中即报错）' },
  { value: 'FIRST', label: 'First', explanation: '自上而下取首条命中规则' },
  { value: 'PRIORITY', label: 'Priority', explanation: '按输出优先级取最高的一条' },
  { value: 'ANY', label: 'Any', explanation: '任意命中（多条须同输出，否则报错）' },
  { value: 'COLLECT', label: 'Collect', explanation: '收集全部命中输出（可聚合）' },
  { value: 'RULE ORDER', label: 'Rule order', explanation: '按规则声明序返回全部命中' },
  { value: 'OUTPUT ORDER', label: 'Output order', explanation: '按输出优先级序返回全部命中' }
];

/** 内建类型集（DMN 1.6 §10.3.1） */
const BUILTIN_TYPES = [
  'string', 'boolean', 'number', 'integer', 'long', 'double', 'decimal',
  'date', 'time', 'date and time', 'days and time duration',
  'years and months duration', 'Any'
];

/** 正在就地编辑的 cell id（视图生命周期内单值；null=无） */
interface EditState {
  cellId: string | null;
  kind: 'cell' | 'colname' | 'coltype' | null;
}

export function mountDecisionTable(
  container: HTMLElement,
  table: any,
  deps: TableEditorDeps
): { rebuild: () => void; destroy: () => void } {
  const h = createElement;
  const edit: EditState = { cellId: null, kind: null };
  const decisionBo: any = table.$parent;

  interface ColSpec {
    key: object;
    colType: 'rownum' | 'input' | 'output' | 'annotation';
    clause: any | null;
    group: string;
    isFamilyTail: boolean;
    family: 'input' | 'output' | 'annotation' | null;
  }
  let colSpecs: ColSpec[] = [];

  const cellText = (cell: any): string => {
    const bo = cell.businessObject;
    if (!bo) return '';
    return bo.get('text') ?? '';
  };

  const commitCell = (cell: any, value: string): void => {
    deps.modeling.updateModdleProperties(cell.businessObject, cell.businessObject, { text: value });
  };

  // ---- 模型 → Sheet 换根重建 ----
  const rebuild = (): void => {
    // 先清编辑态再换根：渲染发生在 setRoot（root.added → Renderer）时，
    // 尾部清空会令编辑控件被新树原样重渲（input 残留根因）
    edit.cellId = null;
    edit.kind = null;
    const sheet = instance.get('sheet');
    const inputs: any[] = table.get('input') ?? [];
    const outputs: any[] = table.get('output') ?? [];
    const annotations: any[] = table.get('annotation') ?? [];
    const rules: any[] = table.get('rule') ?? [];

    colSpecs = [];
    const cols: any[] = [];
    const pushClauseCols = (
      clauses: any[], colType: 'input' | 'output' | 'annotation',
      firstLabel: string, emptyKey: object, family: 'input' | 'output' | 'annotation'
    ): void => {
      const list: ColSpec[] = clauses.length > 0
        ? clauses.map((clause, i) => ({
            key: clause, colType, clause, group: i === 0 ? firstLabel : 'And',
            isFamilyTail: i === clauses.length - 1, family
          }))
        : [{ key: emptyKey, colType, clause: null, group: firstLabel, isFamilyTail: true, family }];
      list.forEach((spec) => {
        colSpecs.push(spec);
        cols.push({ id: `col-${colType}-${spec.clause ? spec.clause.id : 'empty'}`, colType, businessObject: spec.clause, cells: [] });
      });
    };
    colSpecs.push({ key: ROWNUM_COL_KEY, colType: 'rownum', clause: null, group: '', isFamilyTail: false, family: null });
    cols.push({ id: 'col-rownum', colType: 'rownum', businessObject: null, cells: [] });
    pushClauseCols(inputs, 'input', 'When', EMPTY_INPUT_COL_KEY, 'input');
    pushClauseCols(outputs, 'output', 'Then', EMPTY_OUTPUT_COL_KEY, 'output');
    pushClauseCols(annotations, 'annotation', 'Annotations', EMPTY_ANN_COL_KEY, 'annotation');

    const mkCell = (id: string, businessObject: any): any => ({ id, businessObject });
    const rows = rules.map((rule) => {
      const cells = [
        mkCell(`cell-rownum-${rule.id}`, null),
        ...(rule.get('inputEntry') ?? []).map((e: any, i: number) => mkCell(`cell-in-${rule.id}-${i}`, e)),
        ...(rule.get('outputEntry') ?? []).map((e: any, i: number) => mkCell(`cell-out-${rule.id}-${i}`, e)),
        ...(rule.get('annotationEntry') ?? []).map((e: any, i: number) => mkCell(`cell-ann-${rule.id}-${i}`, e))
      ];
      if (inputs.length === 0) cells.push(mkCell(`cell-in-empty-${rule.id}`, null));
      if (outputs.length === 0) cells.push(mkCell(`cell-out-empty-${rule.id}`, null));
      if (annotations.length === 0) cells.push(mkCell(`cell-ann-empty-${rule.id}`, null));
      return { id: `row-${rule.id}`, businessObject: rule, cells };
    });
    rows.forEach((row) => {
      if (row.cells.length !== cols.length) {
        throw new Error(`row ${row.id} cells ${row.cells.length} != cols ${cols.length}`);
      }
    });

    sheet.setRoot(null);
    sheet.setRoot({ id: 'dmn-decision-table', rows: [], cols });
    rows.forEach((row) => sheet.addRow(row));
    // addRow 只发 row.add；TableComponent 仅订阅根级 elementsChanged——建满后手动触发整树重渲
    instance.get('changeSupport').elementsChanged([sheet.getRoot()]);
  };

  // ---- 命令（沿用 DmnModeling，可撤销） ----
  const addClause = (kind: 'input' | 'output'): void => {
    const clause = kind === 'input'
      ? deps.factory.create<any>({
          $type: 'dmn:InputClause',
          inputExpression: deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: '' })
        })
      : deps.factory.create<any>({ $type: 'dmn:OutputClause' });
    deps.modeling.clauseAdd(table, {
      table,
      property: kind,
      entryProperty: kind === 'input' ? 'inputEntry' : 'outputEntry',
      clause,
      createEntry: () => deps.factory.create<any>(
        kind === 'input' ? { $type: 'dmn:UnaryTests', text: '' } : { $type: 'dmn:LiteralExpression', text: '' }
      )
    });
  };

  const removeClause = (spec: ColSpec): void => {
    if (!spec.clause) return;
    deps.modeling.clauseRemove(table, {
      table,
      property: spec.family as 'input' | 'output' | 'annotation',
      entryProperty: spec.family === 'input' ? 'inputEntry' : spec.family === 'output' ? 'outputEntry' : 'annotationEntry',
      clause: spec.clause,
      createEntry: () => null as any
    });
  };

  const addRule = (): void => {
    const inputs: any[] = table.get('input') ?? [];
    const outputs: any[] = table.get('output') ?? [];
    const annotations: any[] = table.get('annotation') ?? [];
    const rule = deps.factory.create<any>({
      $type: 'dmn:DecisionRule',
      inputEntry: inputs.map(() => deps.factory.create<any>({ $type: 'dmn:UnaryTests', text: '' })),
      outputEntry: outputs.map(() => deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: '' })),
      annotationEntry: annotations.map(() => deps.factory.create<any>({ $type: 'dmn:RuleAnnotation', text: '' }))
    });
    deps.modeling.listAdd(table, table, 'rule', rule);
  };

  const removeRule = (rule: any): void => {
    deps.modeling.listRemove(table, table, 'rule', rule);
  };

  const commitColName = (spec: ColSpec, v: string): void => {
    edit.cellId = null;
    edit.kind = null;
    if (!spec.clause) return;
    if (spec.colType === 'input') {
      const expr = spec.clause.get('inputExpression');
      if (expr) deps.modeling.updateModdleProperties(spec.clause, expr, { text: v });
      else deps.modeling.updateModdleProperties(spec.clause, spec.clause, {
        inputExpression: deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: v })
      });
    } else {
      deps.modeling.updateModdleProperties(spec.clause, spec.clause, { name: v });
    }
  };

  const commitColType = (spec: ColSpec, v: string): void => {
    edit.cellId = null;
    edit.kind = null;
    if (!spec.clause) return;
    if (spec.colType === 'input') {
      const expr = spec.clause.get('inputExpression');
      if (expr) deps.modeling.updateModdleProperties(spec.clause, expr, { typeRef: v || undefined });
      else if (v) deps.modeling.updateModdleProperties(spec.clause, spec.clause, {
        inputExpression: deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: '', typeRef: v })
      });
    } else {
      deps.modeling.updateModdleProperties(spec.clause, spec.clause, { typeRef: v || undefined });
    }
  };

  // ---- 就地编辑控件（对齐 dmn-js content-editable：覆盖格子的白底蓝框浮层） ----
  const editInput = (value: string, onCommit: (v: string) => void): any => {
    let current = value;
    let done = false;
    const finish = (save: boolean) => {
      if (done) return;
      done = true;
      if (save) onCommit(current);
      else cancelEdit();
    };
    return h('input', {
      class: 'content-editable-input',
      value,
      onClick: (e: MouseEvent) => e.stopPropagation(),
      onInput: (e: any) => { current = e.target.value; },
      onBlur: () => finish(true),
      onKeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      }
    }, null);
  };

  // ---- 表头 ----
  const clauseWidth = (spec: ColSpec): number | undefined =>
    COL_WIDTHS.get(spec.key) ?? (spec.colType === 'rownum' ? INDEX_COL_WIDTH : DEFAULT_COL_WIDTH);

  const headerCell = (spec: ColSpec, colId: string): any => {
    const width = clauseWidth(spec);
    const style = width ? { width: `${width}px` } : undefined;
    if (spec.colType === 'rownum') {
      return h('th', {
        class: 'index-column',
        'data-element-id': colId,
        style
      }, [resizeHandleVdom(spec)]);
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
            addClause(spec.family as 'input' | 'output');
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
    children.push(resizeHandleVdom(spec));
    return h('th', {
      class: cellCls,
      'data-element-id': colId,
      style
    }, children);
  };

  /** 列编辑弹层（对齐 dmn-js ref-clause-editor）：名 + 类型 + 删列 */
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
      removeClause(spec);
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
      if (nameInput.value !== name0) commitColName(spec, nameInput.value);
      if ((typeSelect.value || 'string') !== (type0 || 'string')) commitColType(spec, typeSelect.value);
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
  let clauseEditorPop: HTMLElement | null = null;
  const closeClauseEditor = (): void => {
    if (clauseEditorPop) {
      (clauseEditorPop as any).__cleanup?.();
      clauseEditorPop.remove();
      clauseEditorPop = null;
    }
  };

  // ---- 表体 ----
  const bodyCell = (cell: any, colIndex: number): any => {
    const spec = colSpecs[colIndex];
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
            removeRule(rule);
          }
        }, '\u2715')
      ];
    } else if (spec.colType === 'annotation') {
      cls = 'annotation';
      const text = cellText(cell);
      content = text || null;
    } else {
      cls = spec.colType === 'input' ? 'input-cell' : 'output-cell';
      if (isEditing) {
        cls += ' editing';
        content = editInput(cellText(cell), (v) => commitCell(cell, v));
      } else {
        const text = cellText(cell);
        if (spec.colType === 'input' && !text) cls += ' empty';
        content = text || (spec.colType === 'input' ? '-' : null);
      }
    }
    return h('td', {
      class: cls + (isSelected ? ' selected' : ''),
      'data-element-id': cell.id
    }, content);
  };

  // ---- 标题条（表名 + 分隔线 + Hit policy）----
  const PropertiesBar = () => {
    const name = decisionBo?.get('name') ?? '';
    const hp = table.get('hitPolicy') ?? 'UNIQUE';
    const entry = HIT_POLICIES.find((p) => p.value === hp) ?? HIT_POLICIES[0];
    const isEditingName = edit.kind === 'colname' && edit.cellId === '__decision_name';
    const nameEl = isEditingName
      ? h('div', { class: 'decision-table-name editing' }, [
          editInput(name, (v) => {
            edit.cellId = null;
            edit.kind = null;
            if (v && v !== name) deps.modeling.updateModdleProperties(decisionBo, decisionBo, { name: v });
          })
        ])
      : h('div', {
          class: 'decision-table-name editable',
          title: `Decision name: ${name}`,
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            edit.cellId = '__decision_name';
            edit.kind = 'colname';
            rerenderTreeLocal();
          }
        }, name);
    return h('div', { class: 'decision-table-properties' }, [
      nameEl,
      h('div', { class: 'decision-table-header-separator' }),
      h('div', { class: 'hit-policy header', title: entry.explanation }, [
        h('label', { class: 'dms-label' }, 'Hit policy:'),
        h('div', { class: 'hit-policy-edit-policy-select dms-input-select' }, [
          h('div', {
            class: 'dms-input',
            tabIndex: 0,
            onClick: (e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              openHitPolicyMenu(e.currentTarget as HTMLElement);
            }
          }, entry.label),
          h('span', { class: 'dms-input-select-icon' }, '\u25BE')
        ])
      ])
    ]);
  };

  const openHitPolicyMenu = (anchor: HTMLElement): void => {
    document.querySelector('.hit-policy-options')?.remove();
    const current = table.get('hitPolicy') ?? 'UNIQUE';
    const menu = document.createElement('div');
    menu.className = 'dms-select-options hit-policy-options';
    for (const p of HIT_POLICIES) {
      const option = document.createElement('div');
      option.className = 'option' + (p.value === current ? ' active' : '');
      option.textContent = p.label;
      option.title = p.explanation;
      option.addEventListener('click', (e) => {
        e.preventDefault();
        menu.remove();
        deps.modeling.updateModdleProperties(table, table, { hitPolicy: p.value });
      });
      menu.append(option);
    }
    const host = anchor.closest('.dmn-tablejs-host') as HTMLElement ?? document.body;
    const aRect = anchor.getBoundingClientRect();
    const hRect = host.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${aRect.bottom - hRect.top + 4}px`;
    menu.style.left = `${aRect.left - hRect.left}px`;
    menu.style.zIndex = '60';
    host.append(menu);
    const onDoc = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== anchor) {
        menu.remove();
        document.removeEventListener('mousedown', onDoc, true);
      }
    };
    document.addEventListener('mousedown', onDoc, true);
  };

  // ---- 组件注册（稳定组件引用——getComponent 若每次返回新函数体会被 Inferno
  // 判为不同组件类型而整树卸载重建，th 内联宽/手柄全丢） ----
  const HeadComponent = ({ cols }: any) => h('thead', { class: 'tjs-head' },
    h('tr', { class: 'tjs-head-row' },
      cols.map((col: any, i: number) => headerCell(colSpecs[i], col.id)))
  );
  const BodyComponent = ({ rows }: any) => h('tbody', { class: 'tjs-body' },
    rows.map((row: any) => h('tr', { class: 'tjs-row', 'data-element-id': row.id },
      row.cells.map((cell: any, i: number) => bodyCell(cell, i))))
  );
  const FootComponent = () => {
    const inputs: any[] = table.get('input') ?? [];
    const outputs: any[] = table.get('output') ?? [];
    const annotations: any[] = table.get('annotation') ?? [];
    const cells: any[] = [
      h('td', { class: 'add-rule-add' }, [
        h('button', {
          class: 'action-icon tjs-plus',
          type: 'button',
          title: 'Add rule',
          onClick: (e: MouseEvent) => { e.preventDefault(); addRule(); }
        }, '+')
      ])
    ];
    if (inputs.length === 0) cells.push(h('td', { class: 'add-rule input-cell' }, '-'));
    inputs.forEach((input, i) => cells.push(h('td', { class: 'add-rule input-cell', key: input.id }, i === 0 ? '-' : null)));
    if (outputs.length === 0) cells.push(h('td', { class: 'add-rule output-cell' }, null));
    outputs.forEach((output) => cells.push(h('td', { class: 'add-rule output-cell', key: output.id }, null)));
    if (annotations.length === 0) cells.push(h('td', { class: 'add-rule annotation' }, null));
    annotations.forEach((ann) => cells.push(h('td', { class: 'add-rule annotation', key: ann.id }, null)));
    return h('tfoot', { class: 'actionable add-rule' }, h('tr', {}, cells));
  };
  class DmnTableComponents {
    static $inject = ['eventBus', 'components'];
    constructor(eventBus: any, components: any) {
      components.onGetComponent('table.before', () => PropertiesBar);
      components.onGetComponent('table.head', () => HeadComponent);
      components.onGetComponent('table.body', () => BodyComponent);
      components.onGetComponent('table.foot', () => FootComponent);
      // 选择变化 → 整树重渲（TableComponent 订阅在根 id 上，选择只发 selection.changed）
      eventBus.on('selection.changed', rerenderTreeLocal);
    }
  }
  const componentsModule = {
    __init__: ['dmnTableComponents'],
    dmnTableComponents: ['type', DmnTableComponents]
  };

  // ---- 列宽拖拽（vdom 手柄；Excel 语义） ----
  const resizeHandleVdom = (spec: ColSpec): any => h('div', {
    class: 'tjs-colresize',
    title: '拖拽调整列宽',
    onPointerdown: (e: PointerEvent) => startColumnDrag(e, spec)
  }, null);

  const startColumnDrag = (e: PointerEvent, spec: ColSpec): void => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const cell = handle.parentElement as HTMLElement | null;
    if (!cell) return;
    const next = cell.nextElementSibling as HTMLElement | null;
    const tableEl = container.querySelector('.tjs-table') as HTMLElement | null;
    const startX = e.clientX;
    const wA = cell.offsetWidth;
    const wB = next ? next.offsetWidth : 0;
    const specIndex = colSpecs.indexOf(spec);
    const nextSpec = next && specIndex >= 0 ? colSpecs[specIndex + 1] : null;
    const minA = Math.min(MIN_COL_WIDTH, wA);
    const minB = next ? Math.min(MIN_COL_WIDTH, wB) : 0;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('is-active');
    tableEl?.classList.add('tjs-table--resizing');
    const retotal = () => {
      if (!tableEl) return;
      const row = container.querySelector('.tjs-head-row');
      if (!row) return;
      const sum = Array.from(row.children).reduce((s, c) => s + (c as HTMLElement).offsetWidth, 0);
      tableEl.style.width = `${sum}px`;
    };
    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      let newA = wA + delta;
      if (next) newA = Math.min(Math.max(newA, minA), wA + wB - minB);
      else newA = Math.max(newA, minA);
      cell.style.width = `${Math.round(newA)}px`;
      if (next) next.style.width = `${Math.round(wA + wB - newA)}px`;
      retotal();
    };
    const onDone = () => {
      ac.abort();
      handle.classList.remove('is-active');
      tableEl?.classList.remove('tjs-table--resizing');
      COL_WIDTHS.set(spec.key, Math.round(cell.offsetWidth));
      if (nextSpec) COL_WIDTHS.set(nextSpec.key, Math.round((next as HTMLElement).offsetWidth));
      rerenderTreeLocal();
    };
    const ac = new AbortController();
    handle.addEventListener('pointermove', onMove, { signal: ac.signal });
    handle.addEventListener('pointerup', onDone, { signal: ac.signal });
    handle.addEventListener('pointercancel', onDone, { signal: ac.signal });
  };

  const cancelEdit = (): void => {
    if (!edit.cellId) return;
    edit.cellId = null;
    edit.kind = null;
    rerenderTreeLocal();
  };

  const rerenderTreeLocal = (): void => {
    const root = instance.get('sheet').getRoot();
    instance.get('changeSupport').elementsChanged([root]);
  };

  // ---- 装配 Table 实例（独立注入器；selection+interaction-events 特性） ----
  const instance = new Table({
    container,
    renderer: { container },
    modules: [selectionModule, interactionEventsModule, componentsModule]
  } as any);

  // 双击就地编辑（单击已被 SelectionBehavior 占用为选择；仅数据格，行号格除外）
  instance.get('eventBus').on('cell.dblclick', ({ id }: any) => {
    const cell = instance.get('elementRegistry').get(id);
    if (!cell || !cell.businessObject || !cell.row) return;
    const spec = colSpecs[cell.col ? cell.row.root.cols.indexOf(cell.col) : -1];
    if (!spec || spec.colType === 'rownum') return;
    edit.cellId = id;
    edit.kind = 'cell';
    rerenderTreeLocal();
  });

  // 图侧命令栈变更（建模/撤销/重做）→ 整表换根重建。
  // 经 rAF 跳出 Inferno 合成事件栈：编辑提交（keydown/blur listener 内发命令）
  // 同步触发 Renderer 顶层 render(null)+render(table) 会失效——栈内只有组件级
  // forceUpdate 可靠
  const onDiagramChanged = (): void => {
    requestAnimationFrame(() => rebuild());
  };
  deps.eventBus.on('commandStack.changed', onDiagramChanged);

  rebuild();

  // 首测固化：渲染后一帧把未记忆列宽写默认/测量值 → 经 vdom 下发稳定
  const solidifyColumnWidths = (): void => {
    requestAnimationFrame(() => {
      const row = container.querySelector('.tjs-head-row');
      if (!row) return;
      syncTableMetrics(container);
    });
  };
  instance.get('eventBus').on('root.added' as any, solidifyColumnWidths);
  solidifyColumnWidths();

  return {
    rebuild,
    destroy: () => {
      deps.eventBus.off('commandStack.changed', onDiagramChanged);
      closeClauseEditor();
      try {
        instance.destroy();
      } catch {
        /* 容器可能已被视图层拆除 */
      }
      container.textContent = '';
    }
  };
}

/** 表级几何同步：.tjs-table 总宽下限=列宽和（表宽 100% 填满容器——列宽经
 *  vdom/默认值下发，富余空间由固定布局分给各列，超限则 min-width 撑开滚动） */
function syncTableMetrics(container: HTMLElement): void {
  const tableEl = container.querySelector('.tjs-table') as HTMLTableElement | null;
  const row = container.querySelector('.tjs-head-row');
  if (!tableEl || !row) return;
  const sum = Array.from(row.children).reduce((s, c) => s + (c as HTMLElement).offsetWidth, 0);
  tableEl.style.minWidth = `${sum}px`;
}
