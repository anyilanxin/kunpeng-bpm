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
 * DMN 建模门面：diagram-js Modeling 特化——形状/连线几何命令走基座，
 * 语义命令（属性/列表/子句）注册自有 handler。
 */
import Modeling from 'diagram-js/lib/features/modeling/Modeling';
import { UpdatePropertiesHandler, UpdateModdlePropertiesHandler, UpdateLabelHandler } from './DmnUpdateHandlers';
import { ListAddHandler, ListRemoveHandler, ClauseAddHandler, ClauseRemoveHandler } from './DmnListHandlers';

export class DmnModeling extends Modeling {
  static $inject = ['eventBus', 'elementFactory', 'commandStack'];

  /** 基座 Modeling 的命令栈（protected 转自有私有名，命令门面统一出口） */
  private get commandStack(): { execute(id: string, context: any): void } {
    return (this as unknown as { _commandStack: { execute(id: string, context: any): void } })._commandStack;
  }

  constructor(eventBus: any, elementFactory: any, commandStack: any) {
    super(eventBus, elementFactory, commandStack);
    commandStack.registerHandler('properties.update', UpdatePropertiesHandler as any);
    commandStack.registerHandler('element.updateModdleProperties', UpdateModdlePropertiesHandler as any);
    commandStack.registerHandler('label.update', UpdateLabelHandler as any);
    commandStack.registerHandler('dmn.list.add', ListAddHandler as any);
    commandStack.registerHandler('dmn.list.remove', ListRemoveHandler as any);
    commandStack.registerHandler('dmn.table.clause.add', ClauseAddHandler as any);
    commandStack.registerHandler('dmn.table.clause.remove', ClauseRemoveHandler as any);
  }

  updateProperties(element: any, properties: Record<string, any>): void {
    this.commandStack.execute('properties.update', { element, properties });
  }

  updateModdleProperties(element: any, moddleElement: any, properties: Record<string, any>): void {
    this.commandStack.execute('element.updateModdleProperties', { element, moddleElement, properties });
  }

  updateLabel(element: any, text: string): void {
    this.commandStack.execute('label.update', { element, text });
  }

  listAdd(element: any, moddleElement: any, property: string, item: any, index?: number): void {
    this.commandStack.execute('dmn.list.add', { element, moddleElement, property, item, index });
  }

  listRemove(element: any, moddleElement: any, property: string, item: any): void {
    this.commandStack.execute('dmn.list.remove', { element, moddleElement, property, item });
  }

  clauseAdd(
    element: any,
    context: { table: any; property: string; entryProperty: string; clause: any; createEntry: () => any }
  ): void {
    this.commandStack.execute('dmn.table.clause.add', { element, ...context });
  }

  clauseRemove(
    element: any,
    context: { table: any; property: string; entryProperty: string; clause: any; createEntry: () => any }
  ): void {
    this.commandStack.execute('dmn.table.clause.remove', { element, ...context });
  }
}
