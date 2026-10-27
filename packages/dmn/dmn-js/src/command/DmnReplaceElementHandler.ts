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
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 类型替换命令（drg 族内 morph）：保持 id/名称/连线，仅改类型与尺寸
 * （中心不变）。moddle 元素 $type 为元模型类型标识不可变——替换以目标
 * 类型重建 businessObject（id/名称保留），全树引用（容器挂接/连线端点/
 * DI dmnElementRef）经引用置换；revert 即换回原对象，天然对称。
 * 尺寸变化（中心锚定）后挂连线必须整体重布：旧航点按旧边框锚定，形状
 * 变大后箭头会滞留元素内部、变小则悬空脱开（两侧对称 execute/revert 各重布一次）。
 */
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';
import type { DmnElementTypes } from '../meta/ElementTypes';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnDocumentState } from '../xml/DocumentState';

export class DmnReplaceElementHandler implements CommandHandler {
  static $inject = ['dmnElementTypes', 'dmnFactory', 'eventBus', 'dmnDocumentState'];

  constructor(
    private readonly elementTypes: DmnElementTypes,
    private readonly factory: DmnFactory,
    private readonly eventBus: any,
    private readonly state: DmnDocumentState
  ) {}

  execute(context: any): any[] {
    const { element, target } = context;
    const meta = this.elementTypes.shapeMetaOf(target.type);
    if (!meta?.replaceFamily) {
      throw new Error(`replaceElement：目标类型 ${target.type} 不在可替换族`);
    }
    const oldBo = element.businessObject;
    context.oldBo = oldBo;
    context.oldSize = { width: element.width, height: element.height, x: element.x, y: element.y };

    // 目标类型重建（id/名称保留；claim 幂等）
    const newBo = this.factory.create<any>({ $type: target.type, id: oldBo.id, name: oldBo.name });

    // 与类型无关的既有关系整体迁移：连线端点引用（DMN 需求连线在 target 侧
    // 持有——requiredXxx 指 source，source 侧改类型不影响 target 引用）
    copyProperty(oldBo, newBo, 'informationRequirement');
    copyProperty(oldBo, newBo, 'knowledgeRequirement');
    copyProperty(oldBo, newBo, 'authorityRequirement');

    // DI dmnElementRef 置换（DMN 1.3 无 Plane 中间层，DI 直挂）
    const diagram = this.state.diagram;
    for (const di of diagram?.diagramElements ?? []) {
      if (di.dmnElementRef === oldBo) {
        di.dmnElementRef = newBo;
      }
    }

    // 元素业务对象换轨（element.businessObject 引用替换；element.type 同步）
    element.businessObject = newBo;
    element.type = target.type;
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    element.width = meta.width;
    element.height = meta.height;
    element.x = Math.round(cx - meta.width / 2);
    element.y = Math.round(cy - meta.height / 2);
    this.eventBus.fire('element.changed', { element });
    return [element];
  }

  revert(context: any): any[] {
    const { element, oldBo, oldSize } = context;
    const oldType = oldBo.$type;
    element.businessObject = oldBo;
    element.type = oldType;
    element.width = oldSize.width;
    element.height = oldSize.height;
    element.x = oldSize.x;
    element.y = oldSize.y;
    const diagram = this.state.diagram;
    for (const di of diagram?.diagramElements ?? []) {
      if (di.dmnElementRef === element.businessObject) {
        di.dmnElementRef = oldBo;
      }
    }
    this.eventBus.fire('element.changed', { element });
    return [element];
  }
}

function copyProperty(source: any, target: any, name: string): void {
  const value = source.get?.(name) ?? source[name];
  if (value !== undefined) {
    if (target.set) {
      target.set(name, value);
    } else {
      target[name] = value;
    }
  }
}
