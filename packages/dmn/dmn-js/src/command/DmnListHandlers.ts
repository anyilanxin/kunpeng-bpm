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
 * version 2 for more details (a copy is included in the licenses/ directory that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 语义集合列表命令（dmn.list.add/remove）：数组属性的可撤销 splice——
 * 决策表 rule、Context entry、List elements、Relation row 等表达式编辑器
 * 全部经此（不直接改数组：绕过命令栈不可撤销）。
 */
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';

export class ListAddHandler implements CommandHandler {
  execute(context: any): any[] {
    const { element, moddleElement, property, item, index } = context;
    const list = moddleElement.get(property) ?? [];
    if (!Array.isArray(list)) {
      throw new Error(`dmn.list.add：属性 ${property} 非数组`);
    }
    const at = index ?? list.length;
    context.removedItems = list.slice(at);
    list.splice(at, 0, item);
    moddleElement.set(property, list);
    return [element];
  }

  revert(context: any): any[] {
    const { element, moddleElement, property, index } = context;
    const list = moddleElement.get(property) ?? [];
    const at = index ?? list.length - 1;
    list.splice(at, list.length - at, ...context.removedItems);
    moddleElement.set(property, list);
    return [element];
  }
}

export class ListRemoveHandler implements CommandHandler {
  execute(context: any): any[] {
    const { element, moddleElement, property, item } = context;
    const list = moddleElement.get(property) ?? [];
    const index = list.indexOf(item);
    if (index < 0) {
      throw new Error('dmn.list.remove：目标不在列表中');
    }
    context.item = item;
    context.index = index;
    list.splice(index, 1);
    moddleElement.set(property, list);
    return [element];
  }

  revert(context: any): any[] {
    const { element, moddleElement, property, item, index } = context;
    const list = moddleElement.get(property) ?? [];
    list.splice(index, 0, item);
    moddleElement.set(property, list);
    return [element];
  }
}

/**
 * 决策表子句命令（dmn.table.clause.add/remove）：子句与行内条目**成对**
 * （规范 §8.2.14）——加/删一列必须同步全体规则的对应条目，单命令保证原子
 * 撤销（拆两条命令撤销中间态=条目与子句错位）。
 */
export class ClauseAddHandler implements CommandHandler {
  execute(context: any): any[] {
    const { element, table, property, entryProperty, clause, createEntry } = context;
    const clauses = table.get(property) ?? [];
    clauses.push(clause);
    table.set(property, clauses);
    // 全规则铺空条目（与子句成对）
    for (const rule of table.get('rule') ?? []) {
      const entries = rule.get(entryProperty) ?? [];
      entries.push(createEntry());
      rule.set(entryProperty, entries);
    }
    return [element];
  }

  revert(context: any): any[] {
    const { element, table, property, entryProperty, index } = context;
    void index;
    const clauses = table.get(property) ?? [];
    clauses.pop();
    table.set(property, clauses);
    for (const rule of table.get('rule') ?? []) {
      const entries = rule.get(entryProperty) ?? [];
      entries.pop();
      rule.set(entryProperty, entries);
    }
    return [element];
  }
}

export class ClauseRemoveHandler implements CommandHandler {
  execute(context: any): any[] {
    const { element, table, property, entryProperty, clause, createEntry } = context;
    const clauses = table.get(property) ?? [];
    const index = clauses.indexOf(clause);
    if (index < 0) {
      throw new Error('dmn.table.clause.remove：目标子句不存在');
    }
    context.clause = clause;
    context.index = index;
    context.removedEntries = (table.get('rule') ?? []).map((rule: any) =>
      (rule.get(entryProperty) ?? [])[index]
    );
    clauses.splice(index, 1);
    table.set(property, clauses);
    for (const rule of table.get('rule') ?? []) {
      const entries = rule.get(entryProperty) ?? [];
      entries.splice(index, 1);
      rule.set(entryProperty, entries);
    }
    void createEntry;
    return [element];
  }

  revert(context: any): any[] {
    const { element, table, property, entryProperty, clause, index, removedEntries } = context;
    const clauses = table.get(property) ?? [];
    clauses.splice(index, 0, clause);
    table.set(property, clauses);
    const rules = table.get('rule') ?? [];
    rules.forEach((rule: any, i: number) => {
      const entries = rule.get(entryProperty) ?? [];
      entries.splice(index, 0, removedEntries[i]);
      rule.set(entryProperty, entries);
    });
    return [element];
  }
}
