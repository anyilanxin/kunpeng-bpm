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
 * 更新业务属性命令。
 * execute/revert 返回受影响元素 → 触发 elements.changed 重绘（diagram-js CommandStack 契约）。
 */
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';

export class UpdatePropertiesHandler implements CommandHandler {
  static $inject = ['eventBus', 'dmnIds', 'elementRegistry'];

  constructor(
    private readonly eventBus: any,
    private readonly ids: any,
    private readonly elementRegistry: any
  ) {}

  execute(context: any): any[] {
    const element = context.element;
    const bo = element.businessObject;
    const properties = context.properties;

    context.oldProperties = {};
    for (const key of Object.keys(properties)) {
      context.oldProperties[key] = bo.get?.(key) ?? bo[key];
      bo.set ? bo.set(key, properties[key]) : ((bo[key] = properties[key]));
    }
    // id 改名四同步：bo.set('id') + ids claim/unclaim + elementRegistry.updateId
    // （键/gfx attr/element.id 一体换轨）+ DI dmnElementRef（isReference 自动跟）
    context.renamedFrom =
      typeof context.oldProperties.id === 'string' && properties.id !== context.oldProperties.id
        ? context.oldProperties.id
        : undefined;
    if (context.renamedFrom !== undefined) {
      this.ids.unclaim(context.renamedFrom);
      this.ids.claim(bo.id, bo);
      this.elementRegistry.updateId(element, bo.id);
    }
    this.eventBus.fire('dmn.properties.updated', { element, properties });
    return [element];
  }

  revert(context: any): any[] {
    const element = context.element;
    const bo = element.businessObject;
    for (const key of Object.keys(context.oldProperties)) {
      bo.set ? bo.set(key, context.oldProperties[key]) : ((bo[key] = context.oldProperties[key]));
    }
    if (context.renamedFrom !== undefined) {
      this.ids.unclaim(bo.id);
      this.ids.claim(context.renamedFrom, bo);
      this.elementRegistry.updateId(element, context.renamedFrom);
    }
    return [element];
  }
}

/**
 * 嵌套 moddle 元素属性更新（element.updateModdleProperties）：面板/表达式
 * 编辑器的通用通道——moddleElement 可以是业务对象自身，也可以是其任意后代
 * （decisionLogic、rule、contextEntry 项等）。统一走 moddle 的 set（描述符
 * 语义：数组/引用属性按元模型处理，undefined 自动删键），变更元素整棵返回
 * 触发重绘。撤销按执行前快照逐键回写。
 */
export class UpdateModdlePropertiesHandler implements CommandHandler {
  execute(context: any): any[] {
    const { element, moddleElement, properties } = context;

    context.oldProperties = {};
    for (const key of Object.keys(properties)) {
      context.oldProperties[key] = moddleElement.get(key);
      moddleElement.set(key, properties[key]);
    }
    return [element];
  }

  revert(context: any): any[] {
    const { element, moddleElement, oldProperties } = context;
    for (const key of Object.keys(oldProperties)) {
      moddleElement.set(key, oldProperties[key]);
    }
    return [element];
  }
}

/** 名称编辑（注记写 text，其余写 name） */
export class UpdateLabelHandler implements CommandHandler {
  execute(context: any): any[] {
    const { element, text } = context;
    const bo = element.businessObject;
    const field = bo.$type === 'dmn:TextAnnotation' ? 'text' : 'name';
    context.oldText = bo.get(field);
    bo.set(field, text || undefined);
    return [element];
  }

  revert(context: any): any[] {
    const element = context.element;
    const bo = element.businessObject;
    const field = bo.$type === 'dmn:TextAnnotation' ? 'text' : 'name';
    bo.set(field, context.oldText);
    return [element];
  }
}
