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
 * 画布元素工厂：diagram-js ElementFactory 的 BPMN 特化。
 *
 * 职责单一：为 shape/connection/root 注入注册表默认尺寸与 businessObject；
 * 不做任何语义联动（那是 BpmnUpdater 的事）。
 */
import ElementFactoryBase from 'diagram-js/lib/core/ElementFactory';
import type { BpmnElementTypes } from '../meta/ElementTypes';
import type { BpmnFactory } from './BpmnFactory';
import { containerSize } from '../util/PoolGeometry';

export class BpmnElementFactory extends ElementFactoryBase {
  static $inject = ['bpmnElementTypes', 'bpmnFactory', 'orientationService'];

  constructor(
    private readonly elementTypes: BpmnElementTypes,
    private readonly bpmnFactory: BpmnFactory,
    private readonly orientationService: { isHorizontal(): boolean }
  ) {
    super();
  }

  override create(type: 'shape' | 'connection' | 'root' | 'label', attrs: any = {}): any {
    // 标签元素不承载独立语义（外部标签由渲染器按名称绘制）
    if (type === 'label') {
      return super.create('label', attrs);
    }

    const semanticType: string | undefined = attrs.businessObject?.$type ?? attrs.type;

    let businessObject = attrs.businessObject;
    if (!businessObject && semanticType && semanticType.startsWith('bpmn:')) {
      businessObject = this.createBusinessObject(semanticType, attrs);
    }

    const merged: any = { ...attrs };
    if (businessObject) {
      merged.businessObject = businessObject;
      // 元素 type 与语义对齐：导入路径只给 businessObject，不推导会让
      // element.type 为 undefined（与 palette 创建路径不一致，坑依赖 type 的消费方）
      if (merged.type === undefined) {
        merged.type = businessObject.$type;
      }
      // 元素 id 与语义 id 对齐（DI bpmnElement 引用、注册表按 id 查找均依赖此约定）
      if (merged.id === undefined) {
        merged.id = businessObject.id;
      }
    }

    if (type === 'shape') {
      const size = this.defaultSize(semanticType, attrs);
      if (size) {
        // 池按布局朝向取形：垂直布局为瘦高列（头带在顶），水平为扁宽行（头带在左）
        const oriented = this.orientSize(semanticType, size);
        if (merged.width === undefined) merged.width = oriented.width;
        if (merged.height === undefined) merged.height = oriented.height;
      }
    }

    return super.create(type as any, merged);
  }

  private defaultSize(
    semanticType: string | undefined,
    attrs: any
  ): { width: number; height: number } | undefined {
    if (!semanticType) {
      return undefined;
    }
    // 折叠子流程族（SubProcess/AdHocSubProcess）按任务盒尺寸（注册表以展开态登记）
    if (attrs.isExpanded === false && (semanticType === 'bpmn:SubProcess' || semanticType === 'bpmn:AdHocSubProcess')) {
      const task = this.elementTypes.shapeMeta('bpmn:Task')!;
      return { width: task.width, height: task.height };
    }
    return this.elementTypes.defaultSize(semanticType);
  }

  /** 容器类（池）创建尺寸随布局朝向转置，其余类型不感知朝向 */
  private orientSize(
    semanticType: string | undefined,
    size: { width: number; height: number }
  ): { width: number; height: number } {
    if (semanticType !== 'bpmn:Participant') {
      return size;
    }
    return containerSize(size.width, size.height, this.orientationService.isHorizontal());
  }

  /** 按类型与可选事件符号构造语义对象 */
  private createBusinessObject(semanticType: string, attrs: any): any {
    const bo = this.bpmnFactory.create({
      $type: semanticType,
      ...(attrs.name !== undefined ? { name: attrs.name } : {})
    });

    if (attrs.eventSymbol) {
      this.bpmnFactory.applyEventSymbol(bo, attrs.eventSymbol);
    }
    if (semanticType === 'bpmn:BoundaryEvent') {
      // 非中断边界（规范 §10.5.2）：cancelActivity=false
      bo.cancelActivity = attrs.nonInterrupting ? false : (attrs.cancelActivity ?? true);
    }
    if (semanticType === 'bpmn:StartEvent' && attrs.nonInterrupting) {
      // 非中断事件子流程开始（规范 Table 10.86）：isInterrupting=false
      bo.isInterrupting = false;
    }
    if (semanticType === 'bpmn:SubProcess') {
      bo.flowElements = [];
      // 事件子流程（规范 §10.5.4）：triggeredByEvent=true
      if (attrs.symbol === 'subProcessEvent') {
        bo.triggeredByEvent = true;
      }
    }
    if (semanticType === 'bpmn:Transaction' || semanticType === 'bpmn:AdHocSubProcess') {
      bo.flowElements = [];
    }
    if (semanticType === 'bpmn:Participant') {
      bo.processRef = attrs.processRef ?? null;
    }
    return bo;
  }
}
