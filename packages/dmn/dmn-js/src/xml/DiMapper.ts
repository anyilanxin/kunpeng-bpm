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
 * DI 字段映射器：moddle DI 节点 ↔ 画布元素 的字段级读写单一来源。
 *
 * 读侧 readDiView（导入建图）与写侧 syncShapeDi/syncEdgeDi/syncLabelBoundsDi
 * （命令后回写）集中同一字段集（bounds/waypoint/isExpanded/isHorizontal/
 * label.bounds/colors）——新增 DI 属性只改本文件，两侧同改。DI 节点的
 * 生命周期（创建挂 plane/摘除）不在此（归 BpmnUpdater）。
 */
import type { BpmnFactory } from '../factory/BpmnFactory';
import { referenceId } from './BpmnReader';
import { isPoolFamily, isSubProcessFamily } from '../meta/ElementTypes';

/** moddle DI 节点的内部视图（Shape/Edge 统一形态） */
export interface DiView {
  kind: 'shape' | 'edge';
  bpmnElement: string;
  bounds?: { x: number; y: number; width: number; height: number };
  waypoints?: { x: number; y: number }[];
  isExpanded?: boolean;
  isHorizontal?: boolean;
  isMarkerVisible?: boolean;
  colors?: { fill?: string; stroke?: string };
  labelBounds?: { x: number; y: number; width: number; height: number } | null;
  /** 原始 moddle DI 节点（画布元素回挂，几何/颜色同步与导出的写回目标） */
  node: any;
}

/** DI 子节点工厂（Bounds/Point/Label 经 bpmnFactory 类型化创建，保持"每节点 moddle 实例"语义） */
type DiNodeFactory = Pick<BpmnFactory, 'create'>;

/** moddle DI 节点 → 内部视图（Shape/Edge 归一；引用属性取局部名键，bioc 扩展并入为 fill/stroke） */
export function readDiView(node: any): DiView | null {
  if (!node) {
    return null;
  }
  const isShape = node.$type === 'bpmndi:BPMNShape';
  if (!isShape && node.$type !== 'bpmndi:BPMNEdge') {
    return null;
  }
  const fill = node.fill;
  const stroke = node.stroke;
  return {
    kind: isShape ? 'shape' : 'edge',
    bpmnElement: referenceId(node.bpmnElement),
    bounds: node.bounds
      ? { x: node.bounds.x, y: node.bounds.y, width: node.bounds.width, height: node.bounds.height }
      : undefined,
    waypoints: (node.waypoint ?? []).map((w: any) => ({ x: w.x, y: w.y })),
    isExpanded: node.isExpanded,
    isHorizontal: node.isHorizontal,
    isMarkerVisible: node.isMarkerVisible,
    colors: fill || stroke ? { fill: fill || undefined, stroke: stroke || undefined } : undefined,
    labelBounds: node.label?.bounds
      ? { x: node.label.bounds.x, y: node.label.bounds.y, width: node.label.bounds.width, height: node.label.bounds.height }
      : null,
    node
  };
}

/** 画布形状元素 → BPMNShape DI 字段回写（bounds/子流程族展开态/池族朝向/颜色） */
export function syncShapeDi(di: any, element: any, factory: DiNodeFactory, isHorizontalModel: boolean): void {
  if (element.x !== undefined) {
    di.bounds ??= factory.create<any>({ $type: 'dc:Bounds' });
    di.bounds.x = element.x;
    di.bounds.y = element.y;
    di.bounds.width = element.width;
    di.bounds.height = element.height;
  }
  if (isSubProcessFamily(element.businessObject?.$type) && element.isExpanded !== undefined) {
    di.isExpanded = element.isExpanded;
  }
  // 池/泳道头带方向：模型朝向是单一事实源，转置命令后经 elements.changed 收敛
  if (isPoolFamily(element.businessObject?.$type)) {
    di.isHorizontal = isHorizontalModel;
  }
  // 颜色（bioc 社区扩展惯例）：未设置字段按描述移除（序列化不输出）
  di.set('fill', element.colors?.fill);
  di.set('stroke', element.colors?.stroke);
}

/** 画布连线元素 → BPMNEdge DI 字段回写（航点逐点重建为独立 moddle 实例；颜色） */
export function syncEdgeDi(di: any, element: any, factory: DiNodeFactory): void {
  if (Array.isArray(element.waypoints) && Array.isArray(di.waypoint)) {
    const points = element.waypoints.map((p: any) =>
      factory.create<any>({ $type: 'dc:Point', x: p.x, y: p.y })
    );
    di.waypoint.splice(0, di.waypoint.length, ...points);
  }
  // 颜色（bioc 社区扩展惯例）：未设置字段按描述移除（序列化不输出）
  di.set('fill', element.colors?.fill);
  di.set('stroke', element.colors?.stroke);
}

/** 标签元素 → 宿主 DI 的 BPMNLabel.bounds 回写（位置一经用户建立即持久化；隐藏态不落位置——派生可复现，写反成噪声） */
export function syncLabelBoundsDi(di: any, label: any, factory: DiNodeFactory): void {
  di.label ??= factory.create<any>({ $type: 'bpmndi:BPMNLabel' });
  di.label.bounds ??= factory.create<any>({ $type: 'dc:Bounds' });
  di.label.bounds.x = label.x;
  di.label.bounds.y = label.y;
  di.label.bounds.width = label.width;
  di.label.bounds.height = label.height;
}
