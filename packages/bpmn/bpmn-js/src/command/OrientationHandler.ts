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
 * 命令：orientation.set —— 全模型水平/垂直布局切换。
 *
 * 步骤：
 *  1. 先翻转朝向标记与服务状态（后续重布线即按新轴路由）；
 *  2. 注册表内全部形状沿主对角线转置（newX=oldY, newY=oldX）——注册表覆盖
 *     所有平面（含折叠子流程下钻平面），非当前平面的元素同步转置；容器
 *     （池/泳道/分组/展开子流程族）另交换宽高，普通元素保持尺寸；
 *  3. 共线拉直：转置使原本同轴对齐的链产生半尺寸差的横向偏移，把原共线
 *     顺序流的目标重新对中到源，链式收敛于头元素（扇形弯折保持原样）；
 *  3.5 交叉轴间距展开：追加扇形的堆叠间距按旧轴元素跨距取值（水平模型按
 *     任务高 78 排出 92 中心距），转置后落到新交叉轴上、要容纳的却是
 *     元素在交叉轴上的另一维尺寸（任务宽 116），发生差量的矩形重叠
 *     ——对"转置前不相交、转置后相交"的同容器流节点沿交叉轴推开（详见
 *     spreadOverlaps），容器端随内容扩展；
 *  3.6 流向轴间隙下限：转置保持位置间隔但不换尺寸——普通元素宽高不变，
 *     旧流向轴的边到边间隙映射到新流向轴后要容纳的是另一维尺寸（任务高
 *     78 → 转置后沿流向占宽 116），差量把间隙吃到个位数像素，布线只能出
 *     7px 级残肢肘；沿流向推开到最小间隙（详见 spreadFlowGaps）；
 *  4. 全部连线强制重新布线（空 waypoints → 布线器 → 端点裁剪）；
 *  4.5 外部标签重定位：布线后按 LabelGeometry 派生（连线=折线半程点、
 *     形状=形心正下方）整体重摆——转置只搬旧位置，与新走线无关联可讲；
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
import type TextUtil from 'diagram-js/lib/util/Text';
import type { OrientationService, ModelOrientation } from '../meta/Orientation';
import { SIZES, isSubProcessFamily } from '../meta/ElementTypes';
import { absoluteLabelBox } from '../label/LabelGeometry';
import { refitLaneBands } from '../util/PoolGeometry';
import { applyRect, snapshotWaypoints } from '@kunpeng-io/kernel-shared';

/** 容器族：转置时随长轴换向（池/泳道/分组 + 展开子流程族） */
function isTransposingContainer(element: any): boolean {
  const type: string = element?.businessObject?.$type ?? element?.type ?? '';
  if (type === 'bpmn:Participant' || type === 'bpmn:Lane' || type === 'bpmn:Group') {
    return true;
  }
  return isSubProcessFamily(type) && element.isExpanded !== false;
}

/**
 * 切换前航点形态 → 转置后应共中的轴：水平直线（全点同 y）转置为竖直走
 * 线，恢复直线需对齐 x 中心；垂直直线（全点同 x）转置为水平走线，对齐
 * y 中心；非轴向折线返回 null（弯折是用户既有布局，不动）。
 */
function straightAlignAxis(waypoints: { x: number; y: number }[] | undefined): 'x' | 'y' | null {
  if (!waypoints || waypoints.length < 2) {
    return null;
  }
  const sameY = waypoints.every((point) => Math.abs(point.y - waypoints[0].y) < 1);
  const sameX = waypoints.every((point) => Math.abs(point.x - waypoints[0].x) < 1);
  if (sameY && !sameX) {
    return 'x';
  }
  if (sameX && !sameY) {
    return 'y';
  }
  return null;
}

export class OrientationHandler implements CommandHandler {
  static $inject = ['canvas', 'elementRegistry', 'layouter', 'connectionDocking', 'textRenderer', 'orientationService'];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementRegistry: ElementRegistry,
    private readonly layouter: any,
    private readonly connectionDocking: any,
    private readonly textUtil: TextUtil,
    private readonly orientationService: OrientationService
  ) {}

  /** 常规锚位边距（沿袭用户既有实现的取值，与空图种子偏移一致） */
  private static readonly ANCHOR_MARGIN = 159;

  /**
   * 展开最小净空：两端描边（各 2）加悬停/选中轮廓（各 3）视觉叠加后
   * 仍可分辨的间隙量（自有取值，取双倍余量保边框不粘连）
   */
  private static readonly SPREAD_CLEAR = 20;

  /** 容器随内容扩展的边距：与池收编（CollaborationBehavior）边距同值，两处观感一致 */
  private static readonly REFIT_PAD = 40;

  /**
   * 链式相连元素的流向轴最小边到边边距（自有取值：任务-事件链转置后的
   * 观感呼吸量，大于布线器对齐容差 8 级别，残肢肘无生成空间）
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

    // 1. 先翻状态：后续布线按新轴路由
    this.orientationService.setOrientation(orientation);

    // 2. 转置全部形状（注册表覆盖所有平面；根元素无几何不参与）
    const shapes = this.elementRegistry.filter(
      (e: any) => !e.waypoints && e.x !== undefined && e.y !== undefined && !e.isImplicit
    );
    shapes.forEach((shape: any) => {
      context.shapeStates.push({ element: shape, x: shape.x, y: shape.y, width: shape.width, height: shape.height });
      const x = shape.x;
      shape.x = shape.y;
      shape.y = x;
      if (isTransposingContainer(shape)) {
        const width = shape.width;
        shape.width = shape.height;
        shape.height = width;
      }
    });

    // 3. 共线拉直（基于转置前航点判定"原本直线"——主流向链与交叉向支路两类）
    this.straightenColinearLinks();

    // 3.5 交叉轴间距展开（转置引入的重叠消解 + 容器随内容扩展）
    this.spreadOverlaps(context);

    // 3.6 流向轴间隙下限（转置尺寸差吃掉链间距的消解）
    this.spreadFlowGaps(context);

    // 4. 全部连线强制重布线 + 端点裁剪
    const connections = this.elementRegistry.filter((e: any) => !!e.waypoints);
    connections.forEach((connection: any) => {
      context.connectionStates.push({
        element: connection,
        waypoints: snapshotWaypoints(connection)
      });
      connection.waypoints = this.layouter.layoutConnection(connection, {
        source: connection.source,
        target: connection.target,
        waypoints: []
      });
      connection.waypoints = this.connectionDocking.getCroppedWaypoints(connection, connection.source, connection.target);
    });

    // 4.5 外部标签按新几何整体重摆（旧位置随转置平移，与新走线已无对应关系）
    this.replaceLabelGeometry();

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
   * 交叉轴间距展开：转置保持各轴区间的相邻关系但不同步换尺寸——旧堆叠
   * 轴的间距按旧轴上的元素跨距取值（水平扇形按任务高 78 排出 92 中心
   * 距），映射到新交叉轴后要容纳的却是元素在交叉轴上的另一维尺寸（任
   * 务宽 116），差量即重叠量。只消解"转置前矩形不相交、转置后相交"的
   * 元素对：转置是等距映射，前后皆相交的对是用户既有布局，不做整理；
   * 沿交叉轴推开保持行/列结构（主流向次序不动），外部标签与挂靠边界事
   * 件随宿主同移。
   */
  private spreadOverlaps(context: any): void {
    const vertical = !this.orientationService.isHorizontal();
    const crossKey: 'x' | 'y' = vertical ? 'x' : 'y';
    const crossSizeKey = crossKey === 'x' ? 'width' : 'height';
    const clear = OrientationHandler.SPREAD_CLEAR;

    const stateOf = this.stateIndexOf(context.shapeStates);

    // 参与消解的元素：有界流节点。标签（宿主渲染派生）、挂靠形状（随宿
    // 主）、注记（侧栏制品不挤占流向空间）、分组（框架性制品）与容器
    //（池/道/子流程自身）不参与；同容器分组——跨泳道的元素分属平行带，
    // 互不构成挤占
    const byParent = new Map<any, any[]>();
    (context.shapeStates ?? []).forEach((state: any) => {
      const el = state.element;
      if (!el.parent || el.waypoints || el.labelTarget || el.host) {
        return;
      }
      const type: string = el.businessObject?.$type ?? el.type ?? '';
      if (
        type === 'bpmn:Participant' || type === 'bpmn:Lane' || type === 'bpmn:Group' ||
        type === 'bpmn:TextAnnotation' || isSubProcessFamily(type)
      ) {
        return;
      }
      const group = byParent.get(el.parent);
      if (group) {
        group.push(el);
      } else {
        byParent.set(el.parent, [el]);
      }
    });

    const overlapOn = (a: any, b: any): { ox: number; oy: number } => ({
      ox: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
      oy: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
    });
    const wasDisjoint = (a: any, b: any): boolean => {
      const sa = stateOf.get(a);
      const sb = stateOf.get(b);
      if (!sa || !sb) {
        return false;
      }
      const { ox, oy } = overlapOn(sa, sb);
      return ox <= 1 || oy <= 1;
    };

    byParent.forEach((group: any[]) => {
      const sorted = group.slice().sort((a: any, b: any) => a[crossKey] - b[crossKey]);
      let moved = true;
      let pass = 0;
      // 定界扫描：单次推开会与更远元素产生新的"前净后叠"对，扫到不动点
      while (moved && pass <= sorted.length) {
        moved = false;
        pass++;
        for (let i = 0; i < sorted.length - 1; i++) {
          for (let j = i + 1; j < sorted.length; j++) {
            const a = sorted[i];
            const b = sorted[j];
            const { ox, oy } = overlapOn(a, b);
            if (ox <= 1 || oy <= 1 || !wasDisjoint(a, b)) {
              continue;
            }
            const push = a[crossKey] + a[crossSizeKey] + clear - b[crossKey];
            if (push <= 0) {
              continue;
            }
            b[crossKey] += push;
            (b.labels ?? []).forEach((label: any) => {
              label[crossKey] += push;
            });
            (b.attachers ?? []).forEach((attacher: any) => {
              attacher[crossKey] += push;
            });
            moved = true;
          }
        }
      }
    });

    this.refitContainers(context);
  }

  /**
   * 容器端随内容扩展：展开沿交叉轴向后推，交叉轴末端（无头带一侧）可能
   * 溢出；主流向端转置自身保持围合，拉直偏移由边距吸收。池扩展后泳道
   * 带经 refitLaneBands 随新内容区重铺——主流向增量只改带的跨度，堆叠
   * 轴增量由边缘带吸收，带界无缝。
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
      // 池界变化后重铺带：堆叠轴（交叉轴）增量由边缘带吸收，主流向跨度
      // 随新内容区铺满——对照扩展前池界才能算出增量
      const newBounds = { x: el.x, y: el.y, width: el.width, height: el.height };
      refitLaneBands(lanes, oldBounds, newBounds, SIZES.POOL_HEADER, horizontal).forEach(
        ({ lane, bounds: band }: { lane: any; bounds: any }) => applyRect(lane, band)
      );
    });
  }

  /** 形状状态索引：element → 转置前快照（间距展开与共线拉直两处扫描共用同一建法） */
  private stateIndexOf(shapeStates: any[] | undefined): Map<any, any> {
    const stateOf = new Map<any, any>();
    (shapeStates ?? []).forEach((state: any) => stateOf.set(state.element, state));
    return stateOf;
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
   * 共线拉直："原直线" = 切换前航点共轴（水平直线全点同 y / 垂直直线全点
   * 同 x）。转置是位置镜像而普通元素尺寸不换，共享中心按"坐标+半尺寸"
   * 映射到新轴——等尺寸元素保持对齐，异尺寸元素（网关 52 对任务 116）
   * 产生半尺寸差偏移使新连线弯折。恢复直线 = 把目标在"新走线的横轴"上
   * 对齐源：旧水平直线转置为竖直走线对齐 x 中心，旧垂直直线转置为水平
   * 走线对齐 y 中心——两类都要处理，只拉主流向链会留下交叉向支路的错
   * 位弯（2026-11-17 用户报障形态之一）。目标的外部标签随宿主同轴平
   * 移；按链序处理使链收敛于头元素。定界扫描：注册表序不必是链序，扫
   * 到不动点为止。
   */
  private straightenColinearLinks(): void {
    const flows = this.elementRegistry.filter(
      (e: any) => !!e.waypoints && e.businessObject?.$type === 'bpmn:SequenceFlow'
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
        // 只处理切换前为轴向直线的连线（扇形弯折保持原样）；航点此刻仍是
        // 导入原值（重布线在后），可作切换前形态的判据
        const alignKey = straightAlignAxis(flow.waypoints);
        if (!alignKey) {
          return;
        }
        const sizeKey = alignKey === 'x' ? 'width' : 'height';
        const delta = source[alignKey] + source[sizeKey] / 2 - (target[alignKey] + target[sizeKey] / 2);
        if (Math.abs(delta) < 1) {
          return;
        }
        target[alignKey] += delta;
        (target.labels ?? []).forEach((label: any) => {
          label[alignKey] += delta;
        });
        moved = true;
      });
    }
  }

  /**
   * 流向轴间隙下限：转置的位置间隔 = 旧轴坐标间隔，但普通元素尺寸不换
   * ——任务 116×78 的旧竖直链按高 78 排出 ~50 边距，转置后沿新流向占的
   * 却是宽 116，差量把边到边间隙吃到个位数像素，布线只能出 7px 级残肢
   * 肘（2026-11-17 用户报障"布局乱"的退化四点形态）。仅整理"切换前为
   * 轴向直线"的链：两端在新流向轴（转置后中心分离更大的轴）上顺序相
   * 邻、横轴交叠（链堆叠而非并排扇形）且边距不足时，把目标沿流向推开
   * 到最小边距（外部标签/挂靠形状随宿主同移；已达标或反向越过的推齐
   * 不回收——用户既有布局不倒退）。定界扫描同共线拉直：推移中间节点
   * 后与下游的间隙在后续轮次补齐。
   */
  private spreadFlowGaps(context: any): void {
    const clear = OrientationHandler.FLOW_GAP;
    const flows = this.elementRegistry.filter(
      (e: any) => !!e.waypoints && e.businessObject?.$type === 'bpmn:SequenceFlow'
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
        if (!straightAlignAxis(flow.waypoints)) {
          return;
        }
        // 新流向轴：转置后两端中心分离更大的轴；横轴 = 另一轴
        const dx = target.x + target.width / 2 - (source.x + source.width / 2);
        const dy = target.y + target.height / 2 - (source.y + source.height / 2);
        const flowKey: 'x' | 'y' = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
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
        moved = true;
      });
    }

    this.refitContainers(context);
  }

  /**
   * 外部标签整体重摆：重布线后走线全变，标签旧位置（转置平移而来）与
   * 新走线已无对应关系（2026-11-17 用户报障"连线 label 没有跟着走"）。
   * 按 LabelGeometry 默认派生重摆——连线=折线半程点、形状=形心正下方，
   * 与导入建图同一几何来源；隐藏标签（空文本）无几何可讲维持原样。
   */
  private replaceLabelGeometry(): void {
    this.elementRegistry.forEach((label: any) => {
      if (!label.labelTarget || label.hidden) {
        return;
      }
      const host = label.labelTarget;
      const box = absoluteLabelBox(this.textUtil, host, host.businessObject?.name);
      label.x = box.x;
      label.y = box.y;
      label.width = box.width;
      label.height = box.height;
    });
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
