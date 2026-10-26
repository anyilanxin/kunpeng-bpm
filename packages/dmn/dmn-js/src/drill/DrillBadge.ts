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
 * 下钻角标（用户定规 2026-10-26 终版+截图校准）：可下钻元素（注册表
 * drillable：Decision/BKM）**元素内部左上角**蓝底角标，点击进同页面编辑
 * 视图。角标图形按元素类型区分（截图定规）：Decision=白网格（决策表）、
 * BKM=白花括号（boxed/字面表达式）。
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

// 元素内部左上角（用户定规：固定在元素内部左上角）——overlays 定位语义
// top/left 正值向内，距上/左各留 4px 视觉边距
const BADGE_POSITION = { top: 4, left: 4 };

// 蓝底白图形（用户截图定规）：亮蓝与画布主题色系解耦（导航角标恒定可辨）；
// 决策=三行两列网格（决策表记法缩样）、BKM=花括号（boxed/字面表达式记法）
const BADGE_ICON_BY_TYPE: Record<string, string> = {
  'dmn:Decision':
    '<path d="M1 6.4 H17 M7.2 6.4 V17 M12.4 6.4 V17" stroke="#fff" stroke-width="1.5"/>',
  'dmn:BusinessKnowledgeModel':
    '<path d="M7.2 4.2 C5.4 4.2 5.4 7 5.4 8 C5.4 9.4 4.6 10 3.4 10.2 C4.6 10.4 5.4 11 5.4 12.4 C5.4 13.4 5.4 16.2 7.2 16.2 M10.8 4.2 C12.6 4.2 12.6 7 12.6 8 C12.6 9.4 13.4 10 14.6 10.2 C13.4 10.4 12.6 11 12.6 12.4 C12.6 13.4 12.6 16.2 10.8 16.2" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
};

function badgeSvg(type: string): string {
  return (
    '<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">' +
    '<rect x="0.75" y="0.75" width="16.5" height="16.5" rx="3" fill="#4d8fff"/>' +
    (BADGE_ICON_BY_TYPE[type] ?? BADGE_ICON_BY_TYPE['dmn:Decision']) +
    '</svg>'
  );
}

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
    button.innerHTML = badgeSvg(element.businessObject?.$type ?? element.type);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.drillView.open(element);
    });
    this.overlays.add(element, BADGE_TYPE, { position: BADGE_POSITION, html: button });
  }
}
