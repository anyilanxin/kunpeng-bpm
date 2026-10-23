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
 * 类型替换命令（同族 morph）：保持 id/名称/连线，仅改类型、事件定义与尺寸
 * （中心不变）。moddle 元素 $type 为元模型类型标识不可变——替换以目标类型
 * 重建 businessObject（id 保留），全树引用（容器挂接/连线端点/边界宿主/泳道
 * 引用/DI bpmnElement）经 swapReferences 置换；revert 即换回原对象，天然对称。
 * 尺寸变化（中心锚定）后挂连线必须整体重布：旧航点按旧边框锚定，形状变大后
 * 箭头会滞留元素内部、变小则悬空脱开（两侧对称执行/revert 各重布一次）。
 */
import type BaseLayouter from 'diagram-js/lib/layout/BaseLayouter';
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';
import type { BpmnElementTypes, ShapeTypeMeta } from '../meta/ElementTypes';
import type { BpmnFactory } from '../factory/BpmnFactory';
import type { BpmnDocumentState } from '../xml/DocumentState';

export class ReplaceElementHandler implements CommandHandler {
  static $inject = ['bpmnElementTypes', 'bpmnFactory', 'eventBus', 'bpmnDocumentState', 'layouter'];

  constructor(
    private readonly elementTypes: BpmnElementTypes,
    private readonly bpmnFactory: BpmnFactory,
    private readonly eventBus: any,
    private readonly state: BpmnDocumentState,
    private readonly layouter: BaseLayouter
  ) {}

  execute(context: any): any[] {
    const { element, target } = context;
    if (target.collapsed === undefined && target.type === 'bpmn:SubProcess') {
      target.collapsed = false;
    }
    const meta = this.elementTypes.shapeMeta(target.type);
    if (!meta) {
      throw new Error(`未知替换目标类型：${target.type}`);
    }

    const oldBo = element.businessObject;
    const oldWidth = element.width;
    const oldHeight = element.height;
    const cx = element.x + oldWidth / 2;
    const cy = element.y + oldHeight / 2;
    context.oldSize = { width: oldWidth, height: oldHeight, x: element.x, y: element.y, isExpanded: element.isExpanded };
    // 替换前航点快照：revert 原样恢复（可能含用户手动弯点，重布会丢失）
    context.oldWaypoints = this.attached(element).map((connection: any) => ({
      connection,
      waypoints: connection.waypoints.map((p: any) => ({ x: p.x, y: p.y }))
    }));

    // 目标类型重建（id 保留；claim 幂等）
    const newBo = this.bpmnFactory.create<any>({ $type: target.type, id: oldBo.id, name: oldBo.name });

    // 与类型无关的既有关系整体迁移：连线端点引用、数据关联挂接；
    // 容器子元素（flowElements/laneSets）仅容器族承接，边界宿主仅边界事件承接
    // （非目标族属性不迁移，避免引擎把未描述属性收进 $attrs 外漏序列化）
    copyProperty(oldBo, newBo, 'incoming');
    copyProperty(oldBo, newBo, 'outgoing');
    copyProperty(oldBo, newBo, 'dataInputAssociations');
    copyProperty(oldBo, newBo, 'dataOutputAssociations');
    if (meta.isContainer) {
      copyProperty(oldBo, newBo, 'flowElements');
      copyProperty(oldBo, newBo, 'laneSets');
    }
    if (target.type === 'bpmn:BoundaryEvent') {
      copyProperty(oldBo, newBo, 'attachedToRef');
    }

    if (target.type.endsWith('Event')) {
      this.bpmnFactory.applyEventSymbol(newBo, target.eventSymbol);
      // 非中断变体（规范 §10.5）：边界 cancelActivity / 开始 isInterrupting
      if (target.nonInterrupting) {
        if (target.type === 'bpmn:BoundaryEvent') newBo.cancelActivity = false;
        if (target.type === 'bpmn:StartEvent') newBo.isInterrupting = false;
      } else {
        if (target.type === 'bpmn:BoundaryEvent') newBo.cancelActivity = true;
      }
    }
    // 循环特性仅活动类可持有（规范 §10.2.2）：morph 出活动族才迁移
    if (meta.family === 'activity') {
      copyProperty(oldBo, newBo, 'loopCharacteristics');
    }
    // 事件子流程变体（规范 §10.5.4）
    if (target.type === 'bpmn:SubProcess' && target.symbol === 'subProcessEvent') {
      newBo.triggeredByEvent = true;
    }

    // 全树引用置换 + 画布元素回挂
    swapReferences(this.state.definitions, oldBo, newBo);
    element.businessObject = newBo;
    if (element.di) {
      element.di.set('bpmnElement', newBo);
    }

    // 尺寸：中心锚定（折叠子流程=任务盒尺寸）
    const taskMeta = this.elementTypes.shapeMeta('bpmn:Task')!;
    const width = target.collapsed ? taskMeta.width : meta.width;
    const height = target.collapsed ? taskMeta.height : meta.height;
    element.width = width;
    element.height = height;
    element.x = cx - width / 2;
    element.y = cy - height / 2;
    element.type = target.type;
    if (target.type === 'bpmn:SubProcess') {
      element.isExpanded = !target.collapsed;
    }

    context.oldBo = oldBo;
    this.eventBus.fire('bpmn.replace', { element, oldType: oldBo.$type, newType: target.type });
    return this.relayout(element);
  }

  revert(context: any): any[] {
    const { element } = context;
    const oldBo = context.oldBo;
    const newBo = element.businessObject;
    const size = context.oldSize;

    swapReferences(this.state.definitions, newBo, oldBo);
    element.businessObject = oldBo;
    if (element.di) {
      element.di.set('bpmnElement', oldBo);
    }
    element.width = size.width;
    element.height = size.height;
    element.x = size.x;
    element.y = size.y;
    element.type = oldBo.$type;
    if (oldBo.$type === 'bpmn:SubProcess') {
      element.isExpanded = size.isExpanded;
    }
    for (const entry of context.oldWaypoints ?? []) {
      entry.connection.waypoints = entry.waypoints;
    }
    return [element, ...this.attached(element)];
  }

  private attached(element: any): any[] {
    return [...(element.incoming ?? []), ...(element.outgoing ?? [])];
  }

  /** 尺寸变化后整体重布挂线（全量规范锚点路由），返回含连线的变更集 */
  private relayout(element: any): any[] {
    const attached = this.attached(element);
    for (const connection of attached) {
      connection.waypoints = this.layouter.layoutConnection(connection, {
        source: connection.source,
        target: connection.target
      });
    }
    return [element, ...attached];
  }
}

/** 存在才拷贝（避免给新对象挂 undefined 键，序列化侧无差、运行时判空更干净） */
function copyProperty(from: any, to: any, key: string): void {
  if (from[key] !== undefined && from[key] !== null) {
    to[key] = from[key];
  }
}

/**
 * 全树引用置换（from → to）：容器集合内、元素间引用属性（连线端点/边界宿主/
 * 泳道成员/平面目标）与 DI bpmnElement 上出现的旧对象一律替换。id 保持不变，
 * 序列化输出无差；运行时引用一致性由本遍历保证。
 */
function swapReferences(definitions: any, from: any, to: any): void {
  if (!definitions) {
    return;
  }
  const LIST_KEYS = [
    'rootElements', 'diagrams', 'flowElements', 'laneSets', 'lanes', 'participants',
    'messageFlows', 'artifacts', 'incoming', 'outgoing', 'dataInputAssociations',
    'dataOutputAssociations', 'flowNodeRef', 'eventDefinitions', 'planeElement',
    'association', 'artifact', 'conversationLinks'
  ];
  const SINGLE_KEYS = [
    'sourceRef', 'targetRef', 'attachedToRef', 'processRef', 'bpmnElement', 'plane',
    'childLaneSet', 'loopCharacteristics', 'default', 'launcher'
  ];
  const visited = new Set<unknown>();

  const visit = (node: any): void => {
    if (!node || typeof node !== 'object' || visited.has(node)) {
      return;
    }
    visited.add(node);
    for (const key of LIST_KEYS) {
      const list = node[key];
      if (!Array.isArray(list)) {
        continue;
      }
      for (let i = 0; i < list.length; i++) {
        if (list[i] === from) {
          list[i] = to;
        }
      }
    }
    for (const key of SINGLE_KEYS) {
      if (node[key] === from) {
        node[key] = to;
      }
    }
    for (const key of [...LIST_KEYS, ...SINGLE_KEYS]) {
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else {
        visit(value);
      }
    }
  };

  visit(definitions);
}

/** 供菜单构建目标描述（nonInterrupting/symbol 随事件符号与子流程变体传递） */
export function replaceTarget(meta: ShapeTypeMeta): { type: string; eventSymbol?: string; nonInterrupting?: boolean; symbol?: string } {
  const t: { type: string; eventSymbol?: string; nonInterrupting?: boolean; symbol?: string } = { type: meta.type };
  if (meta.eventSymbol) t.eventSymbol = meta.eventSymbol;
  if (meta.nonInterrupting) t.nonInterrupting = true;
  if (meta.symbol) t.symbol = meta.symbol;
  return t;
}
