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
 * 画布元素工厂：diagram-js ElementFactory 的 DMN 特化。
 * 职责单一：为 shape/connection/root 注入注册表默认尺寸与 businessObject；
 * 语义联动（需求归属/引用维护）归更新器（P2 DmnUpdater）。
 */
import ElementFactoryBase from 'diagram-js/lib/core/ElementFactory';
import type { DmnElementTypes } from '../meta/ElementTypes';
import type { DmnFactory } from './DmnFactory';

export class DmnElementFactory extends ElementFactoryBase {
  static $inject = ['dmnElementTypes', 'dmnFactory'];

  constructor(
    private readonly elementTypes: DmnElementTypes,
    private readonly dmnFactory: DmnFactory
  ) {
    super();
  }

  override create(type: 'shape' | 'connection' | 'root' | 'label', attrs: any = {}): any {
    if (type === 'label') {
      return super.create('label', attrs);
    }

    const semanticType: string | undefined = attrs.businessObject?.$type ?? attrs.type;
    let businessObject = attrs.businessObject;
    if (!businessObject && semanticType && semanticType.startsWith('dmn:')) {
      businessObject = this.dmnFactory.create({
        $type: semanticType,
        ...(attrs.name !== undefined ? { name: attrs.name } : {})
      });
    }

    const merged: any = { ...attrs };
    if (businessObject) {
      merged.businessObject = businessObject;
      // 元素 type/id 与语义对齐（DI dmnElementRef、注册表按 id 查找依赖此约定）
      if (merged.type === undefined) {
        merged.type = businessObject.$type;
      }
      if (merged.id === undefined) {
        merged.id = businessObject.id;
      }
    }

    if (type === 'shape') {
      const size = semanticType ? this.elementTypes.defaultSize(semanticType) : undefined;
      if (size) {
        if (merged.width === undefined) merged.width = size.width;
        if (merged.height === undefined) merged.height = size.height;
      }
    }

    return super.create(type as any, merged);
  }
}
