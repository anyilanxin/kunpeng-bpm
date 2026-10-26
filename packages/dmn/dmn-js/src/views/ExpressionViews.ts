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
 * 表达式编辑器视图（G5 核心，用户截图版式）：
 * - Decision：decisionLogic 按形态分派（DecisionTable 网格 / LiteralExpression 文本域），
 *   头部命中策略/变量名/类型/表达式语言/形态切换（点击类型标签弹形态菜单，
 *   当前项置灰——家族替换菜单惯例）；
 * - BKM（Literal 模式）：boxed 编辑器——参数区（formalParameter 增删/名/类型）、
 *   体区（FunctionDefinition.body 按形态分派：Literal=文本域、其余四族本期
 *   占位提示）、结果区（variable name/typeRef）。
 *
 * 全部编辑经 modeling 命令（可撤销；Decision/ BKM 的结构改动走
 * properties.update / updateModdleProperties / dmn.list / dmn.table.clause）。
 * 编辑器层为 DOM 直渲（.dmn-editor 表布局）；形态切换/增删后整体重渲（
 * rerender()——命令完成即重算命令栈后的新态）。
 */
import type { DmnViews } from './DmnViews';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnModeling } from '../command/DmnModeling';
import { buildTypeSelect } from './typeSelect';

export interface EditorDeps {
  views: DmnViews;
  factory: DmnFactory;
  modeling: DmnModeling;
}

// ---- 通用小件 ----
function el(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function makeTextInput(value: string | undefined, onCommit: (v: string) => void, placeholder?: string): HTMLInputElement {
  const input = document.createElement('input');
  input.className = 'dmn-editor-input';
  input.value = value ?? '';
  if (placeholder) input.placeholder = placeholder;
  input.addEventListener('change', () => onCommit(input.value));
  return input;
}

function makeTextArea(value: string | undefined, onCommit: (v: string) => void, placeholder?: string): HTMLTextAreaElement {
  const ta = document.createElement('textarea');
  ta.className = 'dmn-editor-textarea';
  ta.value = value ?? '';
  if (placeholder) ta.placeholder = placeholder;
  ta.addEventListener('change', () => onCommit(ta.value));
  return ta;
}

// ---- 形态切换菜单（简单下拉浮层；当前形态置灰） ----
function kindMenu(current: string, onPick: (kind: string) => void): HTMLElement {
  const wrap = el('div', 'dmn-kind-menu');
  const options: Array<{ kind: string; label: string }> = [
    { kind: 'dmn:DecisionTable', label: 'Decision Table' },
    { kind: 'dmn:LiteralExpression', label: 'Literal Expression' },
    { kind: 'dmn:Context', label: 'Context' },
    { kind: 'dmn:List', label: 'List' },
    { kind: 'dmn:Invocation', label: 'Invocation' },
    { kind: 'dmn:Relation', label: 'Relation' }
  ];
  for (const o of options) {
    const item = el('button', 'dmn-kind-item', o.label);
    if (o.kind === current) item.setAttribute('disabled', '');
    item.addEventListener('click', () => onPick(o.kind));
    wrap.append(item);
  }
  return wrap;
}

/** 点击形态标签弹出切换菜单（简单定位浮层；Escape/外点关闭） */
function openKindMenu(anchor: HTMLElement, current: string, onPick: (kind: string) => void): void {
  const existing = document.querySelector('.dmn-kind-menu');
  existing?.remove();
  const menu = kindMenu(current, (kind) => {
    menu.remove();
    onPick(kind);
  });
  const rect = anchor.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  document.body.append(menu);
  const onDoc = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && e.target !== anchor) {
      menu.remove();
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      menu.remove();
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('mousedown', onDoc);
  document.addEventListener('keydown', onKey);
}

// ---- Decision 编辑器 ----
export function openDecisionEditor(element: any, deps: EditorDeps): void {
  const bo = element.businessObject;
  const title = bo.name ?? element.id;
  const body = el('div', 'dmn-decision-editor');
  deps.views.open(element, title, body);

  const rerender = () => {
    body.textContent = '';
    renderDecisionBody(body, bo, deps, rerender);
  };
  rerender();
}

function renderDecisionBody(body: HTMLElement, bo: any, deps: EditorDeps, rerender: () => void): void {
  const logic = bo.get('decisionLogic');
  if (!logic) {
    const empty = el('div', 'dmn-editor-empty', '无表达式 — 点击切换形态');
    empty.style.cursor = 'pointer';
    empty.addEventListener('click', () =>
      openKindMenu(empty, '', (kind) => {
        setDecisionLogic(bo, kind, deps);
        rerender();
      })
    );
    body.append(empty);
    return;
  }
  if (logic.$type === 'dmn:DecisionTable') {
    renderDecisionTable(body, bo, logic, deps, rerender);
  } else if (logic.$type === 'dmn:LiteralExpression') {
    renderLiteralExpression(body, bo, logic, deps, rerender, false);
  } else {
    const ph = el('div', 'dmn-editor-empty', `暂不支持形态 ${logic.$type} 的网格编辑（本期 boxed 四族占位）`);
    ph.style.cursor = 'pointer';
    ph.addEventListener('click', () =>
      openKindMenu(ph, logic.$type, (kind) => {
        setDecisionLogic(bo, kind, deps);
        rerender();
      })
    );
    body.append(ph);
  }
}

function setDecisionLogic(bo: any, kind: string, deps: EditorDeps): void {
  const logic = kind === 'dmn:DecisionTable'
    ? deps.factory.create<any>({ $type: 'dmn:DecisionTable', hitPolicy: 'UNIQUE' })
    : kind === 'dmn:LiteralExpression'
      ? deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: '' })
      : kind === 'dmn:Context'
        ? deps.factory.create<any>({ $type: 'dmn:Context', contextEntry: [] })
        : kind === 'dmn:List'
          ? deps.factory.create<any>({ $type: 'dmn:List', elements: [] })
          : kind === 'dmn:Invocation'
            ? deps.factory.create<any>({ $type: 'dmn:Invocation', binding: [] })
            : deps.factory.create<any>({ $type: 'dmn:Relation', column: [], row: [] });
  deps.modeling.updateModdleProperties(bo, bo, { decisionLogic: logic });
}

// ---- 决策表（Decision 定规版式：双行表头 When/And|Then/And|Annotations、族界⊕、注记族、行号列底蓝色+） ----
function renderDecisionTable(body: HTMLElement, bo: any, table: any, deps: EditorDeps, rerender: () => void): void {
  const inputs: any[] = table.get('input') ?? [];
  const outputs: any[] = table.get('output') ?? [];
  const annotations: any[] = table.get('annotation') ?? [];
  const rules: any[] = table.get('rule') ?? [];

  // 头部行：命中策略 + 变量名 + 类型 + 表达式语言 + 形态标签（点击切形态）
  const head = el('div', 'dmn-editor-head');
  const name = el('span', 'dmn-editor-name', bo.name ?? '');
  head.append(name);
  head.append(el('span', 'dmn-editor-sep', ''));
  head.append(labelText('Hit policy:'));
  head.append(hitPolicySelect(table, deps, rerender));
  head.append(labelText('Variable name:'));
  head.append(makeTextInput(bo.get('variable')?.name, (v) => setVariableName(bo, v, deps)));
  head.append(labelText('Variable type:'));
  head.append(buildTypeSelect(bo.get('variable')?.typeRef, (v) => setVariableTypeRef(bo, v, deps)));
  const kindTag = el('button', 'dmn-kind-tag', kindLabel(logicKind(table)));
  kindTag.addEventListener('click', () =>
    openKindMenu(kindTag, logicKind(table), (kind) => {
      if (kind === logicKind(table)) return;
      setDecisionLogic(bo, kind, deps);
      rerender();
    })
  );
  head.append(kindTag);
  body.append(head);

  // 表本体（thead 两行 + tbody 规则行 + 加行）
  const tableEl = el('table', 'dmn-table') as HTMLTableElement;
  const thead = tableEl.createTHead();

  // 组头行：When / And / Then / And / Annotations（跨列）
  const headRow = thead.insertRow();
  headRow.className = 'dmn-table-grouprow';
  const rownumHead = document.createElement('th');
  rownumHead.className = 'dmn-table-rownum';
  rownumHead.rowSpan = 2;
  headRow.append(rownumHead);
  appendGroupHeader(headRow, 'When', inputs.length > 0 ? inputs.length : 1);
  appendGroupHeader(headRow, 'And', 1);
  appendGroupHeader(headRow, 'Then', outputs.length > 0 ? outputs.length : 1);
  appendGroupHeader(headRow, 'And', 1);
  const annHead = document.createElement('th');
  annHead.className = 'dmn-table-grouphead';
  annHead.textContent = 'Annotations';
  annHead.colSpan = annotations.length > 0 ? annotations.length : 1;
  annHead.rowSpan = 2;
  headRow.append(annHead);

  // 列头行：输入名/类型/⊕加输入 | 输出名/类型/⊕加输出 | 注记名
  const colRow = thead.insertRow();
  colRow.className = 'dmn-table-colrow';
  for (const clause of inputs) {
    colRow.append(clauseHeaderCell(clause, 'input', deps, rerender));
  }
  colRow.append(addClauseCell('⊕', () => {
    addClause(deps, table, 'input');
    rerender();
  }, 'add input'));
  for (const clause of outputs) {
    colRow.append(clauseHeaderCell(clause, 'output', deps, rerender));
  }
  colRow.append(addClauseCell('⊕', () => {
    addClause(deps, table, 'output');
    rerender();
  }, 'add output'));
  for (const ann of annotations) {
    const th = el('th', 'dmn-table-colhead');
    th.append(makeTextInput(ann.name, (v) => {
      deps.modeling.updateModdleProperties(ann, ann, { name: v });
      rerender();
    }, '备注'));
    colRow.append(th);
  }

  // 规则行
  rules.forEach((rule: any, ri: number) => {
    const tr = tableEl.insertRow();
    tr.className = 'dmn-table-rule';
    const tdNum = document.createElement('td');
    tdNum.className = 'dmn-table-rownum';
    tdNum.textContent = String(ri + 1);
    tr.append(tdNum);
    (rule.get('inputEntry') ?? []).forEach((entry: any) => tr.append(ruleEntryCell(entry, 'inputEntry', deps, rerender)));
    (rule.get('outputEntry') ?? []).forEach((entry: any) => tr.append(ruleEntryCell(entry, 'outputEntry', deps, rerender)));
    (rule.get('annotationEntry') ?? []).forEach((entry: any) => tr.append(ruleEntryCell(entry, 'annotationEntry', deps, rerender)));
    tableEl.append(tr);
  });

  // 加行（蓝色 +，行号列）
  const addRow = tableEl.insertRow();
  addRow.className = 'dmn-table-addrow';
  const addTd = document.createElement('td');
  addTd.className = 'dmn-table-rownum';
  const addBtn = el('button', 'dmn-table-add', '+');
  addBtn.title = '添加规则';
  addBtn.addEventListener('click', () => {
    addRule(deps, table);
    rerender();
  });
  addTd.append(addBtn);
  addRow.append(addTd);
  const span = document.createElement('td');
  span.colSpan = inputs.length + outputs.length + annotations.length + 1;
  span.className = 'dmn-table-addrow-fill';
  addRow.append(span);

  body.append(tableEl);
}

function appendGroupHeader(row: HTMLTableRowElement, label: string, span: number): void {
  const th = document.createElement('th');
  th.className = 'dmn-table-grouphead';
  th.textContent = label;
  th.colSpan = span;
  row.append(th);
}

function addClauseCell(label: string, onClick: () => void, title: string): HTMLTableCellElement {
  const th = el('th', 'dmn-table-addclause', label) as HTMLTableCellElement;
  th.title = title;
  th.addEventListener('click', onClick);
  return th;
}

function clauseHeaderCell(clause: any, kind: 'input' | 'output', deps: EditorDeps, rerender: () => void): HTMLTableCellElement {
  const th = el('th', 'dmn-table-colhead') as HTMLTableCellElement;
  if (kind === 'input') {
    th.append(makeTextInput(clause.get('inputExpression')?.text, (v) => {
      const expr = clause.get('inputExpression');
      if (expr) {
        deps.modeling.updateModdleProperties(clause, expr, { text: v });
      } else {
        deps.modeling.updateModdleProperties(clause, clause, {
          inputExpression: deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: v })
        });
      }
      rerender();
    }, '输入'));
    th.append(buildTypeSelect(clause.get('inputExpression')?.typeRef, (v) => {
      const expr = clause.get('inputExpression');
      if (expr) {
        deps.modeling.updateModdleProperties(clause, expr, { typeRef: v });
      } else {
        deps.modeling.updateModdleProperties(clause, clause, {
          inputExpression: deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: '', typeRef: v })
        });
      }
      rerender();
    }));
  } else {
    th.append(makeTextInput(clause.name, (v) => {
      deps.modeling.updateModdleProperties(clause, clause, { name: v });
      rerender();
    }, '输出'));
    th.append(buildTypeSelect(clause.typeRef, (v) => {
      deps.modeling.updateModdleProperties(clause, clause, { typeRef: v });
      rerender();
    }));
  }
  return th;
}

function ruleEntryCell(entry: any, property: string, deps: EditorDeps, rerender: () => void): HTMLTableCellElement {
  const td = document.createElement('td');
  td.className = 'dmn-table-cell';
  td.append(makeTextInput(entry.text, (v) => {
    deps.modeling.updateModdleProperties(entry, entry, { text: v });
    rerender();
  }, property === 'inputEntry' ? '（恒真 -）' : ''));
  return td;
}

function hitPolicySelect(table: any, deps: EditorDeps, rerender: () => void): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'dmn-editor-select';
  for (const p of ['UNIQUE', 'FIRST', 'PRIORITY', 'ANY', 'COLLECT', 'RULE ORDER', 'OUTPUT ORDER']) {
    const option = document.createElement('option');
    option.value = p;
    option.textContent = p.charAt(0) + p.slice(1).toLowerCase();
    select.appendChild(option);
  }
  select.value = table.get('hitPolicy') ?? 'UNIQUE';
  select.addEventListener('change', () => {
    deps.modeling.updateModdleProperties(table, table, { hitPolicy: select.value });
    rerender();
  });
  return select;
}

function setVariableName(bo: any, v: string, deps: EditorDeps): void {
  const variable = bo.get('variable');
  if (variable) {
    deps.modeling.updateModdleProperties(bo, variable, { name: v });
  } else {
    deps.modeling.updateModdleProperties(bo, bo, {
      variable: deps.factory.create<any>({ $type: 'dmn:InformationItem', name: v })
    });
  }
}

function setVariableTypeRef(bo: any, v: string, deps: EditorDeps): void {
  const variable = bo.get('variable');
  if (variable) {
    deps.modeling.updateModdleProperties(bo, variable, { typeRef: v });
  } else {
    deps.modeling.updateModdleProperties(bo, bo, {
      variable: deps.factory.create<any>({ $type: 'dmn:InformationItem', typeRef: v })
    });
  }
}

function addClause(deps: EditorDeps, table: any, kind: 'input' | 'output'): void {
  const createEntry = () => deps.factory.create<any>(
    kind === 'input' ? { $type: 'dmn:UnaryTests', text: '' } : { $type: 'dmn:LiteralExpression', text: '' }
  );
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
    createEntry
  });
}

function addRule(deps: EditorDeps, table: any): void {
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
}

// ---- Literal expression（Decision） ----
function renderLiteralExpression(body: HTMLElement, bo: any, logic: any, deps: EditorDeps, rerender: () => void, isBkm: boolean): void {
  const head = el('div', 'dmn-editor-head');
  head.append(el('span', 'dmn-editor-name', bo.name ?? ''));
  if (!isBkm) {
    head.append(el('span', 'dmn-editor-sep', ''));
    head.append(labelText('Variable name:'));
    head.append(makeTextInput(bo.get('variable')?.name, (v) => setVariableName(bo, v, deps)));
    head.append(labelText('Variable type:'));
    head.append(buildTypeSelect(bo.get('variable')?.typeRef, (v) => setVariableTypeRef(bo, v, deps)));
  }
  const kindTag = el('button', 'dmn-kind-tag', kindLabel(logicKind(logic)));
  kindTag.addEventListener('click', () =>
    openKindMenu(kindTag, logicKind(logic), (kind) => {
      if (kind === logicKind(logic)) return;
      if (isBkm) {
        setBkmBody(bo, kind, deps);
      } else {
        setDecisionLogic(bo, kind, deps);
      }
      rerender();
    })
  );
  head.append(kindTag);
  body.append(head);
  body.append(makeTextArea(logic.text, (v) => {
    deps.modeling.updateModdleProperties(logic, logic, { text: v });
    rerender();
  }, '输入 FEEL 表达式'));
  const langRow = el('div', 'dmn-editor-row');
  langRow.append(labelText('Expression language:'));
  const lang = document.createElement('select');
  lang.className = 'dmn-editor-select';
  for (const l of ['feel', 'juav', 'groovy']) {
    const o = document.createElement('option');
    o.value = l;
    o.textContent = l;
    lang.appendChild(o);
  }
  lang.value = logic.expressionLanguage ?? 'feel';
  lang.addEventListener('change', () => {
    deps.modeling.updateModdleProperties(logic, logic, { expressionLanguage: lang.value });
    rerender();
  });
  langRow.append(lang);
  body.append(langRow);
}

// ---- BKM boxed ----
function setBkmBody(bo: any, kind: string, deps: EditorDeps): void {
  const logic = bo.get('encapsulatedLogic');
  const body = kind === 'dmn:LiteralExpression'
    ? deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: '' })
    : kind === 'dmn:Context'
      ? deps.factory.create<any>({ $type: 'dmn:Context', contextEntry: [] })
      : kind === 'dmn:List'
        ? deps.factory.create<any>({ $type: 'dmn:List', elements: [] })
        : kind === 'dmn:Invocation'
          ? deps.factory.create<any>({ $type: 'dmn:Invocation', binding: [] })
          : deps.factory.create<any>({ $type: 'dmn:Relation', column: [], row: [] });
  deps.modeling.updateModdleProperties(bo, logic, { body });
}

export function openBkmEditor(element: any, deps: EditorDeps): void {
  const bo = element.businessObject;
  const title = bo.name ?? element.id;
  const body = el('div', 'dmn-bkm-editor');
  deps.views.open(element, title, body);

  const rerender = () => {
    body.textContent = '';
    renderBkmBody(body, bo, deps, rerender);
  };
  rerender();
}

function renderBkmBody(body: HTMLElement, bo: any, deps: EditorDeps, rerender: () => void): void {
  const logic = bo.get('encapsulatedLogic');
  if (!logic) {
    body.append(el('div', 'dmn-editor-empty', 'Empty（无表达式）——pad 切回 Literal expression 以编辑'));
    return;
  }
  // 参数区（F 行 + ()）
  const params = el('div', 'dmn-bkm-params');
  params.append(el('span', 'dmn-bkm-f', 'F'));
  const paramWrap = el('div', 'dmn-bkm-paramlist');
  (logic.get('formalParameter') ?? []).forEach((p: any, i: number) => {
    const row = el('div', 'dmn-bkm-param');
    row.append(makeTextInput(p.name, (v) => {
      deps.modeling.updateModdleProperties(logic, p, { name: v });
      rerender();
    }, '参数名'));
    row.append(buildTypeSelect(p.typeRef, (v) => {
      deps.modeling.updateModdleProperties(logic, p, { typeRef: v });
      rerender();
    }));
    const del = el('button', 'dmn-table-add', '−');
    del.title = '删除参数';
    del.addEventListener('click', () => {
      deps.modeling.listRemove(logic, logic, 'formalParameter', p);
      rerender();
    });
    row.append(del);
    paramWrap.append(row);
  });
  const addParam = el('button', 'dmn-table-add', '+');
  addParam.title = '添加参数';
  addParam.addEventListener('click', () => {
    deps.modeling.listAdd(logic, logic, 'formalParameter', deps.factory.create<any>({ $type: 'dmn:InformationItem', name: '' }));
    rerender();
  });
  paramWrap.append(addParam);
  params.append(paramWrap);
  body.append(params);

  // 体区（按形态分派）
  const bodyExpr = logic.get('body');
  const bodyEl = el('div', 'dmn-bkm-body');
  if (bodyExpr?.$type === 'dmn:LiteralExpression') {
    bodyEl.append(makeTextArea(bodyExpr.text, (v) => {
      deps.modeling.updateModdleProperties(logic, bodyExpr, { text: v });
      rerender();
    }, '输入 FEEL 表达式'));
  } else if (bodyExpr) {
    bodyEl.append(el('div', 'dmn-editor-empty', `暂不支持形态 ${bodyExpr.$type}（本期 boxed 占位）`));
  } else {
    bodyEl.append(el('div', 'dmn-editor-empty', '无体表达式'));
  }
  body.append(bodyEl);

  // 结果区
  const result = el('div', 'dmn-bkm-result');
  result.append(el('div', 'dmn-editor-name', 'Result'));
  const varRow = el('div', 'dmn-editor-row');
  varRow.append(labelText('Variable name'));
  varRow.append(makeTextInput(logic.get('variable')?.name, (v) => {
    const variable = logic.get('variable');
    if (variable) {
      deps.modeling.updateModdleProperties(logic, variable, { name: v });
    } else {
      deps.modeling.updateModdleProperties(logic, logic, {
        variable: deps.factory.create<any>({ $type: 'dmn:InformationItem', name: v })
      });
    }
    rerender();
  }, '结果名'));
  varRow.append(labelText('Result type'));
  varRow.append(buildTypeSelect(logic.get('variable')?.typeRef, (v) => {
    const variable = logic.get('variable');
    if (variable) {
      deps.modeling.updateModdleProperties(logic, variable, { typeRef: v });
    } else {
      deps.modeling.updateModdleProperties(logic, logic, {
        variable: deps.factory.create<any>({ $type: 'dmn:InformationItem', typeRef: v })
      });
    }
    rerender();
  }));
  result.append(varRow);
  body.append(result);
}

// ---- 形态标签文案 ----
function logicKind(expr: any): string {
  return expr?.$type ?? '';
}
function kindLabel(kind: string): string {
  return kind === 'dmn:DecisionTable' ? 'Decision Table'
    : kind === 'dmn:LiteralExpression' ? 'Literal Expression'
      : kind === 'dmn:Context' ? 'Context'
        : kind === 'dmn:List' ? 'List'
          : kind === 'dmn:Invocation' ? 'Invocation'
            : kind === 'dmn:Relation' ? 'Relation'
              : kind || 'Empty';
}
function labelText(text: string): HTMLElement {
  const span = el('span', 'dmn-editor-label');
  span.textContent = text;
  return span;
}
