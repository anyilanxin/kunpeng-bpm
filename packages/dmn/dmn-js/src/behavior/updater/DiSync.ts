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
 * 语义同步器 · DI 同步域（DmnUpdater 协作件）：画布元素 → DI 回写
 * （bounds/waypoint；syncDi 见 DiMapper）、DI 建/摘、平面图懒建。
 */
import type { DmnFactory } from '../../factory/DmnFactory';
import type { DmnDocumentState } from '../../xml/DocumentState';
import { syncShapeDi, syncEdgeDi } from '../../xml/DiMapper';
import { diagramOfElement } from '../../xml/DmnReader';

/** 列表条目移除（宿主集合/语义树/DI 共用样板） */
export function removeFrom(list: any[] | undefined, item: any): void {
  if (!list) {
    return;
  }
  const index = list.indexOf(item);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

export class DmnDiSync {
  constructor(
    private readonly factory: DmnFactory,
    private readonly state: DmnDocumentState
  ) {}

  /** 画布元素 → DI 回写（bounds/waypoint）；首元素落当前激活平面时懒建图 */
  syncElements(elements: any[]): void {
    for (const element of elements) {
      const bo = element.businessObject;
      if (!bo || bo.$type === 'dmn:Definitions') {
        continue;
      }
      // 已从画布摘除的元素（撤销创建/删除）：相位监听已 detachDi——跳过，
      // 否则 ensureShapeDi/ensureEdgeDi 会把孤儿 DI 重新建回树上
      if (!element.parent) {
        continue;
      }
      if (element.waypoints) {
        if (element.di?.$type === 'dmndi:DMNEdge') {
          syncEdgeDi(element.di, element, this.factory);
        }
        continue;
      }
      if (element.di?.$type !== 'dmndi:DMNShape') {
        this.ensureShapeDi(element);
      }
      if (element.di?.$type === 'dmndi:DMNShape') {
        syncShapeDi(element.di, element, this.factory);
      }
    }
  }

  ensureShapeDi(shape: any): void {
    if (shape.di?.$type === 'dmndi:DMNShape' || !shape.businessObject) {
      return;
    }
    const diagram = this.planeFor(shape);
    if (!diagram) {
      return;
    }
    const di = this.factory.create<any>({
      $type: 'dmndi:DMNShape',
      dmnElementRef: shape.businessObject,
      bounds: this.factory.create<any>({
        $type: 'dc:Bounds',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height
      })
    });
    (diagram.diagramElements ??= []).push(di);
    shape.di = di;
  }

  ensureEdgeDi(connection: any): void {
    if (connection.di?.$type === 'dmndi:DMNEdge' || !connection.businessObject) {
      return;
    }
    const diagram = this.planeFor(connection);
    if (!diagram) {
      return;
    }
    const di = this.factory.create<any>({
      $type: 'dmndi:DMNEdge',
      dmnElementRef: connection.businessObject,
      waypoint: connection.waypoints.map((p: any) =>
        this.factory.create<any>({ $type: 'dc:Point', x: p.x, y: p.y })
      )
    });
    (diagram.diagramElements ??= []).push(di);
    connection.di = di;
  }

  /** 元素所属图：主图根上元素=主图；DS/下钻容器内元素=其根 bo 的专属图 */
  private planeFor(element: any): any | null {
    let root = element.parent;
    while (root && root.type !== 'dmn:Definitions' && !root.id?.endsWith('_plane')) {
      root = root.parent;
    }
    if (!root) {
      return this.state.diagram;
    }
    if (root.type === 'dmn:Definitions') {
      return this.state.diagram;
    }
    // 下钻平面根（{bo.id}_plane）：懒建专属 DMNDiagram（不剪枝：纯浏览不改 XML）
    const hostBo = root.businessObject;
    return (
      diagramOfElement(this.state.definitions, hostBo) ??
      this.createPlaneDiagram(hostBo)
    );
  }

  private createPlaneDiagram(hostBo: any): any {
    const diagram = this.factory.createDiagram({ dmnElementRef: hostBo });
    const dmnDI = (this.state.definitions.dmnDI ??= { $type: 'dmndi:DMNDI', diagrams: [] });
    (dmnDI.diagrams ??= []).push(diagram);
    return diagram;
  }

  detachDi(element: any): void {
    const di = element.di;
    if (!di?.$type) {
      return;
    }
    for (const diagram of this.state.definitions.dmnDI?.diagrams ?? []) {
      removeFrom(diagram.diagramElements, di);
    }
    (element as { di?: unknown }).di = undefined;
  }
}
