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
 * DI 字段映射器：moddle DI 节点 ↔ 画布元素 的字段级读写单一来源。
 *
 * 读侧 readDiView（导入建图）与写侧 syncShapeDi/syncEdgeDi（命令后回写）
 * 集中同一字段集（bounds/waypoint/dmnElementRef/divider）——新增 DI 属性
 * 只改本文件，两侧同改。DI 节点的生命周期（创建挂 diagram/摘除）不在此
 * （归 DmnUpdater）。
 *
 * DMN 1.3：DMNShape（dmnElementRef+bounds）/ DMNEdge（dmnElementRef+
 * waypoint[]）；DS 分割线=DMNShape.decisionServiceDividerLine（Edge 子类
 * 带 waypoint，DMN 特有的内嵌 DI）；颜色无标准位（缓执行 DMNStyle）。
 */
import type { DmnFactory } from '../factory/DmnFactory';
import { referenceId } from './DmnReader';

/** moddle DI 节点的内部视图（Shape/Edge 统一形态） */
export interface DiView {
  kind: 'shape' | 'edge';
  dmnElementRef: string;
  bounds?: { x: number; y: number; width: number; height: number };
  waypoints?: { x: number; y: number }[];
  /** DS 分割线 y（相对 bounds.y；waypoint[0].y 派生读） */
  dividerY?: number;
  /** 原始 moddle DI 节点（画布元素回挂，几何同步与导出的写回目标） */
  node: any;
}

/** DI 子节点工厂（Bounds/Point 经 dmnFactory 类型化创建，保持"每节点 moddle 实例"语义） */
type DiNodeFactory = Pick<DmnFactory, 'create'>;

/** moddle DI 节点 → 内部视图（Shape/Edge 归一） */
export function readDiView(node: any): DiView | null {
  if (!node) {
    return null;
  }
  const isShape = node.$type === 'dmndi:DMNShape';
  if (!isShape && node.$type !== 'dmndi:DMNEdge') {
    return null;
  }
  const dividerLine = node.decisionServiceDividerLine;
  return {
    kind: isShape ? 'shape' : 'edge',
    dmnElementRef: referenceId(node.dmnElementRef),
    bounds: node.bounds
      ? { x: node.bounds.x, y: node.bounds.y, width: node.bounds.width, height: node.bounds.height }
      : undefined,
    waypoints: (node.waypoint ?? []).map((w: any) => ({ x: w.x, y: w.y })),
    dividerY:
      dividerLine?.waypoint?.[0] !== undefined
        ? dividerLine.waypoint[0].y - (node.bounds?.y ?? 0)
        : undefined,
    node
  };
}

/** 画布形状元素 → DMNShape DI 字段回写（bounds + DS 分割线） */
export function syncShapeDi(di: any, element: any, factory: DiNodeFactory): void {
  if (element.x !== undefined) {
    di.bounds ??= factory.create<any>({ $type: 'dc:Bounds' });
    di.bounds.x = element.x;
    di.bounds.y = element.y;
    di.bounds.width = element.width;
    di.bounds.height = element.height;
  }
  // DS 分割线：element.dividerY 相对值 → dividerLine.waypoint 首点 y（两端 x 取 bounds 左右缘）
  if (element.businessObject?.$type === 'dmn:DecisionService' && element.dividerY !== undefined) {
    di.decisionServiceDividerLine ??= factory.create<any>({ $type: 'dmndi:DMNDecisionServiceDividerLine' });
    if (!Array.isArray(di.decisionServiceDividerLine.waypoint)) {
      di.decisionServiceDividerLine.waypoint = [];
    }
    const left = { $type: 'dc:Point', x: element.x, y: element.y + element.dividerY };
    const right = { $type: 'dc:Point', x: element.x + element.width, y: element.y + element.dividerY };
    const points = [left, right].map((p) => factory.create<any>(p));
    di.decisionServiceDividerLine.waypoint.splice(0, di.decisionServiceDividerLine.waypoint.length, ...points);
  }
}

/** 画布连线元素 → DMNEdge DI 字段回写（航点逐点重建为独立 moddle 实例） */
export function syncEdgeDi(di: any, element: any, factory: DiNodeFactory): void {
  if (Array.isArray(element.waypoints) && Array.isArray(di.waypoint)) {
    const points = element.waypoints.map((p: any) =>
      factory.create<any>({ $type: 'dc:Point', x: p.x, y: p.y })
    );
    di.waypoint.splice(0, di.waypoint.length, ...points);
  }
}
