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
 * 当前文档语义状态（definitions / 主图目标）——Reader/Builder 建立，
 * Writer/命令层消费。单一事实来源：语义树 = 业务对象树；画布 = 视图。
 *
 * DMN 1.3：Definitions.drgElement[]（DRG 形状）/artifact[]（注记/关联）/
 * dmnDI.diagrams[]（无 Plane 中间层，DMNDiagram.diagramElements[] 直挂）。
 */
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnDocument } from '../Types';

export class DmnDocumentState {
  static $inject = ['dmnFactory', 'dmnIds'];

  definitions!: any;
  /** 主图（DRD）DMNDiagram 的平面目标 id（空串=主图无 dmnElementRef 的常态） */
  planeTargetId = '';

  constructor(private readonly dmnFactory: DmnFactory, private readonly ids: any) {}

  /** 新建空文档：主图 DI 骨架（新元素的 DI 节点挂接点），DRG 空集 */
  createEmpty(): void {
    this.resetIds();
    const definitions = this.dmnFactory.createDefinitions('http://anyilanxin.com/schema/dmn');
    definitions.dmnDI?.diagrams.push(this.dmnFactory.createDiagram());
    this.definitions = definitions;
    this.planeTargetId = '';
  }

  adopt(document: DmnDocument): void {
    this.resetIds();
    this.definitions = document.definitions;
    this.planeTargetId = document.planeTargetId;
    this.claimTreeIds(this.definitions, new Set());
  }

  /**
   * 导入树全量登记 id：面板查重（$model.ids.assigned）与新建元素 id 生成
   * （nextPrefixed 不撞导入 id）都依赖注册表持有全文档 id——moddle-xml 解析
   * 不走注册表，需在 adopt 时补登。
   */
  private claimTreeIds(node: any, seen: Set<unknown>): void {
    if (!node || typeof node !== 'object' || seen.has(node)) {
      return;
    }
    if (node.$type) {
      seen.add(node);
      if (typeof node.id === 'string' && node.id) {
        this.ids.claim(node.id, node);
      }
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        value.forEach((item) => this.claimTreeIds(item, seen));
      } else if (value && typeof value === 'object' && (value as any).$type) {
        this.claimTreeIds(value, seen);
      }
    }
  }

  /** 换文档时注册表整体清空（注册表只服务当前文档：生成去重 + 面板查重） */
  private resetIds(): void {
    this.ids.clear();
  }

  /** 主图 DMNDiagram（DI 节点挂接点；空文档/导入文档均保证存在） */
  get diagram(): any | null {
    return this.definitions?.dmnDI?.diagrams?.[0] ?? null;
  }
}
