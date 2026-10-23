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
 * 端点锚位规则（自动布线统一吸附规范锚点）：取"朝向对端"最近的
 * bbox 四边中点——事件=圆的方位点、任务族=边的 midpoint、网关=菱形顶点，
 * 三类形状同公式。手动拖点走 connection.updateWaypoints，不经此布线器。
 * 自有策略只负责中段肘形方向与中轴取两 bbox 间隙中点：肘形主流向轴
 * 朝向感知——水平模型目标在右走水平肘、垂直模型目标在下走垂直肘
 * （朝向决定两方向分支的判定次序，否则垂直模型里下方偏右的目标会被
 * 水平分支截走，出东侧锚绕侧向 Z 弯）。
 *
 * 移动/缩放路径（diagram-js 各 Handler 带 connectionStart/End hints 调入）：
 * 只重锚移动侧（仍取规范中点锚），对侧锚点与既有弯点原样保留——复用
 * 基座 repairConnection 的修复语义，避免无关侧锚点跳动、手动弯点丢失；
 * 修复不适用（如两点直线）时其内部退回全量重排。
 */
import BaseLayouter from 'diagram-js/lib/layout/BaseLayouter';
import type { LayoutConnectionHints } from 'diagram-js/lib/layout/BaseLayouter';
import { repairConnection } from 'diagram-js/lib/layout/ManhattanLayout';

const STRAIGHT_TYPES = new Set(['bpmn:MessageFlow', 'bpmn:Association']);
/** 肘形判定容差：|dy| < 8 视为水平对齐（自有取值） */
const ALIGN_TOLERANCE = 8;

import type { OrientationService } from '../meta/Orientation';

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

    const start = anchorOf(source, center(target)).point;
    const end = anchorOf(target, center(source)).point;

    if (STRAIGHT_TYPES.has(type)) {
      return [start, end];
    }

    if (hints?.connectionStart || hints?.connectionEnd) {
      const repaired = repairConnection(asRect(source), asRect(target), start, end, connection.waypoints, {
        connectionStart: !!hints.connectionStart,
        connectionEnd: !!hints.connectionEnd
      });
      return reSnapMovedAnchors(repaired, source, target, !!hints.connectionStart, !!hints.connectionEnd);
    }

    return this.routeOrthogonal(start, end, source, target);
  }

  private routeOrthogonal(
    start: { x: number; y: number },
    end: { x: number; y: number },
    source: any,
    target: any
  ): any[] {
    const s = asRect(source);
    const t = asRect(target);
    const horizontal = this.orientationService.isHorizontal();

    const gapX = t.x - (s.x + s.width);
    const gapY = t.y - (s.y + s.height);

    // 网关扇出（自有策略）：目标中心沉到源底之下（水平模型）/越过源右缘
    // （垂直模型）时，改由交叉轴顶点出两段 L（下行/横行后转入边）——网关
    // 是分叉节点，追加链沿交叉轴单向堆叠（见 AutoPlacementBehavior），L 形
    // 让每条分支的主干清晰散开；水平肘 Z 形会在网关右侧把多分支挤成一束。
    // 末端锚强制取面向源的一侧中点（W/N）：L 末段是水平/垂直入线，按距离
    // 选锚会在深下目标上选中 N/S 锚，线贴着目标顶/底横过去，形态怪异
    const isGateway = !!source.businessObject?.$type?.endsWith('Gateway');
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

    // 主流向轴优先：水平模型先判"目标在右"（水平肘），垂直模型先判
    // "目标在下"（垂直肘）——斜向（右下）目标按主流向轴出线
    if (horizontal ? gapX >= 0 : gapY >= 0) {
      return horizontal
        ? this.elbowHorizontal(s, start, end, gapX)
        : this.elbowVertical(s, t, start, end, gapY);
    }
    if (horizontal ? gapY >= 0 : gapX >= 0) {
      return horizontal
        ? this.elbowVertical(s, t, start, end, gapY)
        : this.elbowHorizontal(s, start, end, gapX);
    }

    // 反向（左/上）：从源左/上边出，绕行目标另一侧
    const midX = (t.x + t.width + s.x) / 2;
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  /** 目标在源右侧：水平优先肘形，|dy| 小 → 直线 */
  private elbowHorizontal(
    s: { x: number; y: number; width: number },
    start: { x: number; y: number },
    end: { x: number; y: number },
    gapX: number
  ): any[] {
    if (Math.abs(end.y - start.y) < ALIGN_TOLERANCE) {
      return [start, { x: end.x, y: start.y }];
    }
    const midX = s.x + s.width + Math.max(gapX / 2, 1);
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  /** 目标在源下方：垂直优先肘形，|dx| 小 → 直线 */
  private elbowVertical(
    s: { x: number; y: number; width: number; height: number },
    t: { x: number; y: number; width: number; height: number },
    start: { x: number; y: number },
    end: { x: number; y: number },
    gapY: number
  ): any[] {
    if (Math.abs(end.x - start.x) < ALIGN_TOLERANCE) {
      // 拉轴点 (start.x, end.y) 仅当它压在目标边线（N/S 边 y 或 W/E 边 x）
      // 才是贴边的；斜位（zigzag 避让产物：横向偏移小于容差）时两端互取
      // E/W 锚，拉轴点会悬进目标 bbox 内部（箭头插进元素）。不贴边时退回
      // 三段直角微折（jog 小于容差），末端仍钉在规范锚点——禁用 [start,end]
      // 两点斜线：非正交破坏连线契约，且经端点裁剪后箭头会挂到 bbox 角落
      // （"从任务侧边偏下角斜插进网关侧边"的视觉）
      const tip = { x: start.x, y: end.y };
      const onEdge =
        ((tip.y === t.y || tip.y === t.y + t.height) && tip.x >= t.x && tip.x <= t.x + t.width) ||
        ((tip.x === t.x || tip.x === t.x + t.width) && tip.y >= t.y && tip.y <= t.y + t.height);
      return onEdge ? [start, tip] : [start, tip, end];
    }
    const midY = s.y + s.height + Math.max(gapY / 2, 1);
    return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
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
 * 规范锚点：bbox 四边中点（E/W/S/N），朝向对端取最近者。
 * 事件（圆内切 bbox）= 圆的四个方位点；任务族 = 各边中点；
 * 网关（菱形顶点即 bbox 边中点）= 四个顶点——三类同公式。
 * axis 标记锚的出线轴向（E/W 水平、S/N 垂直），供相邻弯点对轴。
 */
function anchorOf(element: any, toward: { x: number; y: number }): { point: { x: number; y: number }; axis: 'h' | 'v' } {
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
 * 端点保留基座修复结果（未移动侧原样、手动弯点不丢）。存在相邻弯点时
 * 同步把弯点对齐到锚的出线轴，消除投影端点遗留的斜段；仅两点连线
 * （直线）没有可动弯点，直接换端点——轴向对齐场景换后仍是直线。
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
  const { point, axis } = anchorOf(element, center(other));
  waypoints[index] = { x: point.x, y: point.y };
  if (waypoints.length > 2) {
    const j = index === 0 ? 1 : waypoints.length - 2;
    if (axis === 'h') {
      waypoints[j].y = point.y;
    } else {
      waypoints[j].x = point.x;
    }
  }
}

function asRect(element: any): { x: number; y: number; width: number; height: number } {
  return { x: element.x, y: element.y, width: element.width, height: element.height };
}
