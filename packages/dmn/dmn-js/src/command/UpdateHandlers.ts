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
 * 更新业务属性命令。
 * execute/revert 返回受影响元素 → 触发 elements.changed 重绘（diagram-js
 * CommandStack 契约）。属性写入走 moddle 描述符语义（set），撤销按执行前
 * 快照逐键回写。
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

    // 读写一律走 moddle set/get：带命名空间前缀的扩展键（kunpeng:xxx）不落
    // 描述符属性、存取都在 $attrs——直赋普通字段 get() 与序列化都不可见
    context.oldProperties = {};
    for (const key of Object.keys(properties)) {
      context.oldProperties[key] = bo.get(key);
      bo.set(key, properties[key]);
    }
    // id 变更同步注册表（面板查重 assigned(id) 与新建分配 nextPrefixed 都依赖
    // 注册表持有全文档 id）
    context.renamedFrom =
      typeof context.oldProperties.id === 'string' && properties.id !== context.oldProperties.id
        ? context.oldProperties.id
        : undefined;
    if (context.renamedFrom !== undefined) {
      this.ids.unclaim(context.renamedFrom);
      this.ids.claim(bo.get('id'), bo);
      // 画布侧同步（注册表键/gfx data-element-id/element.id 一体换轨；
      // DI dmnElementRef 是对象引用，序列化时自动跟随新 id）
      this.elementRegistry.updateId(element, bo.get('id'));
    }
    this.eventBus.fire('dmn.properties.updated', { element, properties });
    return [element];
  }

  revert(context: any): any[] {
    const element = context.element;
    const bo = element.businessObject;
    for (const key of Object.keys(context.oldProperties)) {
      // set(undefined) 会从 $attrs 删除该键——与 execute 侧空值语义对称
      bo.set(key, context.oldProperties[key]);
    }
    if (context.renamedFrom !== undefined) {
      this.ids.unclaim(bo.get('id'));
      this.ids.claim(context.renamedFrom, bo);
      this.elementRegistry.updateId(element, context.renamedFrom);
    }
    return [element];
  }
}

/**
 * 嵌套 moddle 元素属性更新（element.updateModdleProperties）：面板编辑的
 * 通用通道——moddleElement 可以是业务对象自身，也可以是其任意后代（需求
 * 引用、扩展属性等）。统一走 moddle 的 set（描述符语义），变更元素整棵
 * 返回触发重绘；撤销按执行前快照逐键回写。
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

/** 名称编辑（注记写 text，其余写 name——镜像 DMN 元模型各自字段） */
export class UpdateLabelHandler implements CommandHandler {
  execute(context: any): any[] {
    const { element, text } = context;
    const bo = element.businessObject;
    const field = bo.$type === 'dmn:TextAnnotation' ? 'text' : 'name';
    context.oldText = bo[field];
    if (text) {
      bo[field] = text;
    } else {
      delete bo[field];
    }
    return [element];
  }

  revert(context: any): any[] {
    const element = context.element;
    const bo = element.businessObject;
    const field = bo.$type === 'dmn:TextAnnotation' ? 'text' : 'name';
    // 判 undefined 而非 falsy：旧值为空串时恢复空串
    if (context.oldText !== undefined) {
      bo[field] = context.oldText;
    } else {
      delete bo[field];
    }
    return [element];
  }
}
