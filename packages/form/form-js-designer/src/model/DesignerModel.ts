/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/*
 * DesignerModel——设计器状态核心（UI 无关纯 TS）。
 *
 * 命令式不变量（命令保证产出 Schema 恒过结构校验，schema() 不再重复校验）：
 * - id 全文档唯一（含 group children 与 table columns，同池）；
 * - group 仅单层（group 不可落位到 group 内）；画布不接受拖入 table 列位
 *   （列管理走列命令，画布拖字段进表格属缓执行项）；
 * - 列类型限定 8 类标量；字段类型不可改（改类型 = 删除 + 新建）。
 * 组件层以 reactive 包裹本模型实例即可获得响应式；模型自身不持框架依赖。
 */
import type {
  FieldDefinition,
  FormSchema,
  TableColumnDefinition,
  TableField
} from '@kunpeng-io/form-js';
import { columnTemplate, fieldTemplate } from './templates';

/** 落位目标：parentId 缺省 = 根；index 缺省 = 列表尾 */
export interface DropTarget {
  parentId?: string;
  index?: number;
}

interface FieldEntry {
  field: FieldDefinition;
  /** 宿主容器列表（根 fields 或 group children） */
  list: FieldDefinition[];
  parent: FieldDefinition | null;
}

export class DesignerModel {
  // meta 经 constructor → importSchema 赋值（TS 不跨方法追踪，显式断言）
  private meta!: Pick<FormSchema, 'id' | 'name' | 'description'>;
  private fields: FieldDefinition[] = [];

  constructor(initial?: FormSchema) {
    this.importSchema(initial);
  }

  /**
   * 整体载入（导入已有表单 / 重置画布），与构造同语义：meta 归位、树整体替换。
   * JSON 往返而非 structuredClone：宿主常以 reactive/ref 深代理持有 Schema，
   * structuredClone 克隆 Proxy 直接抛 DataCloneError；协议数据约定 JSON 安全，
   * JSON 往返既拷纯净值又免疫代理（模型内部从此与宿主响应式彻底隔离）
   */
  importSchema(initial?: FormSchema): void {
    this.meta = initial
      ? { id: initial.id, name: initial.name, description: initial.description }
      : { id: 'form-1' };
    this.fields = initial ? JSON.parse(JSON.stringify(initial.fields)) : [];
  }

  /** 产出 Schema（深拷贝，外部改动不回写设计态） */
  schema(): FormSchema {
    return {
      schemaVersion: 1,
      id: this.meta.id,
      name: this.meta.name,
      description: this.meta.description,
      fields: structuredClone(this.fields)
    };
  }

  /** 表单根属性（id/name/description）编辑 */
  updateMeta(patch: Partial<Pick<FormSchema, 'id' | 'name' | 'description'>>): void {
    if (patch.id !== undefined && patch.id !== this.meta.id && !patch.id) {
      throw new Error('DesignerModel: 表单 id 不能为空');
    }
    Object.assign(this.meta, patch);
  }

  /** 画布结构树（根 fields 的引用视图，只读消费；变更一律走命令） */
  tree(): readonly FieldDefinition[] {
    return this.fields;
  }

  field(id: string): FieldDefinition {
    const entry = this.findEntry(id);
    if (!entry) {
      throw new Error(`DesignerModel: 未知字段 id「${id}」`);
    }
    return entry.field;
  }

  /** 拖入新字段（palette → 画布/组内），返回新 id */
  addField(type: FieldDefinition['type'], target?: DropTarget): string {
    const list = this.resolveTargetList(type, target?.parentId);
    const template = structuredClone(fieldTemplate(type));
    const index = target?.index ?? list.length;
    list.splice(Math.min(index, list.length), 0, template);
    // 入树后统一赋 id：同批新增（表模板自带列）在 id 池里相互可见，杜绝撞号
    template.id = this.uniqueId(this.idBase(type));
    if (type === 'table') {
      for (const column of (template as TableField).columns) {
        column.id = this.uniqueId('col');
      }
    }
    return template.id;
  }

  /** 画布内移动（同容器排序 / 跨容器迁移；移出组到根传 parentId=undefined） */
  moveField(id: string, target: DropTarget): void {
    const entry = this.findEntry(id);
    if (!entry) {
      throw new Error(`DesignerModel: 未知字段 id「${id}」`);
    }
    const toList = this.resolveTargetList(entry.field.type, target.parentId);
    // 自身或后代不可作为落位容器（杜绝环）
    if (target.parentId && this.isDescendantOrSelf(target.parentId, entry)) {
      throw new Error('DesignerModel: 不能把字段移入自身或其后代');
    }
    const from = entry.list.indexOf(entry.field);
    entry.list.splice(from, 1);
    let index = target.index ?? toList.length;
    if (toList === entry.list && from < index) {
      index -= 1;
    }
    toList.splice(Math.min(index, toList.length), 0, entry.field);
  }

  /** 删除字段（group/table 整树） */
  removeField(id: string): void {
    const entry = this.findEntry(id);
    if (!entry) {
      throw new Error(`DesignerModel: 未知字段 id「${id}」`);
    }
    entry.list.splice(entry.list.indexOf(entry.field), 1);
  }

  /**
   * 属性面板编辑提交（浅合并）：props/rules/conditions/defaultValue/columns 按
   * 「整块提交」语义整体替换；**patch 值为 undefined 的键从字段上删除**（条件/选项
   * 等可选键的移除通道）；id 改名查全池唯一。
   */
  updateField(id: string, patch: Record<string, unknown>): void {
    const entry = this.findEntry(id);
    if (!entry) {
      throw new Error(`DesignerModel: 未知字段 id「${id}」`);
    }
    if (typeof patch.id === 'string' && patch.id !== id) {
      this.assertIdFree(patch.id, id);
    }
    const next = { ...entry.field } as Record<string, unknown>;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
    }
    entry.list[entry.list.indexOf(entry.field)] = next as unknown as FieldDefinition;
  }

  // ---------- table 列命令（画布不接拖入，列经属性面板列清单管理） ----------

  addColumn(tableId: string, type: TableColumnDefinition['type']): string {
    const table = this.tableOf(tableId);
    const column = structuredClone(columnTemplate(type));
    column.id = this.uniqueId('col');
    table.columns.push(column);
    return column.id;
  }

  updateColumn(tableId: string, columnIndex: number, patch: Record<string, unknown>): void {
    const table = this.tableOf(tableId);
    const column = table.columns[columnIndex];
    if (!column) {
      throw new Error(`DesignerModel: 列索引 ${columnIndex} 越界`);
    }
    if (typeof patch.id === 'string' && patch.id !== column.id) {
      this.assertIdFree(patch.id, column.id);
    }
    table.columns[columnIndex] = { ...column, ...patch } as TableColumnDefinition;
  }

  removeColumn(tableId: string, columnIndex: number): void {
    const table = this.tableOf(tableId);
    if (!table.columns[columnIndex]) {
      throw new Error(`DesignerModel: 列索引 ${columnIndex} 越界`);
    }
    table.columns.splice(columnIndex, 1);
  }

  moveColumn(tableId: string, from: number, to: number): void {
    const table = this.tableOf(tableId);
    if (!table.columns[from]) {
      throw new Error(`DesignerModel: 列索引 ${from} 越界`);
    }
    const [column] = table.columns.splice(from, 1);
    table.columns.splice(Math.min(to, table.columns.length), 0, column);
  }

  // ---------- 内部 ----------

  private tableOf(tableId: string): TableField {
    const entry = this.findEntry(tableId);
    if (!entry || entry.field.type !== 'table') {
      throw new Error(`DesignerModel: 字段「${tableId}」不是 table`);
    }
    return entry.field;
  }

  /** 落位容器解析：根（parentId 空）或 group；容器规则在此统一裁定 */
  private resolveTargetList(type: FieldDefinition['type'], parentId?: string): FieldDefinition[] {
    if (!parentId) {
      return this.fields;
    }
    const parent = this.field(parentId);
    if (parent.type === 'table') {
      throw new Error('DesignerModel: 画布不支持拖入表格列位（列经属性面板列清单管理）');
    }
    if (parent.type !== 'group') {
      throw new Error(`DesignerModel: 字段「${parentId}」不是容器`);
    }
    if (type === 'group') {
      throw new Error('DesignerModel: group 仅允许单层嵌套');
    }
    return parent.children;
  }

  private findEntry(id: string): FieldEntry | null {
    const visit = (list: FieldDefinition[], parent: FieldDefinition | null): FieldEntry | null => {
      for (const field of list) {
        if (field.id === id) {
          return { field, list, parent };
        }
        if (field.type === 'group') {
          const found = visit(field.children, field);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    return visit(this.fields, null);
  }

  private isDescendantOrSelf(candidateId: string, entry: FieldEntry): boolean {
    if (entry.field.id === candidateId) {
      return true;
    }
    let cursor = entry.parent;
    while (cursor) {
      if (cursor.id === candidateId) {
        return true;
      }
      const parentEntry = this.findEntry(cursor.id);
      cursor = parentEntry?.parent ?? null;
    }
    return false;
  }

  private idBase(type: FieldDefinition['type']): string {
    return type === 'group' ? 'group' : type === 'table' ? 'table' : 'field';
  }

  /** 全文档 id 池（含列），唯一性/改名查重的统一事实源 */
  private allIds(): Set<string> {
    const ids = new Set<string>();
    const visit = (fields: readonly FieldDefinition[]): void => {
      for (const field of fields) {
        ids.add(field.id);
        if (field.type === 'group') {
          visit(field.children);
        } else if (field.type === 'table') {
          for (const column of field.columns) {
            ids.add(column.id);
          }
        }
      }
    };
    visit(this.fields);
    return ids;
  }

  private uniqueId(base: string): string {
    const ids = this.allIds();
    let n = 1;
    while (ids.has(`${base}-${n}`)) {
      n += 1;
    }
    return `${base}-${n}`;
  }

  private assertIdFree(newId: string, currentId: string): void {
    if (!newId) {
      throw new Error('DesignerModel: 字段 id 不能为空');
    }
    const ids = this.allIds();
    if (ids.has(newId) && newId !== currentId) {
      throw new Error(`DesignerModel: id「${newId}」已被占用`);
    }
  }
}
