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
 * - Decision：decisionLogic 按形态分派——决策表=用户截图版式（视图头槽位
 *   「名 | Hit policy: [▼]」、单行四角表头〔左上 When/Then/Annotations 族标记、
 *   中间列名、右下类型〕、深蓝圆形 ⊕ 骑族界缝与标题同行、单元格「-」占位+
 *   悬停铅笔、底行行号列蓝色+加行）；LiteralExpression=文本域（头部变量名/
 *   类型/表达式语言/形态标签，点击形态标签弹形态菜单）。
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
  // 视图头槽位（截图版式「名 | Hit policy: [▼]」）；内容随 rerender 重填
  const slot = el('span', 'dmn-view-headslot');
  deps.views.open(element, title, body, slot);

  const rerender = () => {
    body.textContent = '';
    slot.textContent = '';
    renderDecisionBody(body, slot, bo, deps, rerender);
  };
  rerender();
}

function renderDecisionBody(body: HTMLElement, slot: HTMLElement, bo: any, deps: EditorDeps, rerender: () => void): void {
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
    slot.append(el('span', 'dmn-editor-sep', ''));
    slot.append(labelText('Hit policy:'));
    slot.append(hitPolicySelect(logic, deps, rerender));
    renderDecisionTable(body, logic, deps, rerender);
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

// ---- 决策表（用户截图版式：单行四角表头——左上族标记 When/Then/Annotations
// （族内次列起 And）、中间列名、右下类型；深蓝圆形 ⊕ 骑族界缝与标题同行；
// 单元格「-」占位+悬停铅笔、底行行号列蓝色+） ----
function renderDecisionTable(body: HTMLElement, table: any, deps: EditorDeps, rerender: () => void): void {
  const inputs: any[] = table.get('input') ?? [];
  const outputs: any[] = table.get('output') ?? [];
  const annotations: any[] = table.get('annotation') ?? [];
  const rules: any[] = table.get('rule') ?? [];
  // 空族保留一格占位列——全表列数恒定（1 行号 + 输入 + 输出 + 注记），表头/数据行不错位
  const nIn = Math.max(inputs.length, 1);
  const nOut = Math.max(outputs.length, 1);
  const nAnn = Math.max(annotations.length, 1);

  const tableEl = el('table', 'dmn-table') as HTMLTableElement;
  const thead = tableEl.createTHead();

  // 表头行（单行四角布局：左上=族标记 When/Then/Annotations（族内次列起 And）、
  // 中间=列名、右下=类型；⊕ 深蓝圆钮骑族界缝，与标题同一行）
  const headRow = thead.insertRow();
  headRow.className = 'dmn-table-colrow';
  headRow.append(el('th', 'dmn-table-rownum'));
  appendClauseHeaders(headRow, inputs, 'input', 'When', deps, rerender, () => {
    addClause(deps, table, 'input');
    rerender();
  });
  appendClauseHeaders(headRow, outputs, 'output', 'Then', deps, rerender, () => {
    addClause(deps, table, 'output');
    rerender();
  });
  appendAnnotationHeaders(headRow, annotations, deps, rerender);

  // 规则行（显式 tbody：tableEl.insertRow 会误插 thead）：行号 + 条目格
  const tbody = tableEl.createTBody();
  rules.forEach((rule: any, ri: number) => {
    const tr = tbody.insertRow();
    tr.className = 'dmn-table-rule';
    tr.append(el('td', 'dmn-table-rownum', String(ri + 1)));
    appendEntryCells(tr, rule.get('inputEntry'), nIn, deps, rerender);
    appendEntryCells(tr, rule.get('outputEntry'), nOut, deps, rerender);
    appendEntryCells(tr, rule.get('annotationEntry'), nAnn, deps, rerender);
  });

  // 底行：行号列蓝色 + 加规则
  const addRow = tbody.insertRow();
  addRow.className = 'dmn-table-addrow';
  const addTd = el('td', 'dmn-table-rownum') as HTMLTableCellElement;
  const addBtn = el('button', 'dmn-table-add', '+') as HTMLButtonElement;
  addBtn.type = 'button';
  addBtn.title = '添加规则';
  addBtn.addEventListener('click', () => {
    addRule(deps, table);
    rerender();
  });
  addTd.append(addBtn);
  addRow.append(addTd);
  const fill = el('td', 'dmn-table-addrow-fill') as HTMLTableCellElement;
  fill.colSpan = nIn + nOut + nAnn;
  addRow.append(fill);

  body.append(tableEl);
  // 钉列宽（首渲按内容测量，此后冻结 px + fixed 布局）：编辑控件为出流浮层 +
  // 列宽钉死，进入/退出编辑表格几何零变化（点击编辑不再引起整表抖动）；
  // 每条列界线挂拖拽手柄（列宽手动可调，WeakMap 按 bo 记忆跨 rerender）
  pinColumnWidths(tableEl, [
    ROWNUM_COL_KEY,
    ...columnKeys(inputs, EMPTY_INPUT_COL_KEY),
    ...columnKeys(outputs, EMPTY_OUTPUT_COL_KEY),
    ...columnKeys(annotations, EMPTY_ANN_COL_KEY)
  ]);
}

// ---- 列宽管理：钉宽 + 边线拖拽 ----
/** 列宽记忆（WeakMap 按 bo 弱引用：rerender 重建表格后手动调宽不丢，bo 回收不泄漏） */
const COL_WIDTHS = new WeakMap<object, number>();
const ROWNUM_COL_KEY: object = { col: 'rownum' };
const EMPTY_INPUT_COL_KEY: object = { col: 'empty-input' };
const EMPTY_OUTPUT_COL_KEY: object = { col: 'empty-output' };
const EMPTY_ANN_COL_KEY: object = { col: 'empty-ann' };
/** 拖拽下限：内容再多也不许压破（占位列首宽 140、行号列 36 取孰小） */
const MIN_COL_WIDTH = 40;

function columnKeys(clauses: any[], emptyKey: object): object[] {
  return clauses.length > 0 ? clauses : [emptyKey];
}

/** 钉列宽：首渲测量（或取记忆值）→ 显式 px + fixed 布局，列宽全受控；逐格挂边线拖拽手柄 */
function pinColumnWidths(tableEl: HTMLTableElement, keys: object[]): void {
  const cells = Array.from(tableEl.rows[0].cells);
  let total = 0;
  cells.forEach((cell, i) => {
    const width = COL_WIDTHS.get(keys[i]) ?? cell.offsetWidth;
    COL_WIDTHS.set(keys[i], width);
    cell.style.width = `${width}px`;
    cell.style.minWidth = '0px';
    attachColumnResize(tableEl, cell, cells[i + 1] ?? null, keys[i], keys[i + 1] ?? null);
    total += width;
  });
  tableEl.style.width = `${total}px`;
  tableEl.style.tableLayout = 'fixed';
}

function applyColumnWidth(cell: HTMLTableCellElement, key: object, width: number): void {
  const w = Math.round(width);
  cell.style.width = `${w}px`;
  COL_WIDTHS.set(key, w);
}

/** 列界线拖拽手柄：拖左列宽、右邻互补（表总宽不变）；末列无边线互补，总宽随动 */
function attachColumnResize(
  tableEl: HTMLTableElement,
  cell: HTMLTableCellElement,
  next: HTMLTableCellElement | null,
  key: object,
  nextKey: object | null
): void {
  const handle = document.createElement('div');
  handle.className = 'dmn-table-colresize';
  handle.title = '拖拽调整列宽';
  cell.append(handle);
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const wA = cell.offsetWidth;
    const wB = next ? next.offsetWidth : 0;
    const minA = Math.min(MIN_COL_WIDTH, wA);
    const minB = next ? Math.min(MIN_COL_WIDTH, wB) : 0;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('is-active');
    tableEl.classList.add('dmn-table--resizing');
    const retotal = () => {
      tableEl.style.width = `${Array.from(tableEl.rows[0].cells).reduce((s, c) => s + c.offsetWidth, 0)}px`;
    };
    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      let newA = wA + delta;
      if (next) {
        newA = Math.min(Math.max(newA, minA), wA + wB - minB);
      } else {
        newA = Math.max(newA, minA);
      }
      applyColumnWidth(cell, key, newA);
      if (next) applyColumnWidth(next, nextKey!, wA + wB - newA);
      retotal();
    };
    const onDone = () => {
      ac.abort();
      handle.classList.remove('is-active');
      tableEl.classList.remove('dmn-table--resizing');
    };
    const ac = new AbortController();
    handle.addEventListener('pointermove', onMove, { signal: ac.signal });
    handle.addEventListener('pointerup', onDone, { signal: ac.signal });
    handle.addEventListener('pointercancel', onDone, { signal: ac.signal });
  });
}

/** 族界加列钮：深蓝圆形 ⊕，绝对定位骑族尾列表头格右缘缝（宿主格 position:relative），与标题同行 */
function seamAddButton(title: string, onClick: () => void): HTMLButtonElement {
  const btn = el('button', 'dmn-table-addcol', '+') as HTMLButtonElement;
  btn.type = 'button';
  btn.title = title;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function appendClauseHeaders(
  row: HTMLTableRowElement,
  clauses: any[],
  kind: 'input' | 'output',
  groupLabel: string,
  deps: EditorDeps,
  rerender: () => void,
  onAdd: () => void
): void {
  if (clauses.length === 0) {
    const th = el('th', 'dmn-table-colhead dmn-table-colhead--empty');
    th.append(el('span', 'dmn-table-colgroup', groupLabel));
    th.append(seamAddButton(kind === 'input' ? 'add input' : 'add output', onAdd));
    row.append(th);
    return;
  }
  clauses.forEach((clause, i) => {
    row.append(clauseHeaderCell(
      clause, kind, i === 0 ? groupLabel : 'And', deps, rerender,
      i === clauses.length - 1 ? onAdd : null
    ));
  });
}

/** 注记列头：四角布局（左上 Annotations/And + 中间名点击编辑）；空族保留占位格 */
function appendAnnotationHeaders(row: HTMLTableRowElement, annotations: any[], deps: EditorDeps, rerender: () => void): void {
  if (annotations.length === 0) {
    const th = el('th', 'dmn-table-colhead dmn-table-colhead--empty');
    th.append(el('span', 'dmn-table-colgroup', 'Annotations'));
    row.append(th);
    return;
  }
  annotations.forEach((ann: any, i: number) => {
    const th = el('th', 'dmn-table-colhead') as HTMLTableCellElement;
    th.append(el('span', 'dmn-table-colgroup', i === 0 ? 'Annotations' : 'And'));
    const nameText: string = ann.get('name') ?? '';
    const nameEl = el('div', 'dmn-table-colname', nameText || 'Annotation');
    if (!nameText) nameEl.classList.add('is-empty');
    nameEl.addEventListener('click', () => {
      startInlineEdit(th, nameText, (v) => {
        if (v !== undefined && v !== nameText) {
          deps.modeling.updateModdleProperties(ann, ann, { name: v });
        }
        rerender();
      });
    });
    th.append(nameEl);
    row.append(th);
  });
}

/** 列头格（四角布局）：左上=族标记、中间=名（空显 Input/Output 灰字）、右下=类型（空显 -）；名/类型点击进编辑 */
function clauseHeaderCell(clause: any, kind: 'input' | 'output', groupLabel: string, deps: EditorDeps, rerender: () => void, onAdd: (() => void) | null): HTMLTableCellElement {
  const th = el('th', 'dmn-table-colhead') as HTMLTableCellElement;
  th.append(el('span', 'dmn-table-colgroup', groupLabel));
  const expr = kind === 'input' ? clause.get('inputExpression') : undefined;
  const nameText: string = (kind === 'input' ? expr?.get('text') : clause.get('name')) ?? '';
  const typeText: string = (kind === 'input' ? expr?.get('typeRef') : clause.get('typeRef')) ?? '';

  const commitName = (v: string) => {
    if (kind === 'input') {
      if (expr) {
        deps.modeling.updateModdleProperties(clause, expr, { text: v });
      } else {
        deps.modeling.updateModdleProperties(clause, clause, {
          inputExpression: deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: v })
        });
      }
    } else {
      deps.modeling.updateModdleProperties(clause, clause, { name: v });
    }
  };
  const commitType = (v: string) => {
    if (kind === 'input') {
      if (expr) {
        deps.modeling.updateModdleProperties(clause, expr, { typeRef: v || undefined });
      } else if (v) {
        deps.modeling.updateModdleProperties(clause, clause, {
          inputExpression: deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: '', typeRef: v })
        });
      }
    } else {
      deps.modeling.updateModdleProperties(clause, clause, { typeRef: v || undefined });
    }
  };

  const nameEl = el('div', 'dmn-table-colname', nameText || (kind === 'input' ? 'Input' : 'Output'));
  if (!nameText) nameEl.classList.add('is-empty');
  nameEl.addEventListener('click', () => {
    startInlineEdit(th, nameText, (v) => {
      if (v !== undefined && v !== nameText) commitName(v);
      rerender();
    });
  });
  const typeEl = el('div', 'dmn-table-coltype', typeText || '-');
  if (!typeText) typeEl.classList.add('is-empty');
  typeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    startTypeEdit(th, typeText, (v) => {
      if (v !== undefined && v !== typeText) commitType(v);
      rerender();
    });
  });
  th.append(nameEl, typeEl);
  if (onAdd) {
    th.append(seamAddButton(kind === 'input' ? 'add input' : 'add output', onAdd));
  }
  return th;
}

/** 规则条目格：文本或「-」灰占位 + 悬停铅笔钮；点击进入就地编辑 */
function ruleEntryCell(entry: any, deps: EditorDeps, rerender: () => void): HTMLTableCellElement {
  const td = el('td', 'dmn-table-cell') as HTMLTableCellElement;
  const text: string = entry.get('text') ?? '';
  const span = el('span', 'dmn-table-celltext', text || '-');
  if (!text) span.classList.add('is-empty');
  const pencil = el('button', 'dmn-table-pencil') as HTMLButtonElement;
  pencil.type = 'button';
  pencil.innerHTML = PENCIL_SVG;
  pencil.title = '编辑';
  const edit = () => startInlineEdit(td, text, (v) => {
    if (v !== undefined && v !== text) {
      deps.modeling.updateModdleProperties(entry, entry, { text: v });
    }
    rerender();
  });
  span.addEventListener('click', edit);
  pencil.addEventListener('click', (e) => {
    e.stopPropagation();
    edit();
  });
  td.append(span, pencil);
  return td;
}

function appendEntryCells(tr: HTMLTableRowElement, entries: any[] | undefined, count: number, deps: EditorDeps, rerender: () => void): void {
  for (let i = 0; i < count; i++) {
    const entry = entries?.[i];
    // 条目数与子句数由 dmn.table.clause 命令成对维护；缺失格仅作空显示（导入异常数据不炸表）
    tr.append(entry ? ruleEntryCell(entry, deps, rerender) : el('td', 'dmn-table-cell'));
  }
}

/** 自绘铅笔图标（12px，currentColor） */
const PENCIL_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">'
  + '<path d="M11.3 2.9l1.8 1.8-7.4 7.4-2.4.6.6-2.4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>'
  + '<path d="M10.1 4.1l1.8 1.8" stroke="currentColor" stroke-width="1.3"/>'
  + '</svg>';

/** 就地文本编辑：清空宿主→输入框（聚焦全选）；Enter/失焦提交，Escape 取消（回传 undefined） */
function startInlineEdit(host: HTMLElement, value: string, onDone: (v: string | undefined) => void): void {
  const input = document.createElement('input');
  input.className = 'dmn-table-edit';
  input.value = value;
  host.textContent = '';
  host.append(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (save: boolean) => {
    if (done) return;
    done = true;
    onDone(save ? input.value : undefined);
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
}

/** 就地类型编辑：换成类型下拉；选定提交（空项=清类型，回传 ''），失焦未选=取消（undefined） */
function startTypeEdit(host: HTMLElement, current: string, onDone: (v: string | undefined) => void): void {
  host.textContent = '';
  let done = false;
  const select = buildTypeSelect(current || undefined, (v) => {
    if (done) return;
    done = true;
    onDone(v ?? '');
  });
  select.classList.add('dmn-table-edit');
  host.append(select);
  select.focus();
  select.addEventListener('blur', () => {
    if (done) return;
    done = true;
    onDone(undefined);
  });
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
  // 内容区零留白（决策表全幅贴边）——非表视图经 pad 容器恢复内边距
  const pad = el('div', 'dmn-editor-pad');
  body.append(pad);
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
  pad.append(head);
  pad.append(makeTextArea(logic.text, (v) => {
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
  pad.append(langRow);
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
  // 内容区零留白（决策表全幅贴边）——BKM 区块经 pad 容器恢复内边距
  const pad = el('div', 'dmn-editor-pad');
  body.append(pad);
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
  pad.append(params);

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
  pad.append(bodyEl);

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
  pad.append(result);
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
