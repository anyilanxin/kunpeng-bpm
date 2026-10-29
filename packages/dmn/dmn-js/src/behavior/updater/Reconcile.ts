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
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * for more details (a copy is included in the licenses/ directory that
 * accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 语义同步器 · DecisionService 成员调和域（DmnUpdater 协作件）：
 * outputDecision/encapsulatedDecision 引用集 ≡ 画布子级决策集
 * （中心 y 对分割线分区：上=输出、下=封装）。引用变更不入命令栈——撤销经
 * 画布父级命令还原后调和收敛；导入不发 elements.changed 故不扰动未编辑文档往返。
 */
import type { DmnFactory } from '../../factory/DmnFactory';
import type { DmnDocumentState } from '../../xml/DocumentState';
import { SIZES } from '../../meta/ElementTypes';
import { referenceId } from '../../xml/DmnReader';

export class DmnServiceReconcile {
  constructor(
    private readonly factory: DmnFactory,
    private readonly state: DmnDocumentState,
    private readonly canvas: any
  ) {}

  /** 全 DS 重算幂等；撤销经画布父级命令还原后由 elements.changed 收敛 */
  reconcile(): void {
    for (const bo of this.state.definitions.drgElement ?? []) {
      if (bo.$type !== 'dmn:DecisionService') {
        continue;
      }
      const shape = boShapeOf(bo, this.canvas);
      if (!shape) {
        continue;
      }
      const divider = shape.y + (shape.dividerY ?? SIZES.SERVICE_DIVIDER_Y);
      const outputs: any[] = [];
      const encapsulated: any[] = [];
      for (const child of shape.children ?? []) {
        if (child.businessObject?.$type !== 'dmn:Decision') {
          continue;
        }
        const centerY = child.y + child.height / 2;
        (centerY < divider ? outputs : encapsulated).push(child.businessObject);
      }
      syncReferenceSet(bo, 'outputDecision', outputs, (t) => this.factory.createReference(t));
      syncReferenceSet(bo, 'encapsulatedDecision', encapsulated, (t) => this.factory.createReference(t));
    }
  }
}

function boShapeOf(bo: any, canvas: any): any | null {
  for (const element of canvas.getRootElement().children ?? []) {
    if (element.businessObject === bo) {
      return element;
    }
  }
  return null;
}

/** 引用集整体重排（按 href 复用既有引用盒，减少序列化噪声；新成员经 createRef 建盒；顺序=画布序） */
function syncReferenceSet(bo: any, property: string, targets: any[], createRef: (target: any) => any): void {
  const refs = targets.map((target) => {
    const existing = (bo.get(property) ?? []).find((r: any) => referenceId(r) === target.id);
    return existing ?? createRef(target);
  });
  bo.set(property, refs);
}
