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
 * BPMN 建模门面：diagram-js Modeling 的扩展。
 *
 * 新增命令：properties.update / label.update / bpmnReplace / lane.add / lane.remove /
 * orientation.set / element.setColor。
 * connect() 统一做连线类型推断兜底（未显式给 type 时问规则层，规则返回对象即连线属性）。
 */
import Modeling from 'diagram-js/lib/features/modeling/Modeling';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type ElementFactory from 'diagram-js/lib/core/ElementFactory';
import type CommandStack from 'diagram-js/lib/command/CommandStack';
import type Rules from 'diagram-js/lib/features/rules/Rules';
import { isObject } from 'min-dash';
import { EventDefinitions } from '../meta/EventDefinitions';
import { UpdatePropertiesHandler, UpdateLabelHandler, UpdateModdlePropertiesHandler } from './UpdateHandlers';
import { ReplaceElementHandler } from './ReplaceElementHandler';
import { AddLaneHandler, RemoveLaneHandler, assertAddLaneAllowed, assertRemoveLaneAllowed } from './LaneHandlers';
import { OrientationHandler } from './OrientationHandler';
import { SetColorHandler, type ElementColors } from './ColorHandler';
import type { ModelOrientation } from '../meta/Orientation';
import type { OrientationService } from '../meta/Orientation';
import { snapPositionToBorder } from '../util/AttachMath';

export class BpmnModeling extends Modeling {
  static $inject = ['eventBus', 'elementFactory', 'commandStack', 'rules', 'orientationService'];

  private readonly rules: Rules;
  private readonly stack: CommandStack;
  private readonly factory: ElementFactory;
  private readonly orientationService: OrientationService;

  constructor(
    eventBus: EventBus,
    elementFactory: ElementFactory,
    commandStack: CommandStack,
    rules: Rules,
    orientationService: OrientationService
  ) {
    super(eventBus, elementFactory, commandStack);
    this.rules = rules;
    this.stack = commandStack;
    this.factory = elementFactory;
    this.orientationService = orientationService;
    commandStack.registerHandler('properties.update', UpdatePropertiesHandler as any);
    commandStack.registerHandler('element.updateModdleProperties', UpdateModdlePropertiesHandler as any);
    commandStack.registerHandler('label.update', UpdateLabelHandler as any);
    commandStack.registerHandler('bpmnReplace', ReplaceElementHandler as any);
    commandStack.registerHandler('lane.add', AddLaneHandler as any);
    commandStack.registerHandler('lane.remove', RemoveLaneHandler as any);
    commandStack.registerHandler('orientation.set', OrientationHandler as any);
    commandStack.registerHandler('element.setColor', SetColorHandler as any);
  }

  /**
   * 拖中间事件到活动上（attach 通道，见 BpmnRules.canAttach）：以边界事件
   * 落下——事件定义符号随迁，空定义为占位双圈（规范 §10.6 边界事件必挂
   * 活动，具体定义经替换菜单定形）。
   */
  override createShape(shape: any, position: any, target: any, parentIndex?: any, hints?: any): any {
    // 参数归位（基类同款约定）：parentIndex 非数字时第 4 参才是 hints——
    // CreateElementsHandler 恰以该形态调用，不归位则 attach 提示丢失
    if (typeof parentIndex !== 'number') {
      hints = parentIndex;
      parentIndex = undefined;
    }
    const type = shape?.businessObject?.$type;
    if (
      hints?.attach &&
      (type === 'bpmn:IntermediateThrowEvent' || type === 'bpmn:IntermediateCatchEvent')
    ) {
      const symbol = EventDefinitions.symbolOf(shape.businessObject);
      shape = this.factory.createShape({
        type: 'bpmn:BoundaryEvent',
        eventSymbol: symbol ?? undefined,
        width: shape.width,
        height: shape.height
      });
      // 圆心对齐宿主最近边线（规范 §10.6 attached to the boundary 的图形语义；
      // 规则层已限落点在边框容差内，此处投影消除容差内偏移）。position 兼容
      // 两种形态：点（中心）与 bounds（CreateElementsHandler 传左上角+尺寸）
      position = snapPositionToBorder(target, position);
    }
    // 保持基类调用形态：归位后 parentIndex 为空时以 4 参调用，否则基类
    // 二次归位会用 undefined 覆盖 hints、attach 提示丢失
    return parentIndex === undefined
      ? super.createShape(shape, position, target, hints)
      : super.createShape(shape, position, target, parentIndex, hints);
  }

  /** 连线：类型缺省时经规则推断（消息/顺序/数据/关联） */
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

  /** 嵌套 moddle 元素属性更新（面板编辑扩展元素/事件定义/条件表达式的通用通道） */
  updateModdleProperties(element: any, moddleElement: any, properties: Record<string, any>): void {
    this.stack.execute('element.updateModdleProperties', { element, moddleElement, properties });
  }

  updateLabel(element: any, text: string): void {
    this.stack.execute('label.update', { element, text });
  }

  replaceElement(element: any, target: { type: string; eventSymbol?: string; collapsed?: boolean }): any {
    this.stack.execute('bpmnReplace', { element, target });
    return element;
  }

  /**
   * 泳道操作（朝向感知，旧 @kunpeng-js 线 API 契约）：
   * - where 'top'|'bottom'|'left'|'right'：插道（'top'/'left'=序列前端，
   *   'bottom'/'right'=后端；水平池行带沿 y 堆叠、垂直池列带沿 x 堆叠）；
   * - where 'divide'：分割目标泳道为 count 段（2|3，总跨度不变）。
   */
  addLane(
    container: any,
    position: 'top' | 'bottom' | 'left' | 'right' | 'divide',
    count?: number
  ): any {
    assertAddLaneAllowed(container, position, count, this.orientationService.isHorizontal());
    this.stack.execute('lane.add', { container, position, count });
    return container;
  }

  removeLane(lane: any): void {
    assertRemoveLaneAllowed(lane);
    this.stack.execute('lane.remove', { lane });
  }

  /** 全模型布局朝向切换（水平 ⇄ 垂直池）：转置几何 + 重布线 + 重锚定，可撤销 */
  setOrientation(orientation: ModelOrientation): void {
    this.stack.execute('orientation.set', { orientation });
  }

  /**
   * 元素填充/描边颜色（bioc:fill / bioc:stroke 扩展惯例，DI 属性往返）。
   * 未传字段保持不变；传 undefined 清除（回落主题缺省）。
   */
  setColor(elements: any | any[], colors: ElementColors): void {
    this.stack.execute('element.setColor', {
      elements: Array.isArray(elements) ? elements : [elements],
      colors
    });
  }
}
