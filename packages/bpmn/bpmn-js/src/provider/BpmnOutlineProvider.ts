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
 * 形状贴合的选中描边。
 *
 * diagram-js Outline 特性默认给所有形状画统一的 rx=4 矩形描边；
 * 本 provider 走其官方扩展点（outline.registerProvider）按 BPMN 元素族
 * 提供同形几何：事件→圆环、网关→菱形环、任务族/子流程→圆角矩形、
 * 其余（池/泳道/数据/注记）→直角矩形。颜色/线宽/显隐完全由
 * diagram-js.css 控制（.djs-outline 系列规则），此处只出几何。
 *
 * 坐标契约：描边节点追加在元素 gfx 组内（组已平移到元素原点），
 * 故几何一律为局部坐标，膨胀量与 Outline 默认 outlineOffset 对齐。
 */
import { create, attr } from 'tiny-svg';

/** 描边与本体的留白，取 diagram-js Outline 默认 outlineOffset 同值（5px） */
const OUTLINE_OFFSET = 5;

export class BpmnOutlineProvider {
  static $inject = ['outline'];

  constructor(outline: any) {
    outline.registerProvider(this);
  }

  /** 首次悬停/选中时按元素族创建描边节点；返回 null 则回落默认矩形 */
  getOutline(element: any): SVGElement | null {
    const type: string | undefined = element?.businessObject?.$type;
    if (!type?.startsWith('bpmn:') || element.waypoints || element.labelTarget) {
      return null;
    }

    let outline: SVGElement;
    if (type.endsWith('Event')) {
      outline = create('circle');
    } else if (type.endsWith('Gateway')) {
      outline = create('path');
    } else {
      outline = create('rect');
    }
    // class 供 CSS 显隐与 Outline 的 domQuery 复查；fill 关闭避免挡住命中
    attr(outline, { class: 'djs-outline', fill: 'none' });
    return outline;
  }

  /** 元素尺寸/位置变化时同步描边几何；返回 true 阻止 Outline 的默认矩形兜底 */
  updateOutline(element: any, outline: SVGElement): boolean {
    const type: string | undefined = element?.businessObject?.$type;
    if (!type?.startsWith('bpmn:')) {
      return false;
    }

    const w: number = element.width;
    const h: number = element.height;
    const off = OUTLINE_OFFSET;

    switch (outline.nodeName) {
      case 'circle':
        // 事件为正方形包围盒，圆心取盒心
        attr(outline, { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2 + off });
        return true;
      case 'path':
        // 网关菱形：四顶点向四周外扩 off
        attr(outline, {
          d: `M ${w / 2} ${-off} L ${w + off} ${h / 2} L ${w / 2} ${h + off} L ${-off} ${h / 2} Z`
        });
        return true;
      case 'rect':
        attr(outline, {
          x: -off,
          y: -off,
          width: w + off * 2,
          height: h + off * 2,
          rx: rectOutlineRadius(type)
        });
        return true;
      default:
        return false;
    }
  }
}

/** 圆角取值与本体盒一致再加留白：任务族 9、分组 8，方角族（池/泳道/数据/注记）取 0 */
function rectOutlineRadius(type: string): number {
  if (type === 'bpmn:Participant' || type === 'bpmn:Lane' ||
      type === 'bpmn:DataObjectReference' || type === 'bpmn:DataStoreReference' ||
      type === 'bpmn:TextAnnotation') {
    return 0;
  }
  return (type === 'bpmn:Group' ? 8 : 9) + OUTLINE_OFFSET;
}
