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
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 下钻徽标：当前可见平面上每个折叠子流程右下角外侧的悬浮钮（overlays 通道，
 * HTML 可点击）。可见性规则（产品定规）：平面无内容=仅选中时出现；有内容=
 * 常显。徽标只建在当前平面的元素上——其他平面的元素 gfx 在隐藏图层，overlays
 * 容器不随图层显隐，跨平面残留会在当前视图上画出幽灵钮，切换时按当前根重算
 * 差集自然清除。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { Injector } from 'didi';
import { isSubProcessFamily } from '../meta/ElementTypes';
import type { PlaneService } from './PlaneService';

/** 徽标图标（用户提供资产，16×16 evenodd：右下角括弧+指入箭头） */
const DRILL_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" fill="currentColor" d="M4.81801948,3.50735931 L10.4996894,9.1896894 L10.5,4 L12,4 L12,12 L4,12 L4,10.5 L9.6896894,10.4996894 L3.75735931,4.56801948 C3.46446609,4.27512627 3.46446609,3.80025253 3.75735931,3.50735931 C4.05025253,3.21446609 4.52512627,3.21446609 4.81801948,3.50735931 Z"></path></svg>';

const OVERLAY_TYPE = 'bpmn-drill-down';

export class DrillBadges {
  static $inject = ['eventBus', 'canvas', 'overlays', 'injector', 'planeService'];

  private readonly badged = new Set<any>();

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly overlays: any,
    private readonly injector: Injector,
    private readonly planeService: PlaneService
  ) {
    // 可见性输入面：选中态、内容增删（命令收尾 elements.changed）、平面切换、
    // 文档更替；差集更新幂等，多源触发收敛到同一结果
    for (const event of ['selection.changed', 'elements.changed', 'shape.added', 'shape.removed', 'plane.changed', 'root.set', 'import.done']) {
      eventBus.on(event, () => this.refresh());
    }
  }

  private refresh(): void {
    const selection = this.injector.get<any>('selection', false);
    const selected = new Set<any>(selection?.get?.() ?? []);
    const overlays = this.overlays as { add(element: any, type: string, overlay: any): unknown; remove(filter: { element: any; type: string }): unknown };

    const wanted = new Set<any>();
    const walk = (element: any): void => {
      for (const child of element.children ?? []) {
        const bo = child.businessObject;
        if (
          !child.waypoints && !child.labelTarget && bo && isSubProcessFamily(bo.$type)
          && child.isExpanded === false
          && (selected.has(child) || this.hasContent(bo))
        ) {
          wanted.add(child);
        }
        walk(child);
      }
    };
    walk(this.canvas.getRootElement());

    for (const element of this.badged) {
      if (!wanted.has(element)) {
        overlays.remove({ element, type: OVERLAY_TYPE });
        this.badged.delete(element);
      }
    }
    for (const element of wanted) {
      if (!this.badged.has(element)) {
        this.addBadge(element);
        this.badged.add(element);
      }
    }
  }

  private hasContent(bo: any): boolean {
    return ((bo.flowElements?.length ?? 0) + (bo.artifacts?.length ?? 0)) > 0;
  }

  private addBadge(element: any): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bpmn-drill-badge';
    button.title = '下钻进入子流程';
    button.innerHTML = DRILL_ICON;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      this.planeService.drillDown(element);
    });
    // 右下角外侧 12px（overlays 位置语义：right/bottom 负值=向外偏出元素边）
    this.overlays.add(element, OVERLAY_TYPE, {
      html: button,
      position: { right: -12, bottom: -12 }
    });
  }
}
