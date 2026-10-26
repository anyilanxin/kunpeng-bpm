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
 * 画布元素工厂：diagram-js ElementFactory 的 DMN 特化。
 *
 * 职责单一：为 shape/connection/root 注入注册表默认尺寸与 businessObject；
 * 不做任何语义联动（那是 DmnUpdater 的事）。DMN 无朝向语义（不感知池道）。
 */
import ElementFactoryBase from 'diagram-js/lib/core/ElementFactory';
import { shapeMetaOf, connectionMetaOf, type ShapeTypeMeta, type ConnectionTypeMeta } from '../meta/ElementTypes';
import type { DmnFactory } from './DmnFactory';

export class DmnElementFactory extends ElementFactoryBase {
  static $inject = ['dmnFactory'];

  constructor(private readonly dmnFactory: DmnFactory) {
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
      // palette 建形缺省（用户定规：create knowledge model 落形即可下钻）：
      // BKM 自带 encapsulatedLogic（Literal 空表达式）——Empty 由 pad 切换
      if (semanticType === 'dmn:BusinessKnowledgeModel') {
        businessObject.set(
          'encapsulatedLogic',
          this.dmnFactory.create<any>({
            $type: 'dmn:FunctionDefinition',
            body: this.dmnFactory.create<any>({ $type: 'dmn:LiteralExpression', text: '' })
          })
        );
      }
    }

    const merged: any = { ...attrs };
    if (businessObject) {
      merged.businessObject = businessObject;
      // 元素 type 与语义对齐：导入路径只给 businessObject，不推导会让
      // element.type 为 undefined（与 palette 创建路径不一致，坑依赖 type 的消费方）
      if (merged.type === undefined) {
        merged.type = businessObject.$type;
      }
      // 元素 id 与语义 id 对齐（DI dmnElementRef、注册表按 id 查找均依赖此约定）
      if (merged.id === undefined) {
        merged.id = businessObject.id;
      }
    }

    if (type === 'shape') {
      const meta = semanticType ? shapeMetaOf(semanticType) : null;
      if (meta) {
        if (merged.width === undefined) merged.width = meta.width;
        if (merged.height === undefined) merged.height = meta.height;
      }
    }

    return super.create(type as any, merged);
  }

  /** 注册表条目直读（palette/pad 构造默认尺寸用） */
  shapeMeta(type: string): ShapeTypeMeta | null {
    return shapeMetaOf(type);
  }

  connectionMeta(type: string): ConnectionTypeMeta | null {
    return connectionMetaOf(type);
  }
}
