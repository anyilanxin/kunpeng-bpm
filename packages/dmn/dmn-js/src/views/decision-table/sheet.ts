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
 * 决策表 Sheet 模型派生（DMN 语义树 → table-js 行列结构，纯函数）与
 * 列宽常量、命中策略/内建类型词表、表级几何同步。
 * 版式/交互对齐 kunpeng-modeler 的 dmn-js-decision-table 组件层
 * （2026-10-27 用户裁定「参考 kunpeng-modeler 改」）。
 */

/** 列规格（模型派生的列描述；key 供列宽 WeakMap 弱引用） */
export interface ColSpec {
  key: object;
  colType: 'rownum' | 'input' | 'output' | 'annotation';
  clause: any | null;
  group: string;
  isFamilyTail: boolean;
  family: 'input' | 'output' | 'annotation' | null;
}

/** 列宽记忆（WeakMap 按子句 bo 弱引用：换根重渲后手动调宽不丢） */
export const COL_WIDTHS = new WeakMap<object, number>();
const ROWNUM_COL_KEY: object = { col: 'rownum' };
const EMPTY_INPUT_COL_KEY: object = { col: 'empty-input' };
const EMPTY_OUTPUT_COL_KEY: object = { col: 'empty-output' };
const EMPTY_ANN_COL_KEY: object = { col: 'empty-ann' };
export const MIN_COL_WIDTH = 40;
/** 默认列宽（对齐 kunpeng-modeler：行号 56 / 数据列 192） */
export const INDEX_COL_WIDTH = 56;
export const DEFAULT_COL_WIDTH = 192;

/** 命中策略词表（DMN 1.6 §7.2.4；label/explanation 对齐 kunpeng-modeler） */
export const HIT_POLICIES: Array<{ value: string; label: string; explanation: string }> = [
  { value: 'UNIQUE', label: 'Unique', explanation: '最多命中一条规则（多条命中即报错）' },
  { value: 'FIRST', label: 'First', explanation: '自上而下取首条命中规则' },
  { value: 'PRIORITY', label: 'Priority', explanation: '按输出优先级取最高的一条' },
  { value: 'ANY', label: 'Any', explanation: '任意命中（多条须同输出，否则报错）' },
  { value: 'COLLECT', label: 'Collect', explanation: '收集全部命中输出（可聚合）' },
  { value: 'RULE ORDER', label: 'Rule order', explanation: '按规则声明序返回全部命中' },
  { value: 'OUTPUT ORDER', label: 'Output order', explanation: '按输出优先级序返回全部命中' }
];

/** 内建类型集（DMN 1.6 §10.3.1） */
export const BUILTIN_TYPES = [
  'string', 'boolean', 'number', 'integer', 'long', 'double', 'decimal',
  'date', 'time', 'date and time', 'days and time duration',
  'years and months duration', 'Any'
];

/** 模型 → Sheet 行列结构（行号列 + 输入/输出/注记三族，族空补占位列） */
export function buildSheetModel(table: any): { colSpecs: ColSpec[]; cols: any[]; rows: any[] } {
  const inputs: any[] = table.get('input') ?? [];
  const outputs: any[] = table.get('output') ?? [];
  const annotations: any[] = table.get('annotation') ?? [];
  const rules: any[] = table.get('rule') ?? [];

  const colSpecs: ColSpec[] = [];
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
  return { colSpecs, cols, rows };
}

/** 表级几何同步：.tjs-table 总宽下限=列宽和（表宽 100% 填满容器——列宽经
 *  vdom/默认值下发，富余空间由固定布局分给各列，超限则 min-width 撑开滚动） */
export function syncTableMetrics(container: HTMLElement): void {
  const tableEl = container.querySelector('.tjs-table') as HTMLTableElement | null;
  const row = container.querySelector('.tjs-head-row');
  if (!tableEl || !row) return;
  const sum = Array.from(row.children).reduce((s, c) => s + (c as HTMLElement).offsetWidth, 0);
  tableEl.style.minWidth = `${sum}px`;
}
