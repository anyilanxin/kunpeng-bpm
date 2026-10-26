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
 * 外部标签公共判定与创建参数：命令驱动的生命周期（ExternalLabelBehavior）
 * 与导入建图（DiagramBuilder）两处消费的单一来源。
 *
 * 判定（needsExternalLabel）：连线恒为外部标签；形状按注册表
 * labelMode==='external'（事件/网关/数据/分组）。创建参数（externalLabelAttrs）：
 * id 规则 `${宿主 id}_label`、共享宿主 businessObject、空文本隐藏——几何
 * x/y/width/height 与 labelTarget 绑定由各自消费路径补充（导入按 DI
 * BPMNLabel bounds 或 LabelGeometry 派生、画布直挂；命令路径经
 * modeling.createLabel 绑定）。
 */
import type { BpmnElementTypes } from '../meta/ElementTypes';

/** 是否需要外部标签（连线恒真；形状按注册表 labelMode；标签自身/无语义元素恒假） */
export function needsExternalLabel(element: any, elementTypes: BpmnElementTypes): boolean {
  if (!element || element.labelTarget) {
    return false;
  }
  const bo = element.businessObject;
  if (!bo) {
    return false;
  }
  if (element.waypoints) {
    return true;
  }
  return elementTypes.shapeMeta(bo.$type)?.labelMode === 'external';
}

/** 外部标签创建公共参数（几何 x/y/width/height 由消费方按各自定位来源补充） */
export function externalLabelAttrs(host: any): Record<string, unknown> {
  return {
    id: `${host.id}_label`,
    type: 'label',
    labelMode: 'external',
    businessObject: host.businessObject,
    hidden: !host.businessObject?.name
  };
}
