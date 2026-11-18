/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and /licenses/ directory that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the /licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 池/泳道单选描边顶层化。
 *
 * 基座 Outline 把 .djs-outline 画进元素 gfx 组，描边随元素绘制序。池/泳道
 * 是实底设计（内容区遮画布网格），兄弟泳道边缘相接且绘制序在后——后画的
 * 相邻泳道不透明底/边线把先画泳道的选中描边外扩段（±5px）盖住，添加泳道
 * 后选中非末位泳道必现"蓝框边线被遮挡"。
 *
 * 修法与 MultiSelectionOutline 同构：单选池/泳道时把描边镜像到独立工具层
 * （canvas.getLayer，位于元素层之上）绘制——常显类名 djs-selection-outline
 * + 绝对坐标 + 同膨胀量（5px，与基座 outlineOffset / BpmnOutlineProvider
 * 对齐），gfx 内原描边几何逐像素重合、不另隐藏。多选（>1）不画（多选框
 * 语义：容器标 djs-multi-select 后逐元素描边本就由 CSS 藏去）。拖拽/缩放
 * 进行中清层避免残影（拖拽视觉由基座预览帧/ghost 承担），结束后同步。
 */
import {
  append as svgAppend,
  attr as svgAttr,
  classes as svgClasses,
  clear as svgClear,
  create as svgCreate
} from 'tiny-svg';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type Selection from 'diagram-js/lib/features/selection/Selection';

/** 描边外扩量：与基座 Outline outlineOffset / BpmnOutlineProvider 同值 */
const OUTLINE_OFFSET = 5;

/** 池/泳道（唯一实底且兄弟相接的族，其余族兄弟不重叠无此病灶） */
function isBandShape(element: any): boolean {
  const type: string | undefined = element?.businessObject?.$type;
  return !element?.waypoints && !element?.labelTarget &&
    (type === 'bpmn:Participant' || type === 'bpmn:Lane');
}

export class LaneSelectionOutlineBehavior {
  static $inject = ['eventBus', 'canvas', 'selection'];

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly selection: Selection
  ) {
    const sync = (): void => this.sync();
    const blank = (): void => { svgClear(this.layer()); };

    eventBus.on('selection.changed', sync);
    // 命令后（改尺寸/移动落定）重画；低优先级保证跑在基座 Outline 更新之后
    eventBus.on('shape.changed', 400, sync);
    // 拖拽/缩放进行中清层防残影（期间视觉由预览帧/ghost 承担），结束即同步
    eventBus.on([ 'shape.move.start', 'resize.start' ], blank);
    eventBus.on([ 'shape.move.end', 'resize.end' ], sync);
  }

  private layer(): SVGElement {
    // 工具层（无 index=UTILITY_LAYER_INDEX，位于元素层之上）；懒创建
    return this.canvas.getLayer('laneSelectionOutline') as unknown as SVGElement;
  }

  private sync(): void {
    const layer = this.layer();
    svgClear(layer);

    const selected = this.selection.get();
    // 多选不画：多选框语义由 MultiSelectionOutline 全局框承接
    if (selected.length !== 1) {
      return;
    }
    const element = selected[0];
    if (!isBandShape(element)) {
      return;
    }
    const rect = svgCreate('rect');
    svgAttr(rect, {
      x: element.x - OUTLINE_OFFSET,
      y: element.y - OUTLINE_OFFSET,
      width: element.width + OUTLINE_OFFSET * 2,
      height: element.height + OUTLINE_OFFSET * 2,
      rx: 0,
      // 显式关填充（BpmnOutlineProvider 同法）：不依赖宿主页面是否链全基座 CSS
      fill: 'none'
    });
    svgClasses(rect).add('djs-selection-outline');
    svgAppend(layer, rect);
  }
}
