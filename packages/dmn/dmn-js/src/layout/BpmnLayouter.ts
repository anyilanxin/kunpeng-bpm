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
 * ① 锚点选取（朝向优先 + 转角数最少）：吸附点集 = 以图形中心为原点的
 * 四条边框中点（事件=圆的方位点、任务族=边中点、网关=菱形顶点，顶点恰
 * 在边中点上，四个角按来线方向各自可达）。"沿一个方向计算"——主流向轴
 * 分离时端点恒取面对对端的边中点（水平模型源右缘中点 → 目标左缘中点；
 * 垂直模型源下缘 → 目标上缘）；越界例外：本端中心越出对端交叉轴跨度
 * （水平模型上/下缘、垂直模型左/右缘，"偏离太远"）时末端改取越出侧
 * 交叉轴顶点（下方入 S / 上方入 N；垂直模型右入 E / 左入 W），走两段
 * L（1 折）——直角数最少原则：带内偏置 Z 肘 2 折是正交且不穿形的最小
 * 折数，越界后 1 折 L 更少且不绕行。仅交叉轴分离（横向交叠的上下正对）
 * 取交叉轴向中点；完全重叠退最近中点。直线类型（消息流/关联）例外：
 * 沿中心连线裁剪到元素边界（见 boundaryAlong）。手动拖点走
 * connection.updateWaypoints，不经此布线器。
 *
 * ② 正交布线（横平竖直、直角数取该锚对下的最小值、端向纯净）：弯点
 * 严格沿锚轴布置——同轴（水平↔水平 / 垂直↔垂直）近对齐收直段（0 折），
 * 否则出两元素间隙中点的 Z 形肘（水平↔水平带纵向错位时 2 折即最小，
 * 1 折 L 必然令一端轴向不纯）；异轴（越界与回退场景）出两段 L（1 折）。
 * 端点入线方向必须与锚朝向一致（水平锚水平进出），杜绝竖直直插水平
 * 锚的断裂视觉。网关作源的扇出是特例：追加链沿交叉轴堆叠（见
 * AutoPlacementBehavior），交叉轴顶点出 L 让分支散开。
 *
 * 移动/缩放路径（diagram-js 各 Handler 带 connectionStart/End hints 调入）：
 * 只重锚移动侧（同①朝向准则，端侧锚取连线方向 pair 的 end），对侧锚点
 * 与既有弯点原样保留——复用基座 repairConnection 的修复语义；尾段与锚
 * 朝向相悖（竖直直插、对角折返）或弯点越过锚点滞留目标跨度内时，按
 * 锚轴最小形重建入线（见 snapEndpoint），内外段全程正交。
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
    const horizontal = this.orientationService.isHorizontal();

    // 规划①朝向锚（边框中点、沿一个方向）：主流向轴正对取面对侧中点
    // （水平模型 E→W），仅交叉轴分离走交叉轴向；完全重叠退最近中点
    const pair = facingPair(source, target, horizontal);
    const startAnchor = pair?.start ?? anchorOf(source, center(target));
    const endAnchor = pair?.end ?? anchorOf(target, center(source));
    const start = startAnchor.point;
    const end = endAnchor.point;

    if (STRAIGHT_TYPES.has(type)) {
      // 直线类型锚点见 boundaryAlong：沿中心连线裁剪到元素边界，而非中点锚
      return [boundaryAlong(source, center(target)), boundaryAlong(target, center(source))];
    }

    if (hints?.connectionStart || hints?.connectionEnd) {
      // 两点连线没有可保弯点（基座修复此时退全量 Manhattan 重排，行/列
      // 取其自有启发，直角数常非最少）——直接走自有布线，转角最少
      if (!connection.waypoints || connection.waypoints.length <= 2) {
        return this.routeOrthogonal(startAnchor, endAnchor, source, target);
      }
      const repaired = repairConnection(asRect(source), asRect(target), start, end, connection.waypoints, {
        connectionStart: !!hints.connectionStart,
        connectionEnd: !!hints.connectionEnd
      });
      return reSnapMovedAnchors(repaired, source, target, !!hints.connectionStart, !!hints.connectionEnd, horizontal);
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
 * 指定侧的边框中点锚：以图形中心为原点的四个正向点（E/W/S/N），
 * axis 标记锚的出线轴向（E/W 水平、S/N 垂直），布线按轴走肘。
 */
function midAnchor(element: any, side: 'E' | 'W' | 'S' | 'N'): Anchor {
  const { x, y, width: w, height: h } = asRect(element);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const table: Record<'E' | 'W' | 'S' | 'N', Anchor> = {
    E: { point: { x: x + w, y: cy }, axis: 'h' },
    W: { point: { x, y: cy }, axis: 'h' },
    S: { point: { x: cx, y: y + h }, axis: 'v' },
    N: { point: { x: cx, y: y }, axis: 'v' }
  };
  return table[side];
}

/**
 * 朝向锚对（规划①主规则，"沿一个方向计算 + 转角数最少"）：主流向轴分离
 * 时端点恒取面对对端的边中点——水平模型 E→W / W→E，垂直模型 S→N / N→S。
 * 越界例外（转角最少）：本端中心越出对端交叉轴跨度（水平模型上/下缘、
 * 垂直模型左/右缘）时，末端改取越出侧的交叉轴顶点走两段 L（1 折）——
 * 来线已越过对端本体，自上/下（左/右）入最近顶点最自然，侧向 Z 肘要
 * 2 折且竖向绕行更长；中心仍面对对端跨度内（"差不多水平"）时保持侧向
 * 入线：对齐 0 折直段 / 带内偏置 Z 肘 2 折（该几何下正交且不穿形的最
 * 小折数）。仅交叉轴分离（横向交叠的上下正对）取交叉轴向中点；两轴都
 * 重叠（完全交叠的退化摆放）返回 null，调用方退回最近中点。多源扇入
 * 同侧目标全汇朝向锚，带内偏置在两元素间隙列完成。
 */
function facingPair(
  element: any,
  other: any,
  horizontal: boolean
): { start: Anchor; end: Anchor } | null {
  const e = asRect(element);
  const o = asRect(other);
  const main: ['E' | 'W' | 'S' | 'N', 'E' | 'W' | 'S' | 'N'] = horizontal ? ['E', 'W'] : ['S', 'N'];
  const cross: ['E' | 'W' | 'S' | 'N', 'E' | 'W' | 'S' | 'N'] = horizontal ? ['S', 'N'] : ['E', 'W'];
  const mainFwd = horizontal ? o.x >= e.x + e.width : o.y >= e.y + e.height;
  const mainRev = horizontal ? e.x >= o.x + o.width : e.y >= o.y + o.height;
  if (mainFwd || mainRev) {
    const start = midAnchor(element, mainFwd ? main[0] : main[1]);
    let end = midAnchor(other, mainFwd ? main[1] : main[0]);
    const selfCross = horizontal ? e.y + e.height / 2 : e.x + e.width / 2;
    const otherLo = horizontal ? o.y : o.x;
    const otherHi = horizontal ? o.y + o.height : o.x + o.width;
    if (selfCross > otherHi) {
      end = midAnchor(other, cross[0]); // 越出下/右缘 → 对端 S/E 顶点
    } else if (selfCross < otherLo) {
      end = midAnchor(other, cross[1]); // 越出上/左缘 → 对端 N/W 顶点
    }
    return { start, end };
  }
  const crossFwd = horizontal ? o.y >= e.y + e.height : o.x >= e.x + e.width;
  const crossRev = horizontal ? e.y >= o.y + o.height : e.x >= o.x + o.width;
  if (crossFwd) {
    return { start: midAnchor(element, cross[0]), end: midAnchor(other, cross[1]) };
  }
  if (crossRev) {
    return { start: midAnchor(element, cross[1]), end: midAnchor(other, cross[0]) };
  }
  return null;
}

/**
 * 最近规范锚（回退路径）：bbox 四边中点朝向对端取最近者——仅用于两元
 * 素完全交叠的退化摆放（facingPair 返回 null 时），保证确定性。
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

/** 基座修复收尾的分派：移动侧各自按 snapEndpoint 夹回朝向锚并对轴入线 */
function reSnapMovedAnchors(
  waypoints: { x: number; y: number }[],
  source: any,
  target: any,
  startMoved: boolean,
  endMoved: boolean,
  horizontal: boolean
): { x: number; y: number }[] {
  let out = waypoints.map((p) => ({ x: p.x, y: p.y }));
  if (startMoved) {
    snapEndpoint(out, source, target, 0, horizontal);
  }
  if (endMoved) {
    snapEndpoint(out, target, source, out.length - 1, horizontal);
  }
  // 共线点折叠：修复/重锚可能留下方向不变的冗余点，折掉保直角数最少
  out = out.filter((p, i, a) =>
    i === 0 || i === a.length - 1 ||
    !((a[i - 1].x === p.x && p.x === a[i + 1].x) || (a[i - 1].y === p.y && p.y === a[i + 1].y))
  );
  return out;
}

/**
 * 移动侧端点收尾：夹回朝向锚（与创建路径同准则，含深偏置交叉轴顶点；
 * 端侧锚取"远端→本端"连线方向 pair 的 end），尾段按锚轴定形——弯点已在
 * 锚轴带、位于来线一侧且内侧段正交时保留基座修复结果（未移动侧原样、
 * 手动弯点不丢）；否则以锚轴最小形重建：同轴带直段 / 间隙列 Z 肘（列
 * 优先沿用既有弯点的列，仅当其越过锚点落在目标跨度内/同列时改取内侧
 * 点与锚点的中点）。端点入线方向恒与锚朝向一致、弯点不探进目标本体
 * ——修复投影的悬空 docking、对角折返、竖直直插水平锚、换锚后旧弯列
 * 滞留目标跨度内等尾段问题统一在此归位。仅两点连线没有可动弯点，直接
 * 换端点（轴向对齐场景换后仍是直线）。
 */
function snapEndpoint(
  waypoints: { x: number; y: number }[],
  element: any,
  other: any,
  index: number,
  horizontal: boolean
): void {
  const anchor = index === 0
    ? facingPair(element, other, horizontal)?.start
    : facingPair(other, element, horizontal)?.end;
  const { point, axis } = anchor ?? anchorOf(element, center(other));
  waypoints[index] = { x: point.x, y: point.y };
  if (waypoints.length <= 2) {
    return;
  }
  const startSide = index === 0;
  const j = startSide ? 1 : waypoints.length - 2;
  const inner = waypoints[startSide ? 2 : j - 1];
  const bend = waypoints[j];
  const pos = axis === 'h' ? 'x' : 'y';
  const lat = axis === 'h' ? 'y' : 'x';
  const side = Math.sign(inner[pos] - point[pos]);
  const tailPure = bend[lat] === point[lat]
    && bend[pos] !== point[pos]
    && Math.sign(bend[pos] - point[pos]) === side
    && (inner.x === bend.x || inner.y === bend.y);
  if (tailPure) {
    return;
  }
  const tail: { x: number; y: number }[] = [];
  if (inner[lat] !== point[lat]) {
    const keepCol = Math.sign(bend[pos] - point[pos]) === side
      ? bend[pos]
      : (inner[pos] + point[pos]) / 2;
    tail.push(axis === 'h' ? { x: keepCol, y: inner.y } : { x: inner.x, y: keepCol });
    tail.push(axis === 'h' ? { x: keepCol, y: point.y } : { x: point.x, y: keepCol });
  }
  if (startSide) {
    waypoints.splice(0, 2, { x: point.x, y: point.y }, ...tail);
  } else {
    waypoints.splice(j, 2, ...tail, { x: point.x, y: point.y });
  }
}

function asRect(element: any): { x: number; y: number; width: number; height: number } {
  return { x: element.x, y: element.y, width: element.width, height: element.height };
}
