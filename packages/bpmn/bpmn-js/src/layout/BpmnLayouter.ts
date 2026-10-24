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
 * 正交布线器（顺序流/数据关联走直角折线；消息流/关联走直线）。
 *
 * 两段式规划（业界 Manhattan 启发式布线的标准架构）：先定锚、后布线。
 *
 * ① 锚点选取（最近原则）：折线类型端点取"朝向对端中心最近"的 bbox
 * 四边中点——事件=圆的方位点、任务族=边的 midpoint、网关=菱形顶点
 * （顶点恰在边中点上，即网关可吸附的四个角）。多源扇入同一目标时，
 * 各源按距离自然分散到不同角：对齐源横向入 W/N、深下源入 S、深上源
 * 入 N——入口角的纵向序与源的纵向序一致，扇入天然不交叉；同列源的
 * Z 形肘共用同一间隙列（E 缘对齐时中点相同），汇流平行有序。
 * 直线类型（消息流/关联）例外：沿中心连线裁剪到元素边界（见
 * boundaryAlong）。手动拖点走 connection.updateWaypoints，不经此布线器。
 *
 * ② 正交布线（横平竖直，任何分支不出斜段）：弯点严格沿锚轴布置——
 * 同轴（水平↔水平 / 垂直↔垂直）出两元素间隙中点的 Z 形肘，近对齐
 * （差值小于容差）收成贴轴直段；异轴（水平↔垂直）出两段 L 形，转角
 * 点同时落在两锚轴线上。网关作源的扇出是特例：追加链沿交叉轴单向
 * 堆叠（见 AutoPlacementBehavior），改由交叉轴顶点出 L 让分支散开。
 *
 * 移动/缩放路径（diagram-js 各 Handler 带 connectionStart/End hints 调入）：
 * 只重锚移动侧（仍取最近规范锚，与创建路径同准则），对侧锚点与既有
 * 弯点原样保留——复用基座 repairConnection 的修复语义，避免无关侧锚点
 * 跳动、手动弯点丢失；修复不适用（如两点直线）时其内部退回全量重排。
 */
import BaseLayouter from 'diagram-js/lib/layout/BaseLayouter';
import type { LayoutConnectionHints } from 'diagram-js/lib/layout/BaseLayouter';
import { repairConnection } from 'diagram-js/lib/layout/ManhattanLayout';

const STRAIGHT_TYPES = new Set(['bpmn:MessageFlow', 'bpmn:Association']);
/** 肘形判定容差：|dy| < 8 视为水平对齐（自有取值） */
const ALIGN_TOLERANCE = 8;

/** 规范锚引用：锚点坐标 + 出线轴向（E/W 水平、S/N 垂直），布线按轴走肘 */
type Anchor = { point: { x: number; y: number }; axis: 'h' | 'v' };

import type { OrientationService } from '../meta/Orientation';
import { isEventFamily, isGatewayFamily } from '../meta/ElementTypes';

export class BpmnLayouter extends BaseLayouter {
  static $inject = ['orientationService'];

  private readonly orientationService: OrientationService;

  constructor(orientationService: OrientationService) {
    super();
    this.orientationService = orientationService;
  }

  override layoutConnection(connection: any, hints?: LayoutConnectionHints): any[] {
    const source = hints?.source ?? connection.source;
    const target = hints?.target ?? connection.target;
    const type = connection.businessObject?.$type ?? connection.type;

    // 规划①最近规范锚：多源扇入同一目标时各源按距离分散落角（网关四
    // 顶点即可吸附的四角），入口秩序与源序一致
    const startAnchor = anchorOf(source, center(target));
    const endAnchor = anchorOf(target, center(source));
    const start = startAnchor.point;
    const end = endAnchor.point;

    if (STRAIGHT_TYPES.has(type)) {
      // 直线类型锚点见 boundaryAlong：沿中心连线裁剪到元素边界，而非中点锚
      return [boundaryAlong(source, center(target)), boundaryAlong(target, center(source))];
    }

    if (hints?.connectionStart || hints?.connectionEnd) {
      const repaired = repairConnection(asRect(source), asRect(target), start, end, connection.waypoints, {
        connectionStart: !!hints.connectionStart,
        connectionEnd: !!hints.connectionEnd
      });
      return reSnapMovedAnchors(repaired, source, target, !!hints.connectionStart, !!hints.connectionEnd);
    }

    // 规划②按锚轴正交布线（同轴 Z 肘 / 异轴 L）
    return this.routeOrthogonal(startAnchor, endAnchor, source, target);
  }

  private routeOrthogonal(
    startAnchor: Anchor,
    endAnchor: Anchor,
    source: any,
    target: any
  ): any[] {
    const s = asRect(source);
    const t = asRect(target);
    const horizontal = this.orientationService.isHorizontal();

    // 网关扇出（自有策略）：目标中心沉到源底之下（水平模型）/越过源右缘
    // （垂直模型）时，改由交叉轴顶点出两段 L（下行/横行后转入边）——网关
    // 是分叉节点，追加链沿交叉轴单向堆叠（见 AutoPlacementBehavior），L 形
    // 让每条分支的主干清晰散开；水平肘 Z 形会在网关右侧把多分支挤成一束。
    // 末端锚固定取面向源的一侧中点（W/N）：L 末段是水平/垂直入线，锚与
    // 入线轴必须一致
    const isGateway = isGatewayFamily(source.businessObject?.$type);
    if (isGateway) {
      if (horizontal) {
        const west = { x: t.x, y: t.y + t.height / 2 };
        if (west.y >= s.y + s.height) {
          const south = { x: s.x + s.width / 2, y: s.y + s.height };
          return [south, { x: south.x, y: west.y }, west];
        }
      } else {
        const north = { x: t.x + t.width / 2, y: t.y };
        if (north.x >= s.x + s.width) {
          const east = { x: s.x + s.width, y: s.y + s.height / 2 };
          return [east, { x: north.x, y: east.y }, north];
        }
      }
    }

    const { point: start, axis: startAxis } = startAnchor;
    const { point: end, axis: endAxis } = endAnchor;

    // 同轴（水平↔水平 / 垂直↔垂直）：Z 形肘，中转列/行取两 bbox 间隙
    // 中点（朝向端计算，源 E 缘对齐的扇入共用同一列，汇流平行）；
    // 近对齐（差值小于容差）收成贴轴直段——端点钉在锚轴上，不出斜段
    if (startAxis === endAxis) {
      if (startAxis === 'h') {
        if (Math.abs(end.y - start.y) < ALIGN_TOLERANCE) {
          return [start, { x: end.x, y: start.y }];
        }
        const midX = end.x > start.x
          ? s.x + s.width + Math.max((t.x - s.x - s.width) / 2, 1)
          : t.x + t.width + Math.max((s.x - t.x - t.width) / 2, 1);
        return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
      }
      if (Math.abs(end.x - start.x) < ALIGN_TOLERANCE) {
        return [start, { x: start.x, y: end.y }];
      }
      const midY = end.y > start.y
        ? s.y + s.height + Math.max((t.y - s.y - s.height) / 2, 1)
        : t.y + t.height + Math.max((s.y - t.y - t.height) / 2, 1);
      return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
    }

    // 异轴（水平出↔垂直入，或反之）：两段 L，转角点同时落在两锚轴线上。
    // 最近锚下异轴只出现在斜对位（横向错开且纵向错开），源的锚侧已背向
    // 目标，转角天然落在两元素轮廓之外——不穿形、不斜走
    return startAxis === 'h'
      ? [start, { x: end.x, y: start.y }, end]
      : [start, { x: start.x, y: end.y }, end];
  }
}

function center(element: any): { x: number; y: number } {
  if (element.waypoints) {
    const wps = element.waypoints;
    const first = wps[0];
    const last = wps[wps.length - 1];
    return { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
  }
  return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
}

/**
 * 直线类型锚点（消息流/关联）：沿"本元素中心 → 对端中心"连线方向裁剪到
 * 元素边界——事件=圆周交点（半径 w/2）、网关=菱形边交点（L1 等比）、其余
 * =bbox 边交点。折线类型用四边中点规范锚（正交出入线天然贴边），但直线
 * 类型若取中点锚，斜向连线会从横向边中点出线再斜插目标角落——起点悬在
 * 源轮廓侧向、终点挂在目标角上，视觉断裂；边界裁剪让斜线两端都落在元素
 * 轮廓上且贴中心轴（斜向直线的通行做法）。中心重叠（完全同心的退化
 * 拖放）取 N 锚保持确定性。
 */
function boundaryAlong(element: any, toward: { x: number; y: number }): { x: number; y: number } {
  const { x, y, width: w, height: h } = asRect(element);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (!dx && !dy) {
    return { x: cx, y };
  }
  const type = element.businessObject?.$type;
  if (isEventFamily(type)) {
    const len = Math.hypot(dx, dy);
    return { x: cx + (dx / len) * (w / 2), y: cy + (dy / len) * (h / 2) };
  }
  if (isGatewayFamily(type)) {
    const l1 = Math.abs(dx) / (w / 2) + Math.abs(dy) / (h / 2);
    return { x: cx + dx / l1, y: cy + dy / l1 };
  }
  const t = Math.min(dx ? w / 2 / Math.abs(dx) : Infinity, dy ? h / 2 / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t };
}

/**
 * 规范锚点（规划①：最近原则）：bbox 四边中点（E/W/S/N），朝向对端
 * 中心取距离最近者。事件（圆内切 bbox）= 圆的四个方位点；任务族 = 各边
 * 中点；网关（菱形顶点即 bbox 边中点）= 四个顶点，也就是网关可吸附的
 * 四个角。axis 标记锚的出线轴向（E/W 水平、S/N 垂直），供相邻弯点对轴。
 */
function anchorOf(element: any, toward: { x: number; y: number }): Anchor {
  const { x, y, width: w, height: h } = asRect(element);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const candidates: { point: { x: number; y: number }; axis: 'h' | 'v' }[] = [
    { point: { x: x + w, y: cy }, axis: 'h' }, // E
    { point: { x, y: cy }, axis: 'h' },        // W
    { point: { x: cx, y: y + h }, axis: 'v' }, // S
    { point: { x: cx, y }, axis: 'v' }         // N
  ];
  let best = candidates[0];
  let bestD = Infinity;
  for (const c of candidates) {
    const d = (c.point.x - toward.x) ** 2 + (c.point.y - toward.y) ** 2;
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

/**
 * 基座修复的收尾：把移动侧端点从其 bbox 矩形投影 docking 夹回规范锚——
 * 投影对菱形（网关）会悬在形外、对矩形会偏离边线中点；中段弯点与对侧
 * 端点保留基座修复结果（未移动侧原样、手动弯点不丢）。相邻弯点对齐到
 * 锚轴（见 snapEndpoint：优先平移、平移会斜断内侧段时插入转角点），
 * 消除投影端点遗留的斜段；仅两点连线（直线）没有可动弯点，直接换端点
 * ——轴向对齐场景换后仍是直线。
 */
function reSnapMovedAnchors(
  waypoints: { x: number; y: number }[],
  source: any,
  target: any,
  startMoved: boolean,
  endMoved: boolean
): { x: number; y: number }[] {
  const out = waypoints.map((p) => ({ x: p.x, y: p.y }));
  if (startMoved) {
    snapEndpoint(out, source, target, 0);
  }
  if (endMoved) {
    snapEndpoint(out, target, source, out.length - 1);
  }
  return out;
}

function snapEndpoint(
  waypoints: { x: number; y: number }[],
  element: any,
  other: any,
  index: number
): void {
  // 移动侧重锚取最近规范锚（与创建路径同准则）：移动任一端后入口侧仍按
  // 距离落角，扇入秩序在移动后保持
  const { point, axis } = anchorOf(element, center(other));
  waypoints[index] = { x: point.x, y: point.y };
  if (waypoints.length <= 2) {
    return;
  }
  const startSide = index === 0;
  const j = startSide ? 1 : waypoints.length - 2;
  const onAxis = axis === 'h' ? waypoints[j].y === point.y : waypoints[j].x === point.x;
  if (onAxis) {
    return;
  }
  // 转角点：落在锚轴与既有弯点轴线交点——端侧段贴锚轴、内侧段保原位
  const corner = axis === 'h'
    ? { x: waypoints[j].x, y: point.y }
    : { x: point.x, y: waypoints[j].y };
  if (corner.x === point.x && corner.y === point.y) {
    // 弯点在锚点法向正上/正下：入线垂直/水平本身正交，无需处理
    return;
  }
  // 平移弯点到锚轴可保端段贴轴；但锚点换角（如 S 角换 W 角）时基座修复
  // 的对角折返会被平移斜断更内侧的段——此时改为在端点前插入转角点，
  // 内外段全部保持正交
  const far = waypoints[startSide ? 2 : j - 1];
  if (far.x === corner.x || far.y === corner.y) {
    waypoints[j] = corner;
  } else {
    waypoints.splice(startSide ? 1 : waypoints.length - 1, 0, corner);
  }
}

function asRect(element: any): { x: number; y: number; width: number; height: number } {
  return { x: element.x, y: element.y, width: element.width, height: element.height };
}
