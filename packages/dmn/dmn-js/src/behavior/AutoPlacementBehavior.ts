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
 * 追加自动摆放行为：主流向轴朝向感知的追加落点计算（可被插件覆盖的独立行为）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { SIZES } from '../meta/ElementTypes';
import type { OrientationService } from '../meta/Orientation';

/**
 * 追加自动摆放（主流向轴朝向感知）：水平模型源右侧开新列、垂直模型源
 * 正下方开新位；位置被占则沿交叉轴错开。
 * 常量：净空 72（APPEND_GAP，2026-10-25 定规翻倍）、步进 46（APPEND_STEP）、防碰垫 8 —— 自有取值。
 */
export class AutoPlacementBehavior {
  static $inject = ['eventBus', 'elementRegistry', 'orientationService'];

  constructor(
    eventBus: EventBus,
    private readonly elementRegistry: ElementRegistry,
    private readonly orientationService: OrientationService
  ) {
    eventBus.on('autoPlace', (context: any) => this.placeNext(context.source, context.shape));
  }

  private placeNext(source: any, shape: any): { x: number; y: number } {
    // 避让目标 = 兄弟形状；源的祖先容器（池/泳道/子流程链）除外——追加
    // 落点本就要落在源居所内部，祖先边界不该当碰撞块（否则避让会把
    // 新元素挤出容器：池内基座位被"池自身"命中，zigzag 逐级外逃）
    const ancestors = new Set<any>();
    for (let cur = source.parent; cur; cur = cur.parent) {
      ancestors.add(cur);
    }
    const occupied = this.elementRegistry
      .getAll()
      .filter((e: any) => !e.waypoints && !e.labelTarget && e !== source && e.parent && !ancestors.has(e));

    const free = (x: number, y: number): boolean => {
      const box = {
        x: x - shape.width / 2 - 4,
        y: y - shape.height / 2 - 4,
        width: shape.width + 8,
        height: shape.height + 8
      };
      return !occupied.some((e: any) => overlaps(box, e));
    };

    // 文本注记惯例放源斜角位（业界设计器通行布局）：L 括号朝源、Association
    // 沿中心连线斜向直连、线入注记底边括号侧。水平模型右上 / 垂直模型左上。
    // 横向净空 12（自有取值：仅留括号呼吸位，注记左缘列对齐源右缘）；纵向
    // 取 APPEND_GAP 标准净空抬高，保证中心连线约 45° 入底边而非侧穿括号。
    // 被占则沿竖向逐级上移避让（注记列不动，不挤占流程流向空间）
    if (shape.type === 'bpmn:TextAnnotation') {
      const bracketGap = 12;
      if (this.orientationService.isHorizontal()) {
        const cx = source.x + source.width + bracketGap + shape.width / 2;
        let y = source.y - SIZES.APPEND_GAP - shape.height / 2;
        for (let i = 0; i < 24; i++) {
          if (free(cx, y)) {
            return { x: cx, y };
          }
          y -= shape.height / 2 + SIZES.APPEND_STEP / 2;
        }
        return { x: cx, y };
      }
      const cy = source.y - SIZES.APPEND_GAP - shape.height / 2;
      let x = source.x - bracketGap - shape.width / 2;
      for (let i = 0; i < 24; i++) {
        if (free(x, cy)) {
          return { x, y: cy };
        }
        x -= shape.width / 2 + SIZES.APPEND_STEP / 2;
      }
      return { x, y: cy };
    }

    const horizontal = this.orientationService.isHorizontal();
    const base = horizontal
      ? {
          x: source.x + source.width + SIZES.APPEND_GAP + shape.width / 2,
          y: source.y + source.height / 2
        }
      : {
          x: source.x + source.width / 2,
          y: source.y + source.height + SIZES.APPEND_GAP + shape.height / 2
        };

    // 避让=沿交叉轴单向均匀堆叠（水平模型新列向下 / 垂直模型新行向右）：
    // 网关等多分支追加场景形成整齐一列/行，间距恒为步进；交替 zigzag 会
    // 上下跳摆且步长递增掉队，破坏扇形展开的视觉主干
    let candidate = { ...base };
    for (let i = 0; i < 24; i++) {
      if (free(candidate.x, candidate.y)) {
        return candidate;
      }
      const step = (i + 1) * SIZES.APPEND_STEP;
      candidate = horizontal ? { ...base, y: base.y + step } : { ...base, x: base.x + step };
    }
    return base;
  }
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
