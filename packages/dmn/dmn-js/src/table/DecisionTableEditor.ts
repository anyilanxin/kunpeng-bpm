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
 * 决策表编辑器（自研 DOM 网格，bpmn.io 风格版式）：
 * 头部行（决策名+命中策略）+ 组头行（When/And | Then/And | Annotations
 * 标准记法词，英文为规范记法关键词不译）+ 两行式列头（名称居中/typeRef
 * 小字右下角点击弹选）+ 窄行号列。加列入口=族界圆形加号（输入族尾缝加输入、
 * 输出族尾缝加输出、注释族尾缝加注释；族空退化锚前一族尾格，同格多钮按
 * 族序水平级联）；加行入口=行号列底格 "+"。全部编辑经命令栈（可撤销），
 * commandStack.changed 全量重渲（网格规模小，换取单一渲染路径）。
 *
 * 规范对应：dmn:DecisionTable §8.2（hitPolicy/aggregation 枚举）、InputClause
 * 名称=inputExpression.text（常用形）/OutputClause.name、行内条目与子句成对
 * （ClauseHandlers 单命令保证）。
 */
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnMode } from '../mode/DmnMode';
import type { DmnI18n } from '../i18n/DmnI18n';
import { backButton } from '../views/backButton';

/** 命中策略全集（规范 §8.2.2 hitPolicy 枚举），label 经 i18n */
const HIT_POLICIES: Array<{ value: string; labelKey: string }> = [
  { value: 'UNIQUE', labelKey: '唯一（U）' },
  { value: 'FIRST', labelKey: '首个（F）' },
  { value: 'PRIORITY', labelKey: '优先级（P）' },
  { value: 'ANY', labelKey: '任意（A）' },
  { value: 'COLLECT', labelKey: '收集（C）' },
  { value: 'RULE_ORDER', labelKey: '规则序（R）' },
  { value: 'OUTPUT_ORDER', labelKey: '输出序（O）' }
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

type ClauseKind = keyof typeof CLAUSE_KINDS;

/** 族界加号直径（px）：骑缝偏移与级联步进的唯一事实源 */
const SEAM_BTN_D = 20;

export interface DecisionTableEditorDeps {
  modeling: any;
  eventBus: any;
  elementRegistry: any;
  dmnFactory: DmnFactory;
  dmnMode: DmnMode;
  i18n: DmnI18n;
  /** 视图管理（返回 DRD 通道） */
  dmnViews: { open(id: string): void };
}

export class DecisionTableEditor {
  private readonly root: HTMLElement;
  /** 重渲后恢复焦点用：{ rule: 行序, col: 列序（含 rownum 列） } */
  private focusCell: { row: number; col: number } | null = null;
  /** 列头 typeRef 弹出选择态：正编辑类型的列（globalIndex） */
  private editingTypeCol: number | null = null;
  /** 加列后待聚焦的列名单元格（globalIndex） */
  private pendingFocusClause: number | null = null;
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
    this.root.replaceChildren(this.buildHeader(), this.buildGrid());
    this.restoreFocus();
  }

  // ---------- 头部行（决策名 + 命中策略） ----------

  private buildHeader(): HTMLElement {
    const t = this.deps.i18n.t.bind(this.deps.i18n);
    const header = document.createElement('div');
    header.className = 'dmn-table-header';
    header.appendChild(backButton(t, () => this.deps.dmnViews.open('drd')));

    const title = document.createElement('input');
    title.className = 'dmn-table-title';
    title.value = this.decision.name ?? '';
    title.placeholder = t('未命名决策');
    if (this.editable) {
      title.addEventListener('change', () => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, this.decision, {
          name: title.value || undefined
        });
      });
    } else {
      title.disabled = true;
    }
    header.appendChild(title);

    const hitbar = document.createElement('div');
    hitbar.className = 'dmn-table-hitbar';
    const label = document.createElement('span');
    label.className = 'dmn-table-hitbar-label';
    label.textContent = t('命中策略：');
    hitbar.appendChild(label);
    const table = this.table;
    const select = this.selectEl(HIT_POLICIES, table.hitPolicy ?? 'UNIQUE', (value) => {
      this.deps.modeling.updateModdleProperties(this.canvasElement, table, { hitPolicy: value });
    });
    if (!this.editable) {
      select.disabled = true;
    }
    hitbar.appendChild(select);
    if ((table.hitPolicy ?? 'UNIQUE') === 'COLLECT') {
      const agg = this.selectEl(AGGREGATIONS, table.aggregation ?? '', (value) => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, table, {
          aggregation: value || undefined
        });
      });
      agg.classList.add('dmn-table-agg');
      agg.prepend(new Option(t('不聚合'), ''));
      if (!this.editable) {
        agg.disabled = true;
      }
      hitbar.appendChild(agg);
    }
    header.appendChild(hitbar);
    return header;
  }

  // ---------- 表格构建 ----------

  private buildGrid(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'dmn-table-wrap';

    const grid = document.createElement('table');
    grid.className = 'dmn-table-grid';
    grid.appendChild(this.buildHead());
    const tbody = document.createElement('tbody');
    (this.table.rule ?? []).forEach((rule: any, index: number) => {
      tbody.appendChild(this.buildRuleRow(this.table, rule, index));
    });
    grid.appendChild(tbody);
    if (this.editable) {
      grid.appendChild(this.buildFooterRow());
    }
    wrap.appendChild(grid);
    return wrap;
  }

  /** thead 两行：tr1 组头（When/And | Then/And | Annotations + 族界加号），tr2 列头 */
  private buildHead(): HTMLElement {
    const t = this.deps.i18n.t.bind(this.deps.i18n);
    const thead = document.createElement('thead');

    const groupRow = document.createElement('tr');
    groupRow.className = 'dmn-table-groups';
    const corner = document.createElement('th');
    corner.className = 'dmn-table-corner';
    corner.rowSpan = 2;
    groupRow.appendChild(corner);

    // 组头格逐族生成并记录各族尾格（族界加号锚点）
    const familyTail: Partial<Record<ClauseKind, HTMLElement>> = {};
    const counts: Record<ClauseKind, number> = { input: 0, output: 0, annotation: 0 };
    this.forEachClause(this.table, (kind) => {
      counts[kind]++;
    });
    this.forEachClause(this.table, (kind, _clause, index) => {
      if (kind === 'annotation') {
        return; // 注释族合并为单一跨列格，下方统一渲染
      }
      const th = document.createElement('th');
      th.className = `dmn-table-group dmn-group-${kind}`;
      th.textContent = kind === 'input' ? (index === 0 ? 'When' : 'And') : index === 0 ? 'Then' : 'And';
      groupRow.appendChild(th);
      familyTail[kind] = th;
    });
    if (counts.annotation > 0) {
      const th = document.createElement('th');
      th.className = 'dmn-table-group dmn-group-annotation';
      th.colSpan = counts.annotation;
      th.textContent = 'Annotations';
      groupRow.appendChild(th);
      familyTail.annotation = th;
    }

    // 族界加号：锚=族尾格，族空退化锚前一族尾格（再空到行号列头格）；
    // 同格多钮按族序级联——族序靠后（更靠右的族）骑缝，其余格内右依次左排
    if (this.editable) {
      const anchors: Record<ClauseKind, HTMLElement> = {
        input: familyTail.input ?? corner,
        output: familyTail.output ?? familyTail.input ?? corner,
        annotation: familyTail.annotation ?? familyTail.output ?? familyTail.input ?? corner
      };
      const placements = new Map<HTMLElement, ClauseKind[]>();
      (Object.keys(anchors) as ClauseKind[]).forEach((kind) => {
        const cell = anchors[kind];
        const list = placements.get(cell) ?? [];
        list.push(kind);
        placements.set(cell, list);
      });
      placements.forEach((kinds, cell) => {
        cell.classList.add('dmn-group-anchor');
        kinds.forEach((kind, i) => {
          const isSeam = i === kinds.length - 1;
          const btn = this.seamButton(
            t(kind === 'input' ? '添加输入列' : kind === 'output' ? '添加输出列' : '添加注释列'),
            () => this.addClause(kind)
          );
          // 骑缝=中心压界（右移半径）；级联钮格内右起按直径+4 间距左排
          btn.style.right = isSeam
            ? `${-SEAM_BTN_D / 2}px`
            : `${4 + (kinds.length - 2 - i) * (SEAM_BTN_D + 4) + SEAM_BTN_D / 2}px`;
          cell.appendChild(btn);
        });
      });
    }
    thead.appendChild(groupRow);

    const clauseRow = document.createElement('tr');
    clauseRow.className = 'dmn-table-clauses';
    this.forEachClause(this.table, (kind, clause, _index, globalIndex) => {
      clauseRow.appendChild(this.buildClauseHead(kind, clause, globalIndex));
    });
    thead.appendChild(clauseRow);
    return thead;
  }

  /** 列头（tr2）：名称居中就地编辑、typeRef 小字右下角点击弹选、删除 × 悬停 */
  private buildClauseHead(kind: ClauseKind, clause: any, globalIndex: number): HTMLElement {
    const t = this.deps.i18n.t.bind(this.deps.i18n);
    const th = document.createElement('th');
    th.className = `dmn-table-clause dmn-table-${kind}`;

    if (this.editable) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'dmn-clause-del';
      del.textContent = '×';
      del.title = t('删除列');
      del.addEventListener('click', () => this.removeClause(kind, clause));
      th.appendChild(del);
    }

    // 名称：输入列=inputExpression.text（常用形）、输出/注释=自身 name 属性
    const nameTarget = kind === 'input' ? clause.inputExpression : clause;
    const nameKey = kind === 'input' ? 'text' : 'name';
    const nameInput = document.createElement('input');
    nameInput.className = 'dmn-clause-name';
    nameInput.value = nameTarget?.[nameKey] ?? '';
    nameInput.placeholder = t(kind === 'input' ? '输入表达式' : '列名');
    nameInput.dataset.clause = String(globalIndex);
    if (this.editable) {
      nameInput.addEventListener('change', () => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, nameTarget, {
          [nameKey]: nameInput.value || undefined
        });
      });
    } else {
      nameInput.disabled = true;
    }
    th.appendChild(nameInput);

    // typeRef：输入列在 inputExpression 上，输出列在子句自身；注释列无类型。
    // 小字显示、点击弹选（截图版式：类型是角落元信息而非常驻控件）
    if (kind !== 'annotation') {
      const typeTarget = kind === 'input' ? clause.inputExpression : clause;
      if (this.editable && this.editingTypeCol === globalIndex) {
        const typeSelect = this.typeRefSelect(typeTarget?.typeRef, (value) => {
          this.editingTypeCol = null;
          this.deps.modeling.updateModdleProperties(this.canvasElement, typeTarget, {
            typeRef: value || undefined
          });
        });
        typeSelect.dataset.clauseType = String(globalIndex);
        typeSelect.addEventListener('blur', () => {
          // change 已提交则 editingTypeCol 已空，此处幂等；未选择仅退出弹选态
          if (this.editingTypeCol === globalIndex) {
            this.editingTypeCol = null;
            this.render();
          }
        });
        th.appendChild(typeSelect);
      } else {
        const typeBtn = document.createElement('button');
        typeBtn.type = 'button';
        typeBtn.className = 'dmn-clause-type';
        typeBtn.textContent = typeTarget?.typeRef ?? t('类型');
        if (this.editable) {
          typeBtn.title = t('选择类型');
          typeBtn.addEventListener('click', () => {
            this.editingTypeCol = globalIndex;
            this.render();
          });
        } else {
          typeBtn.disabled = true;
        }
        th.appendChild(typeBtn);
      }
    }
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

  /** 单元格：文本就位编辑（空条目显示 '-' 占位——占位不落模型，落字即建 text） */
  private buildCell(kind: ClauseKind, entry: any, rowIndex: number, colIndex: number): HTMLElement {
    const td = document.createElement('td');
    td.className = `dmn-table-cell dmn-cell-${kind}`;
    const input = document.createElement('input');
    input.className = 'dmn-cell-input';
    input.value = entry?.text ?? '';
    input.placeholder = '-';
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

  /** 表底行：行号列底格 "+" 加规则，其余格留空（截图版式） */
  private buildFooterRow(): HTMLElement {
    const t = this.deps.i18n.t.bind(this.deps.i18n);
    const tfoot = document.createElement('tfoot');
    const tr = document.createElement('tr');
    const add = document.createElement('td');
    add.className = 'dmn-table-add-rule';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dmn-row-add';
    btn.textContent = '+';
    btn.title = t('添加规则');
    btn.addEventListener('click', () => this.addRule());
    add.appendChild(btn);
    tr.appendChild(add);
    for (let i = 0; i < this.clauseCount(this.table); i++) {
      const td = document.createElement('td');
      td.className = 'dmn-table-add-pad';
      tr.appendChild(td);
    }
    tfoot.appendChild(tr);
    return tfoot;
  }

  // ---------- 命令流 ----------

  private addRule(beforeIndex?: number): void {
    const table = this.table;
    const rule = this.deps.dmnFactory.create<any>({ $type: 'dmn:DecisionRule' });
    // 行内条目与子句成对（规范 §8.2.14）：建行即按当前子句铺满空条目
    for (const kind of Object.keys(CLAUSE_KINDS) as ClauseKind[]) {
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

  private addClause(kind: ClauseKind): void {
    const meta = CLAUSE_KINDS[kind];
    const table = this.table;
    // 新列 globalIndex=该族尾+1：输入列插在输入族尾（输出族之前），焦点随列
    const familySize = (table[meta.property] ?? []).length;
    const before: Record<ClauseKind, number> = {
      input: 0,
      output: (table[CLAUSE_KINDS.input.property] ?? []).length,
      annotation:
        (table[CLAUSE_KINDS.input.property] ?? []).length +
        (table[CLAUSE_KINDS.output.property] ?? []).length
    };
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
      table,
      property: meta.property,
      entryProperty: meta.entryProperty,
      clause,
      createEntry: () => this.deps.dmnFactory.create<any>({ $type: meta.entryType })
    });
    this.pendingFocusClause = before[kind] + familySize;
  }

  private removeClause(kind: ClauseKind, clause: any): void {
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

  /** 命令后全量重渲的焦点恢复（编辑连续性）：单元格 > 新列列名 > 类型弹选 */
  private restoreFocus(): void {
    if (this.focusCell) {
      const input = this.cellInputAt(this.focusCell.row, this.focusCell.col);
      if (input) {
        input.focus();
        return;
      }
    }
    if (this.pendingFocusClause !== null) {
      const nameInput = this.root.querySelector<HTMLInputElement>(
        `.dmn-clause-name[data-clause="${this.pendingFocusClause}"]`
      );
      this.pendingFocusClause = null;
      if (nameInput) {
        nameInput.focus();
        return;
      }
    }
    if (this.editingTypeCol !== null) {
      const typeSelect = this.root.querySelector<HTMLSelectElement>(
        `.dmn-clause-type-select[data-clause-type="${this.editingTypeCol}"]`
      );
      typeSelect?.focus();
    }
  }

  // ---------- 小件 ----------

  private forEachClause(
    table: any,
    fn: (kind: ClauseKind, clause: any, index: number, globalIndex: number) => void
  ): void {
    let globalIndex = 0;
    for (const kind of Object.keys(CLAUSE_KINDS) as ClauseKind[]) {
      (table[CLAUSE_KINDS[kind].property] ?? []).forEach((clause: any, index: number) => {
        fn(kind, clause, index, globalIndex++);
      });
    }
  }

  private clauseCount(table: any): number {
    return (Object.keys(CLAUSE_KINDS) as ClauseKind[]).reduce(
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
    select.className = 'dmn-clause-type-select';
    select.add(new Option(this.deps.i18n.t('类型'), ''));
    for (const type of TYPE_REFS) {
      select.add(new Option(type, type));
    }
    if (current && !TYPE_REFS.includes(current)) {
      select.add(new Option(current, current));
    }
    select.value = current ?? '';
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  private seamButton(title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dmn-seam-add';
    btn.textContent = '+';
    btn.title = title;
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
