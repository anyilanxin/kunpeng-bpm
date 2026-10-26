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
 * 模型元素工具函数（插件公共 API）：属性面板等插件以统一的语义判型与取
 * 业务对象，不各自触碰内部结构（与 bpmn-js 内核同款契约，DMN 侧导出子集）。
 */

/** 画布元素 → 业务对象；裸 moddle 元素原样返回（面板两种都会传） */
export function getBusinessObject(element: any): any {
  return (element && element.businessObject) || element;
}

/**
 * 类型判定：裸 moddle 元素走 $instanceOf 元模型继承链；画布元素优先业务
 * 对象判定，无业务对象回退 di.type / element.type 字符串。
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

/** 元素显示名（业务对象 name；DMN 名字一律形内渲染，无标签宿主回退链） */
export function getLabel(element: any): string {
  const bo = getBusinessObject(element);
  if (!bo) return '';
  return bo.$type === 'dmn:TextAnnotation' ? (bo.text ?? '') : (bo.name ?? '');
}

/**
 * 低层标签写入（命令处理器内部用：直接改业务对象，不走命令栈、不触发重绘
 * ——可撤销/重绘语义用 modeling.updateLabel）。注记写 text，其余写 name。
 */
export function setLabel(element: any, text: string): any {
  const bo = getBusinessObject(element);
  if (!bo) return element;
  const field = bo.$type === 'dmn:TextAnnotation' ? 'text' : 'name';
  if (text) {
    bo[field] = text;
  } else {
    delete bo[field];
  }
  return element;
}

/**
 * 是否为画布根元素（DMN 无 BPMN 的"平面指向语义根"间接层：画布根直接承载
 * dmn:Definitions 本体，di 挂当前编辑的 dmndi:DMNDiagram 节点——空白点击的
 * 属性面板编辑的是 Definitions 语义）。
 */
export function isPlane(element: any): boolean {
  return element?.di?.$type === 'dmndi:DMNDiagram';
}
