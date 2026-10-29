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
  static $inject = ['eventBus', 'bpmnIds'];

  constructor(private readonly eventBus: any, private readonly ids: any) {}

  execute(context: any): any[] {
    const element = context.element;
    const bo = element.businessObject;
    const properties = context.properties;

    context.oldProperties = {};
    for (const key of Object.keys(properties)) {
      context.oldProperties[key] = bo[key];
      bo[key] = properties[key];
    }
    // id 变更同步注册表（面板查重 assigned(id) 与新建分配 nextPrefixed 都依赖
    // 注册表持有全文档 id；根/普通元素改名同经此通道）
    context.renamedFrom =
      typeof context.oldProperties.id === 'string' && properties.id !== context.oldProperties.id
        ? context.oldProperties.id
        : undefined;
    if (context.renamedFrom !== undefined) {
      this.ids.unclaim(context.renamedFrom);
      this.ids.claim(bo.id, bo);
    }
    this.eventBus.fire('bpmn.properties.updated', { element, properties });
    return UpdatePropertiesHandler.affected(context);
  }

  revert(context: any): any[] {
    const element = context.element;
    const bo = element.businessObject;
    for (const key of Object.keys(context.oldProperties)) {
      bo[key] = context.oldProperties[key];
    }
    if (context.renamedFrom !== undefined) {
      this.ids.unclaim(bo.id);
      this.ids.claim(context.renamedFrom, bo);
    }
    return UpdatePropertiesHandler.affected(context);
  }

  /** 变更集：被改元素 + default 引用变更时的全部出线。默认流斜杠画在连线
   gfx 上（判定读源网关 default 属性）——只通知网关则连线不重绘、斜杠
   滞留旧默认线（脏标记范围先例同 SetColorHandler 之外部标签）。 */
  private static affected(context: any): any[] {
    const element = context.element;
    if (!('default' in context.properties)) {
      return [element];
    }
    return [element, ...(element.outgoing ?? [])];
  }
}

/**
 * 连线类型切换命令（flow.switchType，2026-10-29 产品定规）：
 * sequence（普通顺序流）/ conditional（条件流）/ default（默认流）三态。
 * - default 是源元素的单值引用——改指本线即从旧默认线自动摘除（同源互斥
 *   天然成立；旧默认线经本体系切换必然无条件表达式，摘除即回落普通顺序流）；
 * - default 与条件表达式互斥（规范 §10.5.1 语义）：设 default 清条件、
 *   设条件摘 default 引用；
 * - 单帧原子（一帧撤销），revert 按快照对称回写。
 */
export class FlowSwitchTypeHandler implements CommandHandler {
  static $inject = ['bpmnFactory'];

  constructor(private readonly bpmnFactory: any) {}

  execute(context: any): any[] {
    const { element, kind } = context;
    const sourceBo = element.source.businessObject;
    const bo = element.businessObject;
    context.oldDefault = sourceBo.default;
    context.oldCondition = bo.conditionExpression;
    if (kind === 'default') {
      sourceBo.default = bo;
      bo.conditionExpression = undefined;
    } else if (kind === 'conditional') {
      if (sourceBo.default === bo) {
        sourceBo.default = undefined;
      }
      bo.conditionExpression = this.bpmnFactory.create('bpmn:FormalExpression', { body: '' });
    } else {
      if (sourceBo.default === bo) {
        sourceBo.default = undefined;
      }
      bo.conditionExpression = undefined;
    }
    return FlowSwitchTypeHandler.affected(element);
  }

  revert(context: any): any[] {
    const { element } = context;
    element.source.businessObject.default = context.oldDefault;
    element.businessObject.conditionExpression = context.oldCondition;
    return FlowSwitchTypeHandler.affected(element);
  }

  /** 变更集：连线 + 源元素 + 源的全部出线（斜杠/菱形画在连线 gfx、判定读
   源引用——通知范围先例同 UpdatePropertiesHandler.affected；须含源形状，
   实测缺源时菜单切换后连线 mousedown 反查失效——同 UpdatePropertiesHandler
   的 [源, 出线] 集合形态保持一致）。 */
  private static affected(element: any): any[] {
    const source = element.source;
    return [element, source, ...(source.outgoing ?? [])].filter(
      (e: any, i: number, arr: any[]) => arr.indexOf(e) === i
    );
  }
}

/**
 * 嵌套 moddle 元素属性更新（element.updateModdleProperties）：面板编辑
 * 扩展元素/事件定义/条件表达式的通用通道——moddleElement 可以是业务对象
 * 自身，也可以是其任意后代（extensionElements.values 项、eventDefinitions 项
 * 等）。统一走 moddle 的 set（描述符语义：数组/引用属性按元模型处理），
 * 变更元素（画布元素）整棵返回触发重绘。撤销按执行前快照逐键回写。
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
  // 文本落 bo；标签元素的显/隐与尺寸收敛由 ExternalLabelBehavior 在
  // postExecute 钩子维护（execute 原子相内不可派生命令）
  execute(context: any): any[] {
    const { element, text } = context;
    const bo = element.businessObject;
    const field = bo.$type === 'bpmn:TextAnnotation' ? 'text' : 'name';
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
    const field = bo.$type === 'bpmn:TextAnnotation' ? 'text' : 'name';
    // 判 undefined 而非 falsy：旧值为空串时恢复空串（truthy 判定会错走 delete 分支）
    if (context.oldText !== undefined) {
      bo[field] = context.oldText;
    } else {
      delete bo[field];
    }
    return [element];
  }
}
