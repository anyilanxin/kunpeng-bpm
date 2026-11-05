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
 * 模型元素工具函数（插件公共 API）：面板/校验/导出等插件以统一的语义
 * 判型与取业务对象，不各自触碰内部结构。
 */

/**
 * 画布元素 → 业务对象；裸 moddle 元素（面板等插件会直接传业务对象进来）
 * 原样返回——即「有 businessObject 取之，否则视为自身就是业务对象」。
 */
export function getBusinessObject(element: any): any {
  return (element && element.businessObject) || element;
}

/**
 * 类型判定。同时接受画布元素与裸 moddle 元素（面板两种都会传）：
 * - 裸 moddle 元素：$instanceOf 走元模型继承链（SubProcess 判定覆盖其子类型）
 * - 画布元素：优先业务对象元模型判定，无业务对象时回退 di 元素的 type 字符串
 */
export function is(element: any, type: string): boolean {
  if (!element) return false;
  if (typeof element.$instanceOf === 'function') {
    return element.$instanceOf(type);
  }
  const bo = element.businessObject;
  if (bo && typeof bo.$instanceOf === 'function') {
    return bo.$instanceOf(type);
  }
  return element.type === type;
}

/** 任一类型命中即真 */
export function isAny(element: any, types: string[]): boolean {
  return types.some((type) => is(element, type));
}

/**
 * 画布元素 → DI 节点（BPMNShape/BPMNEdge）。对齐上游 bpmn-js 的
 * bpmn-js/lib/util/ModelUtil#getDi：颜色等视图插件按 DI 读写样式属性。
 */
export function getDi(element: any): any {
  return element && element.businessObject && element.businessObject.di;
}

/** 事件子流程（bpmn:SubProcess 的 triggeredByEvent 变体） */
export function isEventSubProcess(element: any): boolean {
  return getBusinessObject(element)?.triggeredByEvent === true;
}

/**
 * 事件是否中断：规范缺省为中断（isInterrupting 不写即 true），
 * 显式 false 才是非中断（虚线环形态）。
 */
export function isInterrupting(element: any): boolean {
  return getBusinessObject(element)?.isInterrupting !== false;
}

/**
 * 子流程是否展开：本组件折叠态信息记在画布元素 isExpanded（BpmnUpdater
 * 同步 di.isExpanded 参与序列化）；缺省视为展开（折叠子流程是显式选择）。
 * 池/泳道本组件不支持折叠态，恒为展开。
 */
export function isExpanded(element: any): boolean {
  if (is(element, 'bpmn:Participant')) return true;
  if (is(element, 'bpmn:SubProcess')) return element?.isExpanded !== false;
  return true;
}

/** 元素显示名（业务对象 name；标签元素回落其宿主元素名） */
export function getLabel(element: any): string {
  const target = element?.labelTarget ?? element;
  return getBusinessObject(target)?.name ?? '';
}

/**
 * 低层标签写入（命令处理器内部用：直接改业务对象，不走命令栈、不触发重绘
 * ——需要可撤销/重绘语义请用 modeling.updateLabel）。注记写 text，其余写 name。
 */
export function setLabel(element: any, text: string): any {
  const bo = getBusinessObject(element);
  if (!bo) return element;
  const field = bo.$type === 'bpmn:TextAnnotation' ? 'text' : 'name';
  if (text) {
    bo[field] = text;
  } else {
    delete bo[field];
  }
  return element;
}

/**
 * 是否为画布根元素（主图平面附着其 di；businessObject 为平面指向的语义根
 * Process/Collaboration——空白点击的属性面板编辑的是它）。
 */
export function isPlane(element: any): boolean {
  return element?.di?.$type === 'bpmndi:BPMNPlane';
}

/** 平面根所承载的语义元素 id（非平面元素返回 undefined） */
export function getShapeIdFromPlane(element: any): string | undefined {
  if (!isPlane(element)) return undefined;
  return getBusinessObject(element)?.id;
}

/**
 * 制品类型三元判定（Group/TextAnnotation/Association）：命令层语义挂接与
 * 父级漂移比对用。注意 Association 是连线（注册表 family='flow'），规则层
 * 的 isArtifactFamily（仅 family='artifact'，不含 Association）与此不同，
 * 勿混用。
 */
export function isArtifactType(type: string | undefined | null): boolean {
  return type === 'bpmn:Group' || type === 'bpmn:TextAnnotation' || type === 'bpmn:Association';
}

/** 纯形状制品二元判定（Group/TextAnnotation，不含连线形态 Association）：建图侧识别制品形状用 */
export function isAnnotationArtifact(type: string | undefined | null): boolean {
  return type === 'bpmn:Group' || type === 'bpmn:TextAnnotation';
}
