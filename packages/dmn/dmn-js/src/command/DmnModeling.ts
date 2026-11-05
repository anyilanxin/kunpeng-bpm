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
import { SetColorHandler, type DmnElementColors } from './SetColorHandler';
import type { DmnFactory } from '../factory/DmnFactory';
import type { BkmExpressionMode } from '../meta/ElementTypes';

export class DmnModeling extends Modeling {
  static $inject = ['eventBus', 'elementFactory', 'commandStack', 'dmnFactory'];

  /** 基座 Modeling 的命令栈（protected 转自有私有名，命令门面统一出口） */
  private get commandStack(): { execute(id: string, context: any): void } {
    return (this as unknown as { _commandStack: { execute(id: string, context: any): void } })._commandStack;
  }

  constructor(eventBus: any, elementFactory: any, commandStack: any, private readonly dmnFactory: DmnFactory) {
    super(eventBus, elementFactory, commandStack);
    commandStack.registerHandler('properties.update', UpdatePropertiesHandler as any);
    commandStack.registerHandler('element.updateModdleProperties', UpdateModdlePropertiesHandler as any);
    commandStack.registerHandler('label.update', UpdateLabelHandler as any);
    commandStack.registerHandler('dmn.list.add', ListAddHandler as any);
    commandStack.registerHandler('dmn.list.remove', ListRemoveHandler as any);
    commandStack.registerHandler('dmn.table.clause.add', ClauseAddHandler as any);
    commandStack.registerHandler('dmn.table.clause.remove', ClauseRemoveHandler as any);
    commandStack.registerHandler('element.setColor', SetColorHandler as any);
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

  /**
   * 元素填充/描边颜色（bioc:fill / bioc:stroke 扩展惯例，DI 属性往返）。
   * 未传字段保持不变；传 undefined 清除（回落主题缺省）。
   */
  setColor(elements: any | any[], colors: DmnElementColors): void {
    this.commandStack.execute('element.setColor', {
      elements: Array.isArray(elements) ? elements : [elements],
      colors
    });
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

  /**
   * BKM 表达式模式切换（用户定规 2026-10-26：Literal expression ⇄ Empty，
   * Empty=无下钻角标）：Literal 建 encapsulatedLogic（FunctionDefinition 包
   * LiteralExpression 空文本——DMN 1.3 引用盒之外的本地子树，无 id 引用），
   * Empty 置 undefined（moddle set 语义=删键）。经 updateModdleProperties
   * 命令入栈（撤销/重做对称，elements.changed 令角标重算）。
   */
  switchBkmExpression(element: any, mode: BkmExpressionMode): void {
    const bo = element.businessObject;
    const value =
      mode === 'literal'
        ? this.dmnFactory.create<any>({
            $type: 'dmn:FunctionDefinition',
            body: this.dmnFactory.create<any>({ $type: 'dmn:LiteralExpression', text: '' })
          })
        : undefined;
    this.commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: bo,
      properties: { encapsulatedLogic: value }
    });
  }

  /**
   * Decision 表达式模式切换（用户定规 2026-10-27：Decision table / Literal
   * expression / Empty 三态，Empty=无下钻角标）：决策表/字面建 decisionLogic
   * 对应形态，Empty 置 undefined（moddle set 语义=删键）。经
   * updateModdleProperties 命令入栈（撤销/重做对称，elements.changed 令角标重算）。
   */
  switchDecisionExpression(element: any, mode: 'table' | 'literal' | 'empty'): void {
    const bo = element.businessObject;
    const value =
      mode === 'table'
        ? this.dmnFactory.create<any>({ $type: 'dmn:DecisionTable', hitPolicy: 'UNIQUE' })
        : mode === 'literal'
          ? this.dmnFactory.create<any>({ $type: 'dmn:LiteralExpression', text: '' })
          : undefined;
    this.commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: bo,
      properties: { decisionLogic: value }
    });
  }
}
