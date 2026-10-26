/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 决策表编辑器（自研 DOM 网格）：子句（输入/输出/注释列）增删与命名/
 * typeRef 下拉、规则（行）增删插、单元格就地编辑、命中策略（含 COLLECT
 * 聚合子选）、键盘导航（方向键/Enter）、行号。全部编辑经命令栈（可撤销），
 * commandStack.changed 全量重渲（网格规模小，换取单一渲染路径）。
 *
 * 规范对应：dmn:DecisionTable §8.2（hitPolicy/aggregation 枚举）、InputClause
 * 名称=inputExpression.text（常用形）/OutputClause.name、行内条目与子句成对
 * （ClauseHandlers 单命令保证）。
 */
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnMode } from '../mode/DmnMode';
import type { DmnI18n } from '../i18n/DmnI18n';

/** 命中策略全集（规范 §8.2.2 hitPolicy 枚举），label 经 i18n */
const HIT_POLICIES: Array<{ value: string; labelKey: string }> = [
  { value: 'UNIQUE', labelKey: '命中策略·唯一（U）' },
  { value: 'FIRST', labelKey: '命中策略·首个（F）' },
  { value: 'PRIORITY', labelKey: '命中策略·优先级（P）' },
  { value: 'ANY', labelKey: '命中策略·任意（A）' },
  { value: 'COLLECT', labelKey: '命中策略·收集（C）' },
  { value: 'RULE_ORDER', labelKey: '命中策略·规则序（R）' },
  { value: 'OUTPUT_ORDER', labelKey: '命中策略·输出序（O）' }
];

/** COLLECT 聚合子选（规范 §8.2.3 aggregation 枚举） */
const AGGREGATIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'SUM', labelKey: '求和' },
  { value: 'COUNT', labelKey: '计数' },
  { value: 'MIN', labelKey: '最小' },
  { value: 'MAX', labelKey: '最大' }
];

/** typeRef 候选（FEEL 基础类型，规范 §10.3）；既有值不在列时追加显示不破坏 */
const TYPE_REFS = [
  'string', 'boolean', 'integer', 'decimal', 'date', 'time',
  'dateTime', 'daysAndTimeDuration', 'yearsAndMonthsDuration'
];

/** 子句三分支的元数据（属性名/条目属性/条目类型/缺省名） */
const CLAUSE_KINDS = {
  input: { property: 'input', entryProperty: 'inputEntry', entryType: 'dmn:UnaryTests' },
  output: { property: 'output', entryProperty: 'outputEntry', entryType: 'dmn:LiteralExpression' },
  annotation: { property: 'annotation', entryProperty: 'annotationEntry', entryType: 'dmn:RuleAnnotation' }
} as const;

export interface DecisionTableEditorDeps {
  modeling: any;
  eventBus: any;
  elementRegistry: any;
  dmnFactory: DmnFactory;
  dmnMode: DmnMode;
  i18n: DmnI18n;
}

export class DecisionTableEditor {
  private readonly root: HTMLElement;
  /** 重渲后恢复焦点用：{ rule: 行序, col: 列序（含 rownum 列） } */
  private focusCell: { row: number; col: number } | null = null;
  private destroyed = false;

  constructor(
    container: HTMLElement,
    private readonly decision: any,
    private readonly deps: DecisionTableEditorDeps
  ) {
    this.root = document.createElement('div');
    this.root.className = 'dmn-table-editor';
    container.appendChild(this.root);
    // 命令栈变化（含撤销重做/面板侧编辑）与模式切换（预览只读化）全量重渲
    this.deps.eventBus.on('commandStack.changed', this.rerender);
    this.deps.eventBus.on('mode.changed', this.rerender);
    this.render();
  }

  /** 事件回调须稳定引用（destroy 时摘除） */
  private readonly rerender = (): void => {
    this.render();
  };

  destroy(): void {
    this.destroyed = true;
    this.deps.eventBus.off('commandStack.changed', this.rerender);
    this.deps.eventBus.off('mode.changed', this.rerender);
    this.root.remove();
  }

  private get table(): any {
    return this.decision.decisionLogic;
  }

  private get editable(): boolean {
    return this.deps.dmnMode.isEditable();
  }

  private get canvasElement(): any {
    // 命令归属元素：决策的画布形状（视图存在=决策在 DRD 上）
    return this.deps.elementRegistry.get(this.decision.id);
  }

  render(): void {
    if (this.destroyed) {
      return;
    }
    this.root.replaceChildren(this.buildGrid());
    this.restoreFocus();
  }

  // ---------- 构建 ----------

  private buildGrid(): HTMLElement {
    const t = this.deps.i18n.t.bind(this.deps.i18n);
    const table = this.table;
    const wrap = document.createElement('div');
    wrap.className = 'dmn-table-wrap';

    const grid = document.createElement('table');
    grid.className = 'dmn-table-grid';
    grid.appendChild(this.buildHeader(table));
    const tbody = document.createElement('tbody');
    (table.rule ?? []).forEach((rule: any, index: number) => {
      tbody.appendChild(this.buildRuleRow(table, rule, index));
    });
    grid.appendChild(tbody);
    if (this.editable) {
      grid.appendChild(this.buildFooterRow(table));
    }
    wrap.appendChild(grid);

    if (this.editable) {
      const actions = document.createElement('div');
      actions.className = 'dmn-table-actions';
      actions.appendChild(this.actionButton(t('+ 输入列'), () => this.addClause('input')));
      actions.appendChild(this.actionButton(t('+ 输出列'), () => this.addClause('output')));
      actions.appendChild(this.actionButton(t('+ 注释列'), () => this.addClause('annotation')));
      wrap.appendChild(actions);
    }
    return wrap;
  }

  private buildHeader(table: any): HTMLElement {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    tr.appendChild(this.buildHitPolicyCell(table));
    this.forEachClause(table, (kind, clause) => {
      tr.appendChild(this.buildClauseHead(kind, clause));
    });
    thead.appendChild(tr);
    return thead;
  }

  /** 左上角命中策略格：规范记法位（U/F/P/A/C/R/O），COLLECT 时带聚合子选 */
  private buildHitPolicyCell(table: any): HTMLElement {
    const th = document.createElement('th');
    th.className = 'dmn-table-hit';
    const select = this.selectEl(HIT_POLICIES, table.hitPolicy ?? 'UNIQUE', (value) => {
      this.deps.modeling.updateModdleProperties(this.canvasElement, table, { hitPolicy: value });
    });
    if (!this.editable) {
      select.disabled = true;
    }
    th.appendChild(select);
    if ((table.hitPolicy ?? 'UNIQUE') === 'COLLECT') {
      const agg = this.selectEl(AGGREGATIONS, table.aggregation ?? '', (value) => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, table, {
          aggregation: value || undefined
        });
      });
      agg.classList.add('dmn-table-agg');
      agg.prepend(new Option(this.deps.i18n.t('不聚合'), ''));
      if (!this.editable) {
        agg.disabled = true;
      }
      th.appendChild(agg);
    }
    return th;
  }

  private buildClauseHead(kind: 'input' | 'output' | 'annotation', clause: any): HTMLElement {
    const t = this.deps.i18n.t.bind(this.deps.i18n);
    const th = document.createElement('th');
    th.className = `dmn-table-clause dmn-table-${kind}`;

    const title = document.createElement('div');
    title.className = 'dmn-clause-title';
    const badge = document.createElement('span');
    badge.className = 'dmn-clause-badge';
    badge.textContent = kind === 'input' ? t('输入') : kind === 'output' ? t('输出') : t('注释');
    title.appendChild(badge);

    // 名称：输入列=inputExpression.text（常用形）、输出/注释=自身 name 属性
    const nameTarget = kind === 'input' ? clause.inputExpression : clause;
    const nameKey = kind === 'input' ? 'text' : 'name';
    const nameInput = document.createElement('input');
    nameInput.className = 'dmn-clause-name';
    nameInput.value = nameTarget?.[nameKey] ?? '';
    nameInput.placeholder = t(kind === 'input' ? '输入表达式' : '列名');
    if (this.editable) {
      nameInput.addEventListener('change', () => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, nameTarget, {
          [nameKey]: nameInput.value || undefined
        });
      });
    } else {
      nameInput.disabled = true;
    }
    title.appendChild(nameInput);

    // typeRef：输入列在 inputExpression 上，输出列在子句自身；注释列无类型
    if (kind !== 'annotation') {
      const typeTarget = kind === 'input' ? clause.inputExpression : clause;
      const typeSelect = this.typeRefSelect(typeTarget?.typeRef, (value) => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, typeTarget, {
          typeRef: value || undefined
        });
      });
      title.appendChild(typeSelect);
    }

    if (this.editable) {
      const del = document.createElement('button');
      del.className = 'dmn-clause-del';
      del.textContent = '×';
      del.title = t('删除列');
      del.addEventListener('click', () => this.removeClause(kind, clause));
      title.appendChild(del);
    }
    th.appendChild(title);
    return th;
  }

  private buildRuleRow(table: any, rule: any, index: number): HTMLElement {
    const t = this.deps.i18n.t.bind(this.deps.i18n);
    const tr = document.createElement('tr');
    tr.className = 'dmn-table-rule';

    const rownum = document.createElement('td');
    rownum.className = 'dmn-table-rownum';
    const num = document.createElement('span');
    num.textContent = String(index + 1);
    rownum.appendChild(num);
    if (this.editable) {
      const ops = document.createElement('span');
      ops.className = 'dmn-row-ops';
      ops.appendChild(this.tinyButton('＋', t('上方插入规则'), () => this.addRule(index)));
      ops.appendChild(this.tinyButton('×', t('删除规则'), () => this.removeRule(rule)));
      rownum.appendChild(ops);
    }
    tr.appendChild(rownum);

    this.forEachClause(table, (kind, _clause, clauseIndex, globalIndex) => {
      const entry = (rule[CLAUSE_KINDS[kind].entryProperty] ?? [])[clauseIndex];
      tr.appendChild(this.buildCell(kind, entry ?? null, index, globalIndex + 1));
    });
    return tr;
  }

  /** 单元格：文本就位编辑（空条目也提供输入位——落字即建 text） */
  private buildCell(kind: 'input' | 'output' | 'annotation', entry: any, rowIndex: number, colIndex: number): HTMLElement {
    const td = document.createElement('td');
    td.className = `dmn-table-cell dmn-cell-${kind}`;
    const input = document.createElement('input');
    input.className = 'dmn-cell-input';
    input.value = entry?.text ?? '';
    input.dataset.row = String(rowIndex);
    input.dataset.col = String(colIndex);
    if (this.editable) {
      input.addEventListener('change', () => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, entry, {
          text: input.value || undefined
        });
      });
      input.addEventListener('keydown', (event) => this.onCellKeydown(event));
      input.addEventListener('focus', () => {
        this.focusCell = { row: rowIndex, col: colIndex };
      });
    } else {
      input.disabled = true;
    }
    td.appendChild(input);
    return td;
  }

  private buildFooterRow(table: any): HTMLElement {
    const t = this.deps.i18n.t.bind(this.deps.i18n);
    const tfoot = document.createElement('tfoot');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.className = 'dmn-table-add-rule';
    td.colSpan = 1 + this.clauseCount(table);
    const btn = this.actionButton(t('+ 添加规则'), () => this.addRule());
    td.appendChild(btn);
    tr.appendChild(td);
    tfoot.appendChild(tr);
    return tfoot;
  }

  // ---------- 命令流 ----------

  private addRule(beforeIndex?: number): void {
    const table = this.table;
    const rule = this.deps.dmnFactory.create<any>({ $type: 'dmn:DecisionRule' });
    // 行内条目与子句成对（规范 §8.2.14）：建行即按当前子句铺满空条目
    for (const kind of Object.keys(CLAUSE_KINDS) as Array<'input' | 'output' | 'annotation'>) {
      const count = (table[CLAUSE_KINDS[kind].property] ?? []).length;
      const entries: any[] = [];
      for (let i = 0; i < count; i++) {
        entries.push(this.deps.dmnFactory.create<any>({ $type: CLAUSE_KINDS[kind].entryType }));
      }
      if (entries.length) {
        rule[CLAUSE_KINDS[kind].entryProperty] = entries;
      }
    }
    const index = beforeIndex === undefined ? undefined : beforeIndex;
    this.deps.modeling.listAdd(this.canvasElement, table, 'rule', rule, index);
    this.focusCell = { row: (index ?? (table.rule ?? []).length - 1), col: 1 };
  }

  private removeRule(rule: any): void {
    this.deps.modeling.listRemove(this.canvasElement, this.table, 'rule', rule);
  }

  private addClause(kind: 'input' | 'output' | 'annotation'): void {
    const meta = CLAUSE_KINDS[kind];
    const clause =
      kind === 'input'
        ? this.deps.dmnFactory.create<any>({
            $type: 'dmn:InputClause',
            inputExpression: this.deps.dmnFactory.create<any>({
              $type: 'dmn:LiteralExpression',
              typeRef: 'string'
            })
          })
        : kind === 'output'
          ? this.deps.dmnFactory.create<any>({ $type: 'dmn:OutputClause', typeRef: 'string' })
          : this.deps.dmnFactory.create<any>({ $type: 'dmn:RuleAnnotationClause' });
    this.deps.modeling.clauseAdd(this.canvasElement, {
      table: this.table,
      property: meta.property,
      entryProperty: meta.entryProperty,
      clause,
      createEntry: () => this.deps.dmnFactory.create<any>({ $type: meta.entryType })
    });
  }

  private removeClause(kind: 'input' | 'output' | 'annotation', clause: any): void {
    const meta = CLAUSE_KINDS[kind];
    this.deps.modeling.clauseRemove(this.canvasElement, {
      table: this.table,
      property: meta.property,
      entryProperty: meta.entryProperty,
      clause,
      createEntry: () => this.deps.dmnFactory.create<any>({ $type: meta.entryType })
    });
  }

  // ---------- 键盘导航 ----------

  private onCellKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const move = (dRow: number, dCol: number): void => {
      const row = Number(input.dataset.row) + dRow;
      const col = Number(input.dataset.col) + dCol;
      const next = this.cellInputAt(row, col);
      if (next) {
        event.preventDefault();
        next.focus();
      }
    };
    if (event.key === 'ArrowDown' || event.key === 'Enter') {
      move(1, 0);
    } else if (event.key === 'ArrowUp') {
      move(-1, 0);
    } else if (event.key === 'ArrowLeft' && input.selectionStart === 0 && input.selectionEnd === 0) {
      move(0, -1);
    } else if (
      event.key === 'ArrowRight' &&
      input.selectionStart === input.value.length &&
      input.selectionEnd === input.value.length
    ) {
      move(0, 1);
    }
  }

  private cellInputAt(row: number, col: number): HTMLInputElement | null {
    return this.root.querySelector<HTMLInputElement>(
      `.dmn-cell-input[data-row="${row}"][data-col="${col}"]`
    );
  }

  /** 命令后全量重渲的焦点恢复（编辑连续性） */
  private restoreFocus(): void {
    if (!this.focusCell) {
      return;
    }
    const input = this.cellInputAt(this.focusCell.row, this.focusCell.col);
    if (input) {
      input.focus();
    }
  }

  // ---------- 小件 ----------

  private forEachClause(
    table: any,
    fn: (kind: 'input' | 'output' | 'annotation', clause: any, index: number, globalIndex: number) => void
  ): void {
    let globalIndex = 0;
    for (const kind of Object.keys(CLAUSE_KINDS) as Array<'input' | 'output' | 'annotation'>) {
      (table[CLAUSE_KINDS[kind].property] ?? []).forEach((clause: any, index: number) => {
        fn(kind, clause, index, globalIndex++);
      });
    }
  }

  private clauseCount(table: any): number {
    return (Object.keys(CLAUSE_KINDS) as Array<keyof typeof CLAUSE_KINDS>).reduce(
      (sum, kind) => sum + (table[CLAUSE_KINDS[kind].property] ?? []).length,
      0
    );
  }

  private selectEl(
    options: Array<{ value: string; labelKey: string }>,
    value: string,
    onChange: (value: string) => void
  ): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'dmn-table-select';
    for (const opt of options) {
      select.add(new Option(this.deps.i18n.t(opt.labelKey), opt.value));
    }
    // 既有值不在候选（自定义/后续版本）时追加原值项，避免显示错位
    if (value && !options.some((o) => o.value === value)) {
      select.add(new Option(value, value));
    }
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  private typeRefSelect(current: string | undefined, onChange: (value: string) => void): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'dmn-clause-type';
    select.add(new Option(this.deps.i18n.t('类型'), ''));
    for (const type of TYPE_REFS) {
      select.add(new Option(type, type));
    }
    if (current && !TYPE_REFS.includes(current)) {
      select.add(new Option(current, current));
    }
    select.value = current ?? '';
    if (this.editable) {
      select.addEventListener('change', () => onChange(select.value));
    } else {
      select.disabled = true;
    }
    return select;
  }

  private actionButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dmn-table-btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private tinyButton(text: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dmn-tiny-btn';
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }
}
