/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that licenses/ directories that accompany this code.
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
 * 下钻角标（用户定规 2026-10-26 终版）：可下钻元素（注册表 drillable：
 * Decision/BKM）右上角蓝底白网格角标，点击进同页面编辑视图。
 *
 * 实现走 diagram-js overlays（原生 DOM 按钮）：点击不进画布事件链——
 * 不会误触选中/拖拽；移动/缩放/删除的跟随与清理由 Overlays 基座自动
 * 承担（element.changed 重定位、shape.remove 摘除、diagram.clear 清空），
 * 此处只挂三个增补时机（导入完成/创建/删除撤销）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Overlays from 'diagram-js/lib/features/overlays/Overlays';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type { DrillViewService } from './DrillView';
import { shapeMetaOf } from '../meta/ElementTypes';

const BADGE_TYPE = 'dmn-drill-badge';

// 角标骑缝右上角：18px 方标取 -9/-9 半出半入（overlays 定位语义：
// top/right 为到元素边的外偏移，负值向外）
const BADGE_POSITION = { top: -9, right: -9 };

// 蓝底白网格（用户截图定规）：亮蓝与画布主题色系解耦（导航角标恒定
 // 可辨），白格线三行两列=决策表记法缩样
const BADGE_SVG =
  '<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">' +
  '<rect x="0.75" y="0.75" width="16.5" height="16.5" rx="3" fill="#4d8fff"/>' +
  '<path d="M1 6.4 H17 M7.2 6.4 V17 M12.4 6.4 V17" stroke="#fff" stroke-width="1.5"/>' +
  '</svg>';

export class DrillBadgeBehavior {
  static $inject = ['eventBus', 'overlays', 'elementRegistry', 'drillView'];

  constructor(
    eventBus: EventBus,
    private readonly overlays: Overlays,
    private readonly elementRegistry: ElementRegistry,
    private readonly drillView: DrillViewService
  ) {
    eventBus.on('import.done', () => {
      for (const element of this.elementRegistry.getAll()) {
        this.addBadge(element);
      }
    });
    eventBus.on('commandStack.shape.create.executed', (event: any) => this.addBadge(event.context.shape));
    eventBus.on('commandStack.shape.delete.reverted', (event: any) => this.addBadge(event.context.shape));
  }

  /** 可下钻元素挂角标（幂等：同元素先摘再挂，防重复时机双挂） */
  addBadge(element: any): void {
    if (!element || element.waypoints) {
      return;
    }
    const meta = shapeMetaOf(element.businessObject?.$type ?? element.type);
    if (!meta?.drillable) {
      return;
    }
    this.overlays.remove({ element, type: BADGE_TYPE });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dmn-drill-badge';
    button.title = `编辑${meta.label}`;
    button.innerHTML = BADGE_SVG;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.drillView.open(element);
    });
    this.overlays.add(element, BADGE_TYPE, { position: BADGE_POSITION, html: button });
  }
}
