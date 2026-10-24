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
  static $inject = ['eventBus'];

  constructor(eventBus: EventBus) {
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
  }
}

function isDropContainer(element: any): boolean {
  if (!element.parent) {
    return true; // 画布根
  }
  return isContainerType(element.businessObject?.$type, element.isExpanded);
}
