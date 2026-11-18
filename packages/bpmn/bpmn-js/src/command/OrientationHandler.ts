/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License version 2 only, as published
 * by the Free Software Foundation. The copyright holder designates this
 * particular file as subject to the "Classpath" exception as provided in
 * the LICENSE file that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * version 2 for more details (a copy is included with the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 with this work; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 命令：orientation.set —— 全模型水平/垂直布局切换。
 *
 * 设计基线（2026-11-18 用户定案）：**点旋转，形不转**。横竖切换 = 纯坐标
 * 变换——所有"点"（形状位置、连线航点、标签锚点）按 newX=oldY / newY=oldX
 * 转置；形状尺寸作为图形符号保持朝向无关（任务恒 116×78、事件/网关轴对
 * 称），池/泳道/分组/展开子流程族是结构区域，随轴换向（宽高互换）。
 *
 * 转置是等距映射：共轴直线映到共轴直线（旧竖直直线共 x → 新水平直线共
 * y，与元素尺寸无关）、曼哈顿折线恒曼哈顿、已裁剪端点落在转置后的对应
 * 棱上——**无需重布线、无需重裁剪、无需共线拉直、无需标签重摆**。
 *
 * 尺寸不随点转置是唯一失配源：非方形元素在流向轴上的占地变了（任务
 * 78→116），链式相邻对的边到边边距收缩 |宽−高|，需两道有界修正：
 *  - 流向轴边距下限（spreadFlowGaps）：仅"轴向直线"相连对沿流向推开，
 *    横轴不动保证直线不破；被推元素的连线端点随端元素同轴平移（折线
 *    形态原样保留）；
 *  - 挂靠贴边（snapAttachers）：挂靠边界事件点转置后会落入宿主形内，
 *    按宿主中心方向投影回宿主棱。
 *
 * 步骤：
 *  1. 翻转朝向标记与服务状态；
 *  2. 全量点转置：形状位置（结构容器宽高互换）、标签中心（盒尺寸服务
 *     文字度量不变）、连线航点逐点；注册表覆盖所有平面（含折叠子流程
 *     下钻平面），非当前平面的元素同步转置；
 *  3. 流向轴边距下限 + 容器随内容扩展；
 *  4. 挂靠形状贴边；
 *  5. 重锚定：整体平移到固定种子锚位 (159,159)（与空图种子一致）——
 *     锚位不依赖视口，连续切换不漂移；居中观感由视口适配承担；
 *  6. 适配视口（按元素新几何直算，不读图层 bbox 缓存——缓存失效要等
 *     命令外的 elements.changed，读到的会是转置前的旧 bbox）。
 *
 * 撤销恢复执行时快照（几何/航点/朝向），非重演式。
 * 本库导出侧几何直接读画布元素，DI 无需手工同步；命令返回脏元素列表，
 * CommandStack 自动触发 elements.changed 重绘。
 */
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type { OrientationService, ModelOrientation } from '../meta/Orientation';
import { SIZES, isSubProcessFamily } from '../meta/ElementTypes';
import { refitLaneBands } from '../util/PoolGeometry';
import { applyRect, snapshotWaypoints } from '@kunpeng-io/kernel-shared';

/** 结构容器族：区域随轴换向（宽高互换）；普通图形符号尺寸朝向无关 */
function isTransposingContainer(element: any): boolean {
  const type: string = element?.businessObject?.$type ?? element?.type ?? '';
  if (type === 'bpmn:Participant' || type === 'bpmn:Lane' || type === 'bpmn:Group') {
    return true;
  }
  return isSubProcessFamily(type) && element.isExpanded !== false;
}

/**
 * 轴向直线判定：全点共 x（竖直直线）返回 'x'、全点共 y（水平直线）返回
 * 'y'——返回值即直线共中的轴；非轴向折线返回 null（弯折是用户既有布局，
 * 不参与边距整理）。转置把共 x 映为共 y，判定对转置前后形态各自成立。
 */
function straightAlignAxis(waypoints: { x: number; y: number }[] | undefined): 'x' | 'y' | null {
  if (!waypoints || waypoints.length < 2) {
    return null;
  }
  const sameY = waypoints.every((point) => Math.abs(point.y - waypoints[0].y) < 1);
  const sameX = waypoints.every((point) => Math.abs(point.x - waypoints[0].x) < 1);
  if (sameY && !sameX) {
    return 'y';
  }
  if (sameX && !sameY) {
    return 'x';
  }
  return null;
}

/** 形状点转置：位置轴互换；结构容器宽高随轴换向；标签按中心转置（盒尺寸服务文字度量不变） */
function transposeShape(shape: any): void {
  if (shape.labelTarget) {
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    shape.x = centerY - shape.width / 2;
    shape.y = centerX - shape.height / 2;
    return;
  }
  const x = shape.x;
  shape.x = shape.y;
  shape.y = x;
  if (isTransposingContainer(shape)) {
    const width = shape.width;
    shape.width = shape.height;
    shape.height = width;
  }
}

export class OrientationHandler implements CommandHandler {
  static $inject = ['canvas', 'elementRegistry', 'orientationService'];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementRegistry: ElementRegistry,
    private readonly orientationService: OrientationService
  ) {}

  /** 常规锚位边距（沿袭用户既有实现的取值，与空图种子偏移一致） */
  private static readonly ANCHOR_MARGIN = 159;

  /** 容器随内容扩展的边距：与池收编（CollaborationBehavior）边距同值，两处观感一致 */
  private static readonly REFIT_PAD = 40;

  /**
   * 链式相连元素的流向轴最小边到边边距（自有取值：任务-事件链转置后的
   * 观感呼吸量，覆盖 |宽−高| 收缩差后仍留出走线空间）
   */
  private static readonly FLOW_GAP = 40;

  execute(context: any): any[] {
    const orientation = context.orientation as ModelOrientation;

    // 同向切换仍占栈位（对称撤销），不产生变更
    if (orientation === this.orientationService.getOrientation()) {
      context.skipped = true;
      return [];
    }

    // 每次执行重取快照：撤销后当前态=原始态，重做重取同值
    context.shapeStates = [];
    context.connectionStates = [];
    context.oldOrientation = this.orientationService.getOrientation();

    // 1. 翻状态
    this.orientationService.setOrientation(orientation);

    // 2. 全量点转置（注册表覆盖所有平面；根元素无几何不参与）
    const shapes = this.elementRegistry.filter(
      (e: any) => !e.waypoints && e.x !== undefined && e.y !== undefined && !e.isImplicit
    );
    shapes.forEach((shape: any) => {
      context.shapeStates.push({ element: shape, x: shape.x, y: shape.y, width: shape.width, height: shape.height });
      transposeShape(shape);
    });
    const connections = this.elementRegistry.filter((e: any) => !!e.waypoints);
    connections.forEach((connection: any) => {
      context.connectionStates.push({
        element: connection,
        waypoints: snapshotWaypoints(connection)
      });
      connection.waypoints.forEach((point: any) => {
        const x = point.x;
        point.x = point.y;
        point.y = x;
      });
    });

    // 3. 流向轴边距下限（尺寸失配的消解 + 容器随内容扩展）
    this.spreadFlowGaps(context, connections);

    // 4. 挂靠形状贴边（点转置后投影回宿主棱）
    this.snapAttachers();

    // 5. 重锚定（平移到固定种子锚位，见 reAnchorContent 说明）
    this.reAnchorContent(context);

    // 6. 适配视口（按元素新几何直接计算，见 fitToContent 说明）
    this.fitToContent();

    return [...shapes, ...connections];
  }

  revert(context: any): any[] {
    if (context.skipped) {
      return [];
    }
    this.orientationService.setOrientation(context.oldOrientation);

    const changed: any[] = [];
    (context.shapeStates ?? []).forEach((state: any) => {
      applyRect(state.element, state);
      changed.push(state.element);
    });
    (context.connectionStates ?? []).forEach((state: any) => {
      state.element.waypoints = state.waypoints;
      changed.push(state.element);
    });

    this.fitToContent();
    return changed;
  }

  /**
   * 适配视口（fit-viewport 语义：只缩不放、内容居中），但按注册表里
   * 元素的当前几何直接计算。不能用 zoom('fit-viewport')：它读图层
   * bbox 的缓存，缓存在命令内的 elements.changed 之前仍是转置前的
   * 旧值，转置后内容会被整体适配到视口之外（画布边缘裁切元素）。
   */
  private fitToContent(): void {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    this.elementRegistry.getAll().forEach((element: any) => {
      // 判 undefined 而非 falsy：x=0 是合法坐标（falsy 判空会把左缘贴 0 的元素漏出 bbox）
      if (element.x === undefined || element.hidden) {
        return;
      }
      if (element.waypoints) {
        for (const point of element.waypoints) {
          x0 = Math.min(x0, point.x);
          y0 = Math.min(y0, point.y);
          x1 = Math.max(x1, point.x);
          y1 = Math.max(y1, point.y);
        }
      } else {
        x0 = Math.min(x0, element.x);
        y0 = Math.min(y0, element.y);
        x1 = Math.max(x1, element.x + element.width);
        y1 = Math.max(y1, element.y + element.height);
      }
    });
    if (!Number.isFinite(x0)) {
      return;
    }
    const outer = this.canvas.getSize();
    // 边距 20（自有取值：略大于选中描边外扩，目测舒适）
    const margin = 20;
    const cw = x1 - x0 + margin * 2;
    const ch = y1 - y0 + margin * 2;
    if (cw <= outer.width && ch <= outer.height) {
      // scale 1 即容纳：视口定锚 (0,0)（fit-viewport 同款分支）。reAnchor
      // 的锚位目标以视口原点为基准，定锚 (0,0) 使目标跨切换恒定——往返
      // 幂等（V→H→V 回到原位）依赖这一点。原点最多左移到内容负坐标侧
      // （首切前用户可能平移过画布，reAnchor 锚位可为负）
      const bx = Math.min(0, x0 - margin);
      const by = Math.min(0, y0 - margin);
      this.canvas.viewbox({
        x: bx,
        y: by,
        width: Math.max(outer.width, x1 + margin - bx),
        height: Math.max(outer.height, y1 + margin - by)
      });
      return;
    }
    const scale = Math.min(outer.width / cw, outer.height / ch);
    this.canvas.viewbox({
      x: (x0 + x1) / 2 - outer.width / scale / 2,
      y: (y0 + y1) / 2 - outer.height / scale / 2,
      width: outer.width / scale,
      height: outer.height / scale
    });
  }

  /**
   * 流向轴边距下限：点转置保位置间隔，但普通元素尺寸不换——任务 116×78
   * 的旧竖直链按高 78 排出 ~50 边距，转置后沿新流向占的是宽 116，差量
   * |宽−高| 把边到边边距吃到个位数甚至负值。仅整理"轴向直线"的相连对
   * （弯折扇形保持原样）：两端横轴（直线共中轴）交叠（链堆叠而非并排）
   * 且流向边距不足时，把目标沿流向（直线走向轴）推开到最小边距。直线
   * 共中轴不动 → 直线恒直；被推元素上所有连线的端点随端元素同轴平移
   * （首/末点各自跟随源/目标，折线形态与中间弯点原样保留）。定界扫描：
   * 推移中间节点后与下游的边距在后续轮次补齐。
   */
  private spreadFlowGaps(context: any, connections: any[]): void {
    const clear = OrientationHandler.FLOW_GAP;
    const flows = connections.filter(
      (e: any) => e.businessObject?.$type === 'bpmn:SequenceFlow'
    );

    let moved = true;
    let pass = 0;
    while (moved && pass <= flows.length) {
      moved = false;
      pass++;
      flows.forEach((flow: any) => {
        const { source, target } = flow;
        if (!source || !target) {
          return;
        }
        const sharedAxis = straightAlignAxis(flow.waypoints);
        if (!sharedAxis) {
          return;
        }
        // 流向轴 = 直线走向轴（共 x 的竖直直线沿 y 流动，反之亦然）
        const flowKey: 'x' | 'y' = sharedAxis === 'x' ? 'y' : 'x';
        const sizeKey = flowKey === 'x' ? 'width' : 'height';
        const crossKey = flowKey === 'x' ? 'y' : 'x';
        const crossSizeKey = flowKey === 'x' ? 'height' : 'width';
        // 横轴不交叠 = 并排扇形支路，不是链堆叠，不动
        const crossOverlap =
          Math.min(source[crossKey] + source[crossSizeKey], target[crossKey] + target[crossSizeKey]) -
          Math.max(source[crossKey], target[crossKey]);
        if (crossOverlap <= 1) {
          return;
        }
        const forward = target[flowKey] + target[sizeKey] / 2 - (source[flowKey] + source[sizeKey] / 2);
        const desired =
          forward >= 0
            ? source[flowKey] + source[sizeKey] + clear
            : source[flowKey] - clear - target[sizeKey];
        const delta = desired - target[flowKey];
        if (delta === 0 || (forward >= 0) !== (delta > 0)) {
          return;
        }
        target[flowKey] = desired;
        (target.labels ?? []).forEach((label: any) => {
          label[flowKey] += delta;
        });
        (target.attachers ?? []).forEach((attacher: any) => {
          attacher[flowKey] += delta;
        });
        // 被推元素的连线端点随端元素同轴平移（源侧首点/目标侧末点）
        connections.forEach((connection: any) => {
          if (connection.target === target && connection.waypoints.length) {
            connection.waypoints[connection.waypoints.length - 1][flowKey] += delta;
          }
          if (connection.source === target && connection.waypoints.length) {
            connection.waypoints[0][flowKey] += delta;
          }
        });
        moved = true;
      });
    }

    this.refitContainers(context);
  }

  /**
   * 挂靠形状贴边：边界事件等挂靠元素点转置后相对宿主的落点会沉入宿主
   * 形内（宿主尺寸未换向）。按"宿主中心 → 挂靠中心"方向把挂靠中心投
   * 影回宿主棱（bbox 等比交点），恢复边界事件骑棱的常规形态。
   */
  private snapAttachers(): void {
    this.elementRegistry.forEach((element: any) => {
      const host = element.host;
      if (!host || element.x === undefined || element.width === undefined) {
        return;
      }
      const dx = element.x + element.width / 2 - (host.x + host.width / 2);
      const dy = element.y + element.height / 2 - (host.y + host.height / 2);
      if (!dx && !dy) {
        return;
      }
      const t = Math.min(
        dx ? host.width / 2 / Math.abs(dx) : Infinity,
        dy ? host.height / 2 / Math.abs(dy) : Infinity
      );
      element.x = host.x + host.width / 2 + dx * t - element.width / 2;
      element.y = host.y + host.height / 2 + dy * t - element.height / 2;
    });
  }

  /**
   * 容器端随内容扩展：边距整理沿流向向后推，容器末端可能溢出；池扩展
   * 后泳道带经 refitLaneBands 随新内容区重铺——主流向增量只改带的跨
   * 度，堆叠轴增量由边缘带吸收，带界无缝。
   */
  private refitContainers(context: any): void {
    const horizontal = this.orientationService.isHorizontal();
    (context.shapeStates ?? []).forEach((state: any) => {
      const el = state.element;
      const type: string = el.businessObject?.$type ?? el.type ?? '';
      const isPool = type === 'bpmn:Participant';
      if (!isPool && !(isSubProcessFamily(type) && el.isExpanded !== false)) {
        return;
      }
      const pad = OrientationHandler.REFIT_PAD;
      const oldBounds = { x: el.x, y: el.y, width: el.width, height: el.height };
      let grew = false;
      (['x', 'y'] as const).forEach((key) => {
        const sizeKey = key === 'x' ? 'width' : 'height';
        const contentEnd = OrientationHandler.contentAxisEnd(el, key, sizeKey);
        if (contentEnd === -Infinity) {
          return;
        }
        const needed = contentEnd + pad;
        if (needed > el[key] + el[sizeKey]) {
          el[sizeKey] = needed - el[key];
          grew = true;
        }
      });
      if (!isPool || !grew) {
        return;
      }
      const lanes = (el.children ?? []).filter((c: any) => c.businessObject?.$type === 'bpmn:Lane');
      if (!lanes.length) {
        return;
      }
      // 池界变化后重铺带：堆叠轴增量由边缘带吸收，主流向跨度随新内容
      // 区铺满——对照扩展前池界才能算出增量
      const newBounds = { x: el.x, y: el.y, width: el.width, height: el.height };
      refitLaneBands(lanes, oldBounds, newBounds, SIZES.POOL_HEADER, horizontal).forEach(
        ({ lane, bounds: band }: { lane: any; bounds: any }) => applyRect(lane, band)
      );
    });
  }

  /** 容器后代（含泳道内）在指定轴上的最远端；标签无独立几何语义不参与 */
  private static contentAxisEnd(container: any, key: 'x' | 'y', sizeKey: 'width' | 'height'): number {
    let end = -Infinity;
    (container.children ?? []).forEach((child: any) => {
      if (!child.labelTarget && child[key] !== undefined && child[sizeKey] !== undefined) {
        end = Math.max(end, child[key] + child[sizeKey]);
      }
      end = Math.max(end, OrientationHandler.contentAxisEnd(child, key, sizeKey));
    });
    return end;
  }

  /**
   * 整体平移到固定种子锚位 (ANCHOR_MARGIN, ANCHOR_MARGIN)（与空图种子
   * 一致，取整偏移保往返字节稳定）。锚位不依赖当前视口——视口随内容
   * 适配浮动，若锚位目标取自视口（如"顶缘+居中"），连续切换会形成
   * 反馈环使内容逐轮漂移；固定种子下转置往返严格回原位（第二次的
   * 补偿平移恰为第一次的转置取反），居中观感由 fitToContent 承担。
   */
  private reAnchorContent(context: any): void {
    const states = (context.shapeStates ?? []).filter((state: any) => state.element.parent);
    if (!states.length) {
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    states.forEach((state: any) => {
      const { element } = state;
      minX = Math.min(minX, element.x);
      minY = Math.min(minY, element.y);
    });

    const dx = Math.round(OrientationHandler.ANCHOR_MARGIN - minX);
    const dy = Math.round(OrientationHandler.ANCHOR_MARGIN - minY);
    if (!dx && !dy) {
      return;
    }

    states.forEach((state: any) => {
      state.element.x += dx;
      state.element.y += dy;
    });
    (context.connectionStates ?? []).forEach((state: any) => {
      state.element.waypoints.forEach((point: any) => {
        point.x += dx;
        point.y += dy;
      });
    });
  }
}
