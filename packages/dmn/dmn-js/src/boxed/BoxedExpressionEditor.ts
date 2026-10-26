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
 * Boxed Expression 编辑器（Context/Invocation/Relation/List/FunctionDefinition
 * 五族 + 字面叶子）：递归网格渲染——每个"值位"按当前节点类型渲染（字面=单行
 * 输入，boxed=嵌套小网格），值位头部类型下拉即"就地类型切换"（新节点整体
 * 替换，撤销可回）。顶栏类型下拉切 decisionLogic 全类（含决策表/字面表达式，
 * DmnViews 检测 kind 变化重挂对应编辑器）。
 *
 * 模型映射（dmn13 描述符）：Context.contextEntry[].{variable,value}；
 * Invocation.{calledFunction, binding[].{parameter,bindingFormula}}；
 * Relation.{column[] InformationItem, row[] List(row.elements[])}；
 * List.elements[]；FunctionDefinition.{formalParameter[], body}。
 * 嵌套决策表暂不在内嵌范围（显式提示，见需求文档登记）。
 */
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnMode } from '../mode/DmnMode';
import type { DmnI18n } from '../i18n/DmnI18n';

/** 顶栏可切换的表达式全类（decisionLogic 级） */
const TOP_LEVEL_TYPES: Array<{ value: string; label: string }> = [
  { value: 'dmn:LiteralExpression', label: '字面表达式' },
  { value: 'dmn:DecisionTable', label: '决策表' },
  { value: 'dmn:Context', label: '上下文' },
  { value: 'dmn:Invocation', label: '调用' },
  { value: 'dmn:Relation', label: '关系' },
  { value: 'dmn:List', label: '列表' },
  { value: 'dmn:FunctionDefinition', label: '函数定义' }
];

/** 值位可切换类型（叶子/boxed 族；决策表切换只在顶栏） */
const VALUE_TYPES = TOP_LEVEL_TYPES.filter((t) => t.value !== 'dmn:DecisionTable');

export interface BoxedExpressionEditorDeps {
  modeling: any;
  eventBus: any;
  elementRegistry: any;
  dmnFactory: DmnFactory;
  dmnMode: DmnMode;
  i18n: DmnI18n;
}

export class BoxedExpressionEditor {
  private readonly root: HTMLElement;
  private destroyed = false;

  constructor(
    container: HTMLElement,
    private readonly decision: any,
    private readonly deps: BoxedExpressionEditorDeps
  ) {
    this.root = document.createElement('div');
    this.root.className = 'dmn-boxed-editor';
    container.appendChild(this.root);
    this.deps.eventBus.on('commandStack.changed', this.rerender);
    this.deps.eventBus.on('mode.changed', this.rerender);
    this.render();
  }

  private readonly rerender = (): void => {
    this.render();
  };

  destroy(): void {
    this.destroyed = true;
    this.deps.eventBus.off('commandStack.changed', this.rerender);
    this.deps.eventBus.off('mode.changed', this.rerender);
    this.root.remove();
  }

  private get editable(): boolean {
    return this.deps.dmnMode.isEditable();
  }

  private get canvasElement(): any {
    return this.deps.elementRegistry.get(this.decision.id);
  }

  private get t(): (s: string) => string {
    return this.deps.i18n.t.bind(this.deps.i18n);
  }

  render(): void {
    if (this.destroyed) {
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'dmn-boxed-wrap';

    // 顶栏：决策名 + decisionLogic 类型切换
    const bar = document.createElement('div');
    bar.className = 'dmn-boxed-bar';
    const name = document.createElement('span');
    name.className = 'dmn-boxed-title';
    name.textContent = this.decision.name || this.decision.id;
    bar.appendChild(name);
    if (this.editable) {
      const select = this.typeSelect(TOP_LEVEL_TYPES, this.decision.decisionLogic?.$type, (value) => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, this.decision, {
          decisionLogic: this.newExpression(value)
        });
      });
      select.classList.add('dmn-boxed-top-type');
      bar.appendChild(select);
    }
    wrap.appendChild(bar);

    wrap.appendChild(this.renderNode(this.decision.decisionLogic, 0));
    this.root.replaceChildren(wrap);
  }

  // ---------- 节点渲染（递归） ----------

  private renderNode(node: any, depth: number): HTMLElement {
    const box = document.createElement('div');
    box.className = 'dmn-boxed-node';
    if (!node) {
      box.appendChild(this.emptyHint(this.t('空表达式')));
      return box;
    }
    switch (node.$type) {
      case 'dmn:LiteralExpression':
      case 'dmn:UnaryTests':
        box.appendChild(this.literalLeaf(node));
        break;
      case 'dmn:Context':
        box.appendChild(this.contextGrid(node, depth));
        break;
      case 'dmn:Invocation':
        box.appendChild(this.invocationGrid(node, depth));
        break;
      case 'dmn:Relation':
        box.appendChild(this.relationGrid(node, depth));
        break;
      case 'dmn:List':
        box.appendChild(this.listGrid(node, depth));
        break;
      case 'dmn:FunctionDefinition':
        box.appendChild(this.functionGrid(node, depth));
        break;
      case 'dmn:DecisionTable':
        box.appendChild(this.emptyHint(this.t('嵌套决策表请在顶层类型切换后编辑（内嵌编辑暂未开放）')));
        break;
      default:
        box.appendChild(this.emptyHint(`${this.t('暂不支持的表达式类型')}: ${node.$type}`));
    }
    return box;
  }

  /** 字面叶子：单行输入（text 元素） */
  private literalLeaf(node: any): HTMLElement {
    const input = document.createElement('input');
    input.className = 'dmn-boxed-literal';
    input.value = node.text ?? '';
    input.placeholder = this.t('字面表达式');
    if (this.editable) {
      input.addEventListener('change', () => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, node, { text: input.value || undefined });
      });
    } else {
      input.disabled = true;
    }
    return input;
  }

  /** Context：变量名 | 值（嵌套）行网格 + 末行 variable-only 条目（规范允许无名条目） */
  private contextGrid(node: any, depth: number): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'dmn-boxed-grid';
    grid.appendChild(this.rowHead(['变量', '值', '']));
    for (const entry of node.contextEntry ?? []) {
      const row = document.createElement('div');
      row.className = 'dmn-boxed-row';
      row.appendChild(this.nameCell(entry.variable, (v) => this.attachItemVariable(entry, 'variable', v)));
      row.appendChild(this.valueCell(entry, 'value', entry.value, depth));
      row.appendChild(this.opCell(() => this.listRemoveNode(node, 'contextEntry', entry), this.t('删除条目')));
      grid.appendChild(row);
    }
    grid.appendChild(this.addRow(`+ ${this.t('条目')}`, () => {
      const entry = this.deps.dmnFactory.create({ $type: 'dmn:ContextEntry' });
      this.deps.modeling.listAdd(this.canvasElement, node, 'contextEntry', entry);
    }));
    return grid;
  }

  /** Invocation：被调函数（字面）+ 参数绑定行（参数名 | 值） */
  private invocationGrid(node: any, depth: number): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'dmn-boxed-grid';
    grid.appendChild(this.rowHead(['被调函数', '', '']));
    const fnRow = document.createElement('div');
    fnRow.className = 'dmn-boxed-row';
    fnRow.appendChild(this.valueCell(node, 'calledFunction', node.calledFunction, depth));
    fnRow.appendChild(this.spanCell(''));
    fnRow.appendChild(this.spanCell(''));
    grid.appendChild(fnRow);
    grid.appendChild(this.rowHead(['参数', '值', '']));
    for (const binding of node.binding ?? []) {
      const row = document.createElement('div');
      row.className = 'dmn-boxed-row';
      row.appendChild(this.nameCell(binding.parameter, (v) => this.attachItemVariable(binding, 'parameter', v)));
      row.appendChild(this.valueCell(binding, 'bindingFormula', binding.bindingFormula, depth));
      row.appendChild(this.opCell(() => this.listRemoveNode(node, 'binding', binding), this.t('删除绑定')));
      grid.appendChild(row);
    }
    grid.appendChild(this.addRow(`+ ${this.t('参数绑定')}`, () => {
      const binding = this.deps.dmnFactory.create({ $type: 'dmn:Binding' });
      this.deps.modeling.listAdd(this.canvasElement, node, 'binding', binding);
    }));
    return grid;
  }

  /** Relation：列头（InformationItem 名+类型可编辑）+ 行单元格（List.elements） */
  private relationGrid(node: any, depth: number): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'dmn-boxed-grid dmn-boxed-relation';
    const head = document.createElement('div');
    head.className = 'dmn-boxed-row dmn-boxed-head';
    for (const column of node.column ?? []) {
      const cell = document.createElement('div');
      cell.className = 'dmn-boxed-cell dmn-boxed-colname';
      const name = document.createElement('input');
      name.className = 'dmn-boxed-input';
      name.value = column.name ?? '';
      name.placeholder = this.t('列名');
      if (this.editable) {
        name.addEventListener('change', () => {
          this.deps.modeling.updateModdleProperties(this.canvasElement, column, { name: name.value || undefined });
        });
      } else {
        name.disabled = true;
      }
      cell.appendChild(name);
      if (this.editable) {
        const del = document.createElement('button');
        del.className = 'dmn-tiny-btn';
        del.textContent = '×';
        del.title = this.t('删除列（含各行对应单元格）');
        del.addEventListener('click', () => this.removeRelationColumn(node, column));
        cell.appendChild(del);
      }
      head.appendChild(cell);
    }
    if (this.editable) {
      head.appendChild(this.addRow(this.t('+ 列'), () => this.addRelationColumn(node)));
    }
    grid.appendChild(head);
    for (const row of node.row ?? []) {
      const rowEl = document.createElement('div');
      rowEl.className = 'dmn-boxed-row';
      const columns = node.column ?? [];
      const cells = row.elements ?? [];
      for (let i = 0; i < columns.length; i++) {
        const cellNode = cells[i] ?? this.deps.dmnFactory.create({ $type: 'dmn:LiteralExpression' });
        // 关系行单元格与列成对：渲染期不回写模型，仅以列数为准展示（增删列命令同步行）
        rowEl.appendChild(this.valueCell(row, `elements[${i}]`, cellNode, depth, i));
      }
      rowEl.appendChild(this.opCell(() => this.listRemoveNode(node, 'row', row), this.t('删除行')));
      grid.appendChild(rowEl);
    }
    if (this.editable) {
      grid.appendChild(this.addRow(`+ ${this.t('行')}`, () => {
        const list = this.deps.dmnFactory.create({ $type: 'dmn:List', elements: [] });
        for (const _column of node.column ?? []) {
          list.elements.push(this.deps.dmnFactory.create({ $type: 'dmn:LiteralExpression' }));
        }
        this.deps.modeling.listAdd(this.canvasElement, node, 'row', list);
      }));
    }
    return grid;
  }

  /** List：单列表达式列表 */
  private listGrid(node: any, depth: number): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'dmn-boxed-grid';
    grid.appendChild(this.rowHead(['元素', '']));
    (node.elements ?? []).forEach((item: any, index: number) => {
      const row = document.createElement('div');
      row.className = 'dmn-boxed-row';
      row.appendChild(this.valueCell(node, `elements[${index}]`, item, depth, index));
      row.appendChild(this.opCell(() => this.listRemoveAt(node, 'elements', index), this.t('删除元素')));
      grid.appendChild(row);
    });
    grid.appendChild(this.addRow(`+ ${this.t('元素')}`, () => {
      const literal = this.deps.dmnFactory.create({ $type: 'dmn:LiteralExpression' });
      this.deps.modeling.listAdd(this.canvasElement, node, 'elements', literal);
    }));
    return grid;
  }

  /** FunctionDefinition：形参（名+类型）+ 函数体 */
  private functionGrid(node: any, depth: number): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'dmn-boxed-grid';
    grid.appendChild(this.rowHead(['形参', '类型', '']));
    for (const param of node.formalParameter ?? []) {
      const row = document.createElement('div');
      row.className = 'dmn-boxed-row';
      const nameCell = document.createElement('div');
      nameCell.className = 'dmn-boxed-cell';
      nameCell.appendChild(this.infoItemInput(param, 'name'));
      row.appendChild(nameCell);
      const typeCell = document.createElement('div');
      typeCell.className = 'dmn-boxed-cell';
      typeCell.appendChild(this.typeRefInput(param));
      row.appendChild(typeCell);
      row.appendChild(this.opCell(() => this.listRemoveNode(node, 'formalParameter', param), this.t('删除形参')));
      grid.appendChild(row);
    }
    grid.appendChild(this.addRow(`+ ${this.t('形参')}`, () => {
      const param = this.deps.dmnFactory.create({ $type: 'dmn:InformationItem' });
      this.deps.modeling.listAdd(this.canvasElement, node, 'formalParameter', param);
    }));
    grid.appendChild(this.rowHead(['函数体', '', '']));
    const bodyRow = document.createElement('div');
    bodyRow.className = 'dmn-boxed-row';
    bodyRow.appendChild(this.valueCell(node, 'body', node.body, depth));
    bodyRow.appendChild(this.spanCell(''));
    bodyRow.appendChild(this.spanCell(''));
    grid.appendChild(bodyRow);
    return grid;
  }

  // ---------- 值位（类型切换 + 叶子/嵌套渲染） ----------

  /**
   * 值位通用件：holder[property] 持有表达式节点（list 走 index 寻址）。
   * 头部类型下拉切换 = 以新类型空节点整体替换（撤销可回）。
   */
  private valueCell(holder: any, property: string, node: any, depth: number, listIndex?: number): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'dmn-boxed-cell dmn-boxed-value';
    const head = document.createElement('div');
    head.className = 'dmn-boxed-value-head';
    if (this.editable && depth < 6) {
      head.appendChild(
        this.typeSelect(VALUE_TYPES, node?.$type ?? '', (value) => {
          this.replaceValue(holder, property, value, listIndex);
        })
      );
    } else if (node) {
      const label = document.createElement('span');
      label.className = 'dmn-boxed-kind';
      label.textContent = this.kindLabel(node.$type);
      head.appendChild(label);
    }
    cell.appendChild(head);
    cell.appendChild(this.renderNode(node, depth + 1));
    return cell;
  }

  /** 值替换：单值属性 set；list 按位替换（splice 新旧） */
  private replaceValue(holder: any, property: string, newType: string, listIndex?: number): void {
    const fresh = this.newExpression(newType);
    if (listIndex === undefined) {
      this.deps.modeling.updateModdleProperties(this.canvasElement, holder, { [property]: fresh });
      return;
    }
    // List.elements 按位替换：模型侧先建齐位（位缺失时补空叶子）再换
    const list = holder[property] ?? (holder[property] = []);
    while (list.length <= listIndex) {
      list.push(this.deps.dmnFactory.create({ $type: 'dmn:LiteralExpression' }));
    }
    list[listIndex] = fresh;
    // 走命令可撤销：以整体数组属性更新（旧数组快照回写对称）
    this.deps.modeling.updateModdleProperties(this.canvasElement, holder, { [property]: list });
  }

  /** 新表达式节点（各类型带合法骨架） */
  private newExpression(type: string): any {
    switch (type) {
      case 'dmn:Context':
        return this.deps.dmnFactory.create({ $type: 'dmn:Context', contextEntry: [] });
      case 'dmn:Invocation':
        return this.deps.dmnFactory.create({ $type: 'dmn:Invocation', binding: [] });
      case 'dmn:Relation':
        return this.deps.dmnFactory.create({ $type: 'dmn:Relation', column: [], row: [] });
      case 'dmn:List':
        return this.deps.dmnFactory.create({ $type: 'dmn:List', elements: [] });
      case 'dmn:FunctionDefinition':
        return this.deps.dmnFactory.create({ $type: 'dmn:FunctionDefinition', formalParameter: [] });
      case 'dmn:DecisionTable':
        return this.deps.dmnFactory.create({ $type: 'dmn:DecisionTable', hitPolicy: 'UNIQUE' });
      default:
        return this.deps.dmnFactory.create({ $type: 'dmn:LiteralExpression' });
    }
  }

  // ---------- 小件 ----------

  private typeSelect(options: Array<{ value: string; label: string }>, current: string | undefined, onChange: (v: string) => void): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'dmn-boxed-select';
    select.add(new Option(this.t('空'), ''));
    for (const opt of options) {
      select.add(new Option(this.t(opt.label), opt.value));
    }
    if (current && !options.some((o) => o.value === current)) {
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

  private kindLabel(type: string): string {
    return TOP_LEVEL_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  private nameCell(item: any, attach: (v: string) => void): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'dmn-boxed-cell';
    cell.appendChild(this.infoItemInput(item, 'name', attach));
    return cell;
  }

  /** InformationItem 名称编辑：item 可能未挂接（首次输入才创建挂到 holder） */
  private infoItemInput(item: any, key: 'name' | 'typeRef', onAttach?: (v: string) => void): HTMLInputElement {
    const input = document.createElement('input');
    input.className = 'dmn-boxed-input';
    input.value = item?.[key] ?? '';
    input.placeholder = key === 'name' ? this.t('名称') : this.t('类型');
    if (this.editable) {
      input.addEventListener('change', () => {
        if (onAttach) {
          onAttach(input.value);
          return;
        }
        this.deps.modeling.updateModdleProperties(this.canvasElement, item, { [key]: input.value || undefined });
      });
    } else {
      input.disabled = true;
    }
    return input;
  }

  private typeRefInput(item: any): HTMLInputElement {
    const input = document.createElement('input');
    input.className = 'dmn-boxed-input';
    input.value = item?.typeRef ?? '';
    input.placeholder = this.t('类型');
    if (this.editable) {
      input.addEventListener('change', () => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, item, { typeRef: input.value || undefined });
      });
    } else {
      input.disabled = true;
    }
    return input;
  }

  /** 条目 variable/parameter 的按需创建挂接（首输入即建 InformationItem） */
  private attachItemVariable(holder: any, property: 'variable' | 'parameter', value: string): void {
    const existing = holder[property];
    if (existing) {
      this.deps.modeling.updateModdleProperties(this.canvasElement, existing, { name: value || undefined });
      return;
    }
    if (!value) {
      return;
    }
    const item = this.deps.dmnFactory.create({ $type: 'dmn:InformationItem', name: value });
    this.deps.modeling.updateModdleProperties(this.canvasElement, holder, { [property]: item });
  }

  private rowHead(labels: string[]): HTMLElement {
    const head = document.createElement('div');
    head.className = 'dmn-boxed-row dmn-boxed-head';
    for (const label of labels) {
      const cell = document.createElement('div');
      cell.className = 'dmn-boxed-cell';
      cell.textContent = this.t(label);
      head.appendChild(cell);
    }
    return head;
  }

  private spanCell(text: string): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'dmn-boxed-cell';
    cell.textContent = text;
    return cell;
  }

  private opCell(onDelete: () => void, title: string): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'dmn-boxed-cell dmn-boxed-op';
    if (this.editable) {
      const btn = document.createElement('button');
      btn.className = 'dmn-tiny-btn';
      btn.textContent = '×';
      btn.title = title;
      btn.addEventListener('click', onDelete);
      cell.appendChild(btn);
    }
    return cell;
  }

  private addRow(label: string, onAdd: () => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'dmn-boxed-row dmn-boxed-add';
    const cell = document.createElement('div');
    cell.className = 'dmn-boxed-cell';
    if (this.editable) {
      const btn = document.createElement('button');
      btn.className = 'dmn-table-btn';
      btn.textContent = this.t(label);
      btn.addEventListener('click', onAdd);
      cell.appendChild(btn);
    }
    row.appendChild(cell);
    return row;
  }

  private listRemoveNode(container: any, property: string, item: any): void {
    this.deps.modeling.listRemove(this.canvasElement, container, property, item);
  }

  private listRemoveAt(container: any, property: string, index: number): void {
    const item = container[property]?.[index];
    if (item) {
      this.deps.modeling.listRemove(this.canvasElement, container, property, item);
    }
  }

  /** 关系列增删须与各行单元格成对（同决策表子句语义）——直接列表命令+行内 splice 组装 */
  private addRelationColumn(node: any): void {
    const column = this.deps.dmnFactory.create({ $type: 'dmn:InformationItem' });
    for (const row of node.row ?? []) {
      (row.elements ?? (row.elements = [])).push(this.deps.dmnFactory.create({ $type: 'dmn:LiteralExpression' }));
    }
    this.deps.modeling.listAdd(this.canvasElement, node, 'column', column);
  }

  private removeRelationColumn(node: any, column: any): void {
    const at = (node.column ?? []).indexOf(column);
    if (at < 0) {
      return;
    }
    for (const row of node.row ?? []) {
      row.elements?.splice(at, 1);
    }
    this.deps.modeling.listRemove(this.canvasElement, node, 'column', column);
  }

  private emptyHint(text: string): HTMLElement {
    const hint = document.createElement('div');
    hint.className = 'dmn-boxed-hint';
    hint.textContent = text;
    return hint;
  }
}
