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
 * 拖放悬停目标归一行为：非容器命中沿父链改写到最近承载容器（可被插件覆盖的独立行为）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { isContainerType } from '../meta/ElementTypes';

/**
 * 拖放悬停目标归一：diagram-js 把悬停命中元素直接当放置目标（Create/Move
 * 的 context.target = event.hover），命中流节点/连线等非容器形状时会以
 * "元素当容器"判禁止——悬停元素上方无法释放。本行为在高优先级监听里把
 * 非容器命中沿父链改写到最近的承载容器（泳道/池/展开子流程/画布根），
 * 悬停元素上方即释放到其所在容器。两个例外保持原始命中：拖中间事件悬停
 * 活动是边界事件挂靠语义（shape.attach）；拖边界事件沿宿主边线滑动重挂
 * 依赖 hover=宿主活动。
 */
export class DropTargetBehavior {
  static $inject = ['eventBus', 'canvas', 'elementRegistry'];

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly elementRegistry: ElementRegistry
  ) {
    const normalize = (event: any): void => {
      const hover = event.hover;
      if (!hover || !hover.businessObject) {
        return;
      }
      const shape = event.context?.shape;
      if (shape && !shape.parent &&
        (shape.type === 'bpmn:IntermediateThrowEvent' || shape.type === 'bpmn:IntermediateCatchEvent')) {
        return;
      }
      const dragging = event.context?.shapes ?? (shape ? [shape] : []);
      if (dragging.some((s: any) => s.businessObject?.$type === 'bpmn:BoundaryEvent')) {
        return;
      }
      // 池的合法落点只有画布根：悬停元素/道/池上一律归一到根（归一到最近
      // 容器会得到池自身——"池建在池里"必然拒绝）
      const isParticipantDrag =
        shape?.businessObject?.$type === 'bpmn:Participant' || shape?.type === 'bpmn:Participant';
      if (isParticipantDrag) {
        let rt: any = hover;
        while (rt && rt.parent) {
          rt = rt.parent;
        }
        if (rt && rt !== hover) {
          event.hover = rt;
        }
        return;
      }
      // 越缘拖拽保持原池为目标（元素碰到池缘→自动扩池，2026-11-18 用户定规）：
      // 悬停空白根时若拖拽集投影矩形仍与共同原池相交，落点归一回原池——
      // 放行后由 AutoResize 扩池覆盖（带随池重铺）；完全脱离原池才维持根
      // 落点被拒弹回。跨池拖动悬停他池/其泳道时不进此分支
      if (!hover.parent) {
        const pool = sharedOriginPool(dragging);
        if (pool && dragging.every((s: any) => rectsOverlap(shiftedBy(s, event.context?.delta), pool))) {
          event.hover = pool;
          return;
        }
      }
      if (isDropContainer(hover)) {
        return;
      }
      let parent = hover.parent;
      while (parent && !isDropContainer(parent)) {
        parent = parent.parent;
      }
      if (parent) {
        event.hover = parent;
      }
    };
    // 数值优先级须高于 Create.js / Move.js 的默认监听（1000），在其读取
    // event.hover 前完成改写。end/out/cleanup 收尾事件必须同样归一：
    // Create.js/MovePreview 把 drop 标记加在归一后的承载容器上（如画布根），
    // 而收尾事件携带的是原始命中元素——不归一会在错误元素上摘标记，
    // drop-not-ok 永久残留在根层（diagram-js CSS 对 svg.drop-not-ok 整画布
    // 上禁放底色且 .drop-not-ok * 全体 cursor:not-allowed，即"界面卡死在
    // 禁止状态"的来源）
    eventBus.on(
      [
        'create.hover', 'create.move', 'create.out', 'create.end', 'create.cleanup',
        'shape.move.hover', 'shape.move.move', 'shape.move.out', 'shape.move.end', 'shape.move.cleanup'
      ],
      1500,
      normalize
    );

    // 拖拽收尾标记兜底清扫：drop-ok/not-ok/new-parent/attach-ok 是拖拽会话
    // 级标记，基座按"最后一个 context.target"摘除——hover 归一（含越缘拖拽
    // 根↔池逐事件翻转）会让标记落在与最终 target 不同的元素上，拖拽结束即
    // 泄漏（drop-not-ok 残留池/根 = 整片区域 not-allowed 永久卡死）。会话级
    // 标记在 cleanup 后不应存在于任何元素，全量清扫闭合一切泄漏路径
    const DRAG_DROP_MARKERS = ['drop-ok', 'drop-not-ok', 'new-parent', 'attach-ok'];
    eventBus.on(['shape.move.cleanup', 'create.cleanup'], () => {
      // elementRegistry 元素形态宽于 hasMarker 形参（含根等），运行时同源
      for (const el of [this.canvas.getRootElement(), ...this.elementRegistry.getAll()] as any[]) {
        for (const marker of DRAG_DROP_MARKERS) {
          if (this.canvas.hasMarker(el, marker)) {
            this.canvas.removeMarker(el, marker);
          }
        }
      }
    });
  }
}

function isDropContainer(element: any): boolean {
  if (!element.parent) {
    return true; // 画布根
  }
  return isContainerType(element.businessObject?.$type, element.isExpanded);
}

/** 拖拽集的共同原池：全部成员沿父链归到同一参与者才有效，否则 null */
function sharedOriginPool(dragging: any[]): any | null {
  let pool: any = null;
  for (const s of dragging) {
    let cur = s?.parent;
    while (cur && cur.businessObject?.$type !== 'bpmn:Participant') {
      cur = cur.parent;
    }
    if (!cur || (pool && cur !== pool)) {
      return null;
    }
    pool = cur;
  }
  return pool;
}

/** 拖拽投影矩形：元素当前边界 + 拖拽增量（缺省零增量——激活探测不带 delta） */
function shiftedBy(shape: any, delta: any): { x: number; y: number; width: number; height: number } {
  return {
    x: shape.x + (delta?.x ?? 0),
    y: shape.y + (delta?.y ?? 0),
    width: shape.width,
    height: shape.height
  };
}

/** 严格相交（贴边不算——贴边拖拽仍由原池落点与扩池语义接管） */
function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: any): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
