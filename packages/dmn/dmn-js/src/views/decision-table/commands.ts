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
 * 决策表命令桥：加列/删列/加行/删行/单元格/列名/列类型提交——全走
 * DmnModeling（可撤销），命令后由装配层换根重建。
 */
import type { DmnFactory } from '../../factory/DmnFactory';
import type { DmnModeling } from '../../command/DmnModeling';
import type { ColSpec } from './sheet';
import type { EditState } from './editing';

export interface TableCommandsDeps {
  factory: DmnFactory;
  modeling: DmnModeling;
}

export function createTableCommands(deps: TableCommandsDeps, table: any, edit: EditState) {
  const cellText = (cell: any): string => {
    const bo = cell.businessObject;
    if (!bo) return '';
    return bo.get('text') ?? '';
  };

  const commitCell = (cell: any, value: string): void => {
    deps.modeling.updateModdleProperties(cell.businessObject, cell.businessObject, { text: value });
  };

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

  return { cellText, commitCell, addClause, removeClause, addRule, removeRule, commitColName, commitColType };
}

export type TableCommands = ReturnType<typeof createTableCommands>;
