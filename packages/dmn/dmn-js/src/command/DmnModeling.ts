/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and licenses/ directory that accompany this code.
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
 * DMN 建模门面：diagram-js Modeling 的扩展。
 *
 * 新增命令：properties.update / element.updateModdleProperties / label.update /
 * dmnReplace。connect() 统一做连线类型推断兜底（未显式给 type 时问规则层，
 * 规则返回对象即连线属性——需求矩阵/注记关联唯一裁决）。
 */
import Modeling from 'diagram-js/lib/features/modeling/Modeling';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type ElementFactory from 'diagram-js/lib/core/ElementFactory';
import type CommandStack from 'diagram-js/lib/command/CommandStack';
import type Rules from 'diagram-js/lib/features/rules/Rules';
import { isObject } from 'min-dash';
import type { DmnElementTypes } from '../meta/ElementTypes';
import { UpdatePropertiesHandler, UpdateLabelHandler, UpdateModdlePropertiesHandler } from './UpdateHandlers';
import { DmnReplaceHandler } from './DmnReplaceHandler';

export class DmnModeling extends Modeling {
  static $inject = ['eventBus', 'elementFactory', 'commandStack', 'rules', 'dmnElementTypes'];

  private readonly rules: Rules;
  private readonly stack: CommandStack;
  private readonly elementTypes: DmnElementTypes;

  constructor(
    eventBus: EventBus,
    elementFactory: ElementFactory,
    commandStack: CommandStack,
    rules: Rules,
    elementTypes: DmnElementTypes
  ) {
    super(eventBus, elementFactory, commandStack);
    this.rules = rules;
    this.stack = commandStack;
    this.elementTypes = elementTypes;
    commandStack.registerHandler('properties.update', UpdatePropertiesHandler as any);
    commandStack.registerHandler('element.updateModdleProperties', UpdateModdlePropertiesHandler as any);
    commandStack.registerHandler('label.update', UpdateLabelHandler as any);
    commandStack.registerHandler('dmnReplace', DmnReplaceHandler as any);
  }

  /** 连线：类型缺省时经规则推断（需求矩阵/注记关联） */
  override connect(source: any, target: any, attrs: any = {}, hints?: any): any {
    if (!attrs?.type) {
      const allowed = this.rules.allowed('connection.create', { source, target });
      if (isObject(allowed)) {
        attrs = { ...(attrs as any), ...(allowed as any) };
      }
    }
    return super.connect(source, target, attrs, hints);
  }

  updateProperties(element: any, properties: Record<string, any>): void {
    this.stack.execute('properties.update', { element, properties });
  }

  /** 嵌套 moddle 元素属性更新（面板编辑的通用通道） */
  updateModdleProperties(element: any, moddleElement: any, properties: Record<string, any>): void {
    this.stack.execute('element.updateModdleProperties', { element, moddleElement, properties });
  }

  updateLabel(element: any, text: string): void {
    this.stack.execute('label.update', { element, text });
  }

  replaceElement(element: any, target: { type: string }): any {
    // 前置校验必须在 stack.execute 之前抛出：CommandStack 先 _pushAction 再调
    // handler.execute，execute 内抛错会留下永不弹出的 action 帧，此后所有命令
    // 的 elements.changed（重绘/DI 同步）静默失效（AGENTS 既有契约）
    if (!this.elementTypes.shapeMeta(target.type)) {
      throw new Error(`未知替换目标类型：${target.type}`);
    }
    this.stack.execute('dmnReplace', { element, target });
    return element;
  }
}
