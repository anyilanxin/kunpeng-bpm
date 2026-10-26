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
 * 决策表子句（列）增删命令：子句与规则行内条目必须成对增删（规范 §8.2.14
 * inputEntry/outputEntry 数量与子句对应），单命令保证撤销原子性。
 * 子句工厂与条目工厂经入参注入（调用方 DmnTableEditor 组装新对象）。
 */
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';

export interface ClauseContext {
  canvasElement: any;
  table: any;
  /** 'input' | 'output' | 'annotation'（表格描述符属性名） */
  property: string;
  clause: any;
  /** 规则上与子句对应的条目属性名（inputEntry/outputEntry/annotationEntry） */
  entryProperty: string;
  /** 为每条规则造行内条目（增列）/收纳被摘条目（删列还原用） */
  createEntry: () => any;
  /** remove 执行期记账（回填位置与被摘条目） */
  index?: number;
  removedEntries?: any[];
}

export class ClauseAddHandler implements CommandHandler {
  execute(context: ClauseContext): any[] {
    const { table, property, clause, entryProperty, createEntry } = context;
    (table[property] ?? (table[property] = [])).push(clause);
    for (const rule of table.rule ?? []) {
      (rule[entryProperty] ?? (rule[entryProperty] = [])).push(createEntry());
    }
    return [];
  }

  revert(context: ClauseContext): any[] {
    const { table, property, clause, entryProperty } = context;
    spliceOut(table[property], clause);
    for (const rule of table.rule ?? []) {
      const entries = rule[entryProperty];
      // 增列时补入的是末位条目；撤销摘末位与执行路径对称
      entries.pop();
    }
    return [];
  }
}

export class ClauseRemoveHandler implements CommandHandler {
  execute(context: ClauseContext): any[] {
    const { table, property, clause, entryProperty } = context;
    const clauses = table[property];
    const at = clauses.indexOf(clause);
    if (at < 0) {
      throw new Error('删列失败：子句不在表中');
    }
    context.index = at;
    context.removedEntries = (table.rule ?? []).map((rule: any) => {
      const entries = rule[entryProperty] ?? [];
      const entry = entries[at];
      spliceOut(entries, entry);
      return entry;
    });
    spliceOut(clauses, clause);
    return [];
  }

  revert(context: ClauseContext): any[] {
    const { table, property, clause, entryProperty, index, removedEntries } = context;
    table[property].splice(index!, 0, clause);
    (table.rule ?? []).forEach((rule: any, i: number) => {
      rule[entryProperty].splice(index!, 0, removedEntries![i]);
    });
    return [];
  }
}

function spliceOut(list: any[], item: any): void {
  const at = list.indexOf(item);
  if (at < 0) {
    throw new Error('列表摘除失败：项不存在（结构已被外部改动）');
  }
  list.splice(at, 1);
}
