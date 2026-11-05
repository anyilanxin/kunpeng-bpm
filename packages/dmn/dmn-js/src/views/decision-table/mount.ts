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
 * 决策表装配层（table-js 底座）：Table 实例（独立注入器，selection +
 * interaction-events 特性）、组件注册（稳定引用）、模型→Sheet 换根重建、
 * 事件接线（双击编辑/命令栈变更/列宽固化）与生命周期。
 * 陷阱契约：命令在 Inferno 事件栈内同步顶层重渲失效——命令后 rebuild 必须
 * rAF 跳栈；rebuild 先清编辑态再换根；组件引用必须稳定（新函数体=Inferno
 * 不同组件类型→整树卸载重建，零抖动前提）。
 */
import { createElement } from 'inferno-create-element';
import Table from 'table-js';
import selectionModule from 'table-js/lib/features/selection';
import interactionEventsModule from 'table-js/lib/features/interaction-events';
import type { DmnFactory } from '../../factory/DmnFactory';
import type { DmnModeling } from '../../command/DmnModeling';
import { buildSheetModel, syncTableMetrics, type ColSpec } from './sheet';
import type { EditState } from './editing';
import { createTableCommands } from './commands';
import { createColumnTools } from './columns';
import { createHeaderTools } from './header';
import { createBodyCell } from './body';
import { createTitleBar } from './titleBar';

export interface TableEditorDeps {
  factory: DmnFactory;
  modeling: DmnModeling;
  /** 图（diagram-js）侧事件总线——命令栈变更监听源（Table 实例自带独立注入器） */
  eventBus: any;
}

export function mountDecisionTable(
  container: HTMLElement,
  table: any,
  deps: TableEditorDeps
): { rebuild: () => void; destroy: () => void } {
  const h = createElement;
  const edit: EditState = { cellId: null, kind: null };
  const decisionBo: any = table.$parent;
  let colSpecs: ColSpec[] = [];

  const instance = new Table({
    container,
    renderer: { container },
    modules: [selectionModule, interactionEventsModule]
  } as any);

  const rerenderTreeLocal = (): void => {
    const root = instance.get('sheet').getRoot();
    instance.get('changeSupport').elementsChanged([root]);
  };

  const cancelEdit = (): void => {
    if (!edit.cellId) return;
    edit.cellId = null;
    edit.kind = null;
    rerenderTreeLocal();
  };

  const commands = createTableCommands(deps, table, edit);
  const columns = createColumnTools(container, () => colSpecs, rerenderTreeLocal);
  const header = createHeaderTools({ table, commands, columns });
  const bodyCell = createBodyCell({ instance, edit, commands, getColSpecs: () => colSpecs, cancelEdit });
  const titleBar = createTitleBar({ table, decisionBo, edit, modeling: deps.modeling, rerender: rerenderTreeLocal, cancelEdit });

  // ---- 模型 → Sheet 换根重建 ----
  const rebuild = (): void => {
    // 先清编辑态再换根：渲染发生在 setRoot（root.added → Renderer）时，
    // 尾部清空会令编辑控件被新树原样重渲（input 残留根因）
    edit.cellId = null;
    edit.kind = null;
    const sheet = instance.get('sheet');
    const built = buildSheetModel(table);
    colSpecs = built.colSpecs;
    sheet.setRoot(null);
    sheet.setRoot({ id: 'dmn-decision-table', rows: [], cols: built.cols });
    built.rows.forEach((row) => sheet.addRow(row));
    // addRow 只发 row.add；TableComponent 仅订阅根级 elementsChanged——建满后手动触发整树重渲
    instance.get('changeSupport').elementsChanged([sheet.getRoot()]);
  };

  // ---- 组件注册（稳定组件引用——getComponent 若每次返回新函数体会被 Inferno
  // 判为不同组件类型而整树卸载重建，th 内联宽/手柄全丢） ----
  const HeadComponent = ({ cols }: any) => h('thead', { class: 'tjs-head' },
    h('tr', { class: 'tjs-head-row' },
      cols.map((col: any, i: number) => header.headerCell(colSpecs[i], col.id)))
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
          onClick: (e: MouseEvent) => { e.preventDefault(); commands.addRule(); }
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
  const components = instance.get('components');
  components.onGetComponent('table.before', () => titleBar.PropertiesBar);
  components.onGetComponent('table.head', () => HeadComponent);
  components.onGetComponent('table.body', () => BodyComponent);
  components.onGetComponent('table.foot', () => FootComponent);
  // 选择变化 → 整树重渲（TableComponent 订阅在根 id 上，选择只发 selection.changed）
  instance.get('eventBus').on('selection.changed', rerenderTreeLocal);

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
      header.closeClauseEditor();
      try {
        instance.destroy();
      } catch {
        /* 容器可能已被视图层拆除 */
      }
      container.textContent = '';
    }
  };
}
