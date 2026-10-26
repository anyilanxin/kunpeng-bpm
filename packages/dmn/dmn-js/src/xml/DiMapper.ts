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
 * DI 字段映射器：dmndi DI 节点 ↔ 画布元素 的字段级读写单一来源。
 * 读侧 readDiView（导入建图）与写侧 syncShapeDi/syncEdgeDi（命令后回写）
 * 集中同一字段集（bounds/waypoint/isCollapsed）——新增 DI 属性只改本文件。
 * DI 节点生命周期（创建挂 diagramElements/摘除）归更新器（P2 DmnUpdater）。
 */
import type { DmnFactory } from '../factory/DmnFactory';

/** moddle DI 节点的内部视图（Shape/Edge 统一形态） */
export interface DiView {
  kind: 'shape' | 'edge';
  /** dmnElementRef 指向的语义元素 id */
  dmnElement: string;
  bounds?: { x: number; y: number; width: number; height: number };
  waypoints?: { x: number; y: number }[];
  isCollapsed?: boolean;
  /** 原始 moddle DI 节点（画布元素回挂，几何同步与导出的写回目标） */
  node: any;
}

/** DI 侧引用（isReference，引擎解析为元素对象；悬空时为 id 字符串）统一取 id */
export function referenceId(ref: unknown): string {
  return typeof ref === 'string' ? ref : String((ref as any)?.id ?? '');
}

/** moddle DI 节点 → 内部视图（DMNShape/DMNEdge 归一；其余 DI 类型返回 null） */
export function readDiView(node: any): DiView | null {
  if (!node) {
    return null;
  }
  const isShape = node.$type === 'dmndi:DMNShape';
  if (!isShape && node.$type !== 'dmndi:DMNEdge') {
    return null;
  }
  return {
    kind: isShape ? 'shape' : 'edge',
    dmnElement: referenceId(node.dmnElementRef),
    bounds: node.bounds
      ? { x: node.bounds.x, y: node.bounds.y, width: node.bounds.width, height: node.bounds.height }
      : undefined,
    waypoints: (node.waypoint ?? []).map((w: any) => ({ x: w.x, y: w.y })),
    isCollapsed: node.isCollapsed,
    node
  };
}

/** 画布形状元素 → DMNShape DI 字段回写（bounds） */
export function syncShapeDi(di: any, element: any, factory: DmnFactory): void {
  if (element.x !== undefined) {
    di.bounds ??= factory.create<any>({ $type: 'dc:Bounds' });
    di.bounds.x = element.x;
    di.bounds.y = element.y;
    di.bounds.width = element.width;
    di.bounds.height = element.height;
  }
}

/** 画布连线元素 → DMNEdge DI 字段回写（waypoint 逐点重建独立 moddle 实例） */
export function syncEdgeDi(di: any, element: any, factory: DmnFactory): void {
  if (Array.isArray(element.waypoints) && Array.isArray(di.waypoint)) {
    const points = element.waypoints.map((p: any) =>
      factory.create<any>({ $type: 'dc:Point', x: p.x, y: p.y })
    );
    di.waypoint.splice(0, di.waypoint.length, ...points);
  }
}
