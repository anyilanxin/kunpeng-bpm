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
 * that accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 下钻角标（用户定规 2026-10-26）：可下钻元素**元素内部左上角**蓝底角标
 * （{top:4,left:4}），点击经 DmnViews 进对应编辑视图（Decision=决策表/
 * 字面、BKM=boxed 五族/字面）。Empty 模式无角标（isDrillableElement）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Overlays from 'diagram-js/lib/features/overlays/Overlays';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import { isDrillableElement, shapeMetaOf } from '../meta/ElementTypes';
import { dmnIconBody, type DmnIconName } from '../icons/DmnIconSet';
import type { DmnViews } from '../views/DmnViews';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnModeling } from '../command/DmnModeling';
import { openDecisionEditor, openBkmEditor } from '../views/ExpressionViews';

const BADGE_TYPE = 'dmn-drill-badge';

// 角标图形按内容型（资产 32 视框）：决策=网格（决策表）、BKM=罐形（boxed/字面）
const BADGE_ICON_BY_TYPE: Record<string, DmnIconName> = {
  'dmn:Decision': 'drd',
  'dmn:BusinessKnowledgeModel': 'business-knowledge'
};

function badgeSvg(type: string): string {
  const name = BADGE_ICON_BY_TYPE[type];
  return (
    '<svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">' +
    '<rect x="0.75" y="0.75" width="30.5" height="30.5" rx="5" fill="#4d8fff"/>' +
    `<g transform="translate(3.5 3.5) scale(0.78)" fill="#fff">${name ? dmnIconBody(name) : ''}</g>` +
    '</svg>'
  );
}

export class DrillBadgeBehavior {
  static $inject = ['eventBus', 'overlays', 'elementRegistry', 'dmnViews', 'dmnFactory', 'modeling'];

  constructor(
    eventBus: EventBus,
    private readonly overlays: Overlays,
    private readonly elementRegistry: ElementRegistry,
    private readonly views: DmnViews,
    private readonly factory: DmnFactory,
    private readonly modeling: DmnModeling
  ) {
    eventBus.on('import.done', () => {
      for (const element of this.elementRegistry.getAll()) {
        this.refresh(element);
      }
    });
    eventBus.on('element.changed', (event: any) => this.refresh(event.element));
  }

  /** 可见性重算（幂等）：该有则补挂，不该有则摘除 */
  private refresh(element: any): void {
    if (!element || element.waypoints || element.labelTarget) {
      return;
    }
    const found = this.overlays.get({ element, type: BADGE_TYPE });
    const has = Array.isArray(found) ? found.length > 0 : !!found;
    if (isDrillableElement(element)) {
      if (!has) {
        this.addBadge(element);
      }
    } else if (has) {
      this.overlays.remove({ element, type: BADGE_TYPE });
    }
  }

  private addBadge(element: any): void {
    const type = element.businessObject?.$type ?? element.type;
    if (!BADGE_ICON_BY_TYPE[type]) {
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dmn-drill-badge';
    button.title = `编辑${shapeMetaOf(type)?.label ?? '元素'}`;
    button.innerHTML = badgeSvg(type);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const bo = element.businessObject;
      if (bo?.$type === 'dmn:Decision') {
        openDecisionEditor(element, { views: this.views, factory: this.factory, modeling: this.modeling });
      } else if (bo?.$type === 'dmn:BusinessKnowledgeModel') {
        openBkmEditor(element, { views: this.views, factory: this.factory, modeling: this.modeling });
      }
    });
    this.overlays.add(element, BADGE_TYPE, { position: { top: 4, left: 4 }, html: button });
  }
}
