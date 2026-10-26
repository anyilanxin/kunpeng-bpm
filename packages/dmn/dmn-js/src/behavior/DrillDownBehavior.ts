/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that licenses/ directories that accompany this code.
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
 * 下钻徽标：有可编辑表达式视图的元素（决策=decisionLogic 可识别、
 * BKM=encapsulatedLogic 存在）右下角挂 overlays 小方钮，点击进入该元素的
 * 表达式编辑视图（dmnViews.open）。判定单一事实源=DmnViews.viewIdFor。
 *
 * 徽标随命令栈（逻辑建拆/元素增删）与导入重扫全量重建——规模小（视图元素
 * 个位数），全量重建换单一同步路径；overlay id 记账后批量摘除。视图打开期间
 * 画布层 display:none，徽标自然不可见，无需显式联动。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type { DmnViews } from '../views/DmnViews';
import { toolIconHtml } from '../icons/ToolIcons';

export class DrillDownBehavior {
  static $inject = ['eventBus', 'overlays', 'elementRegistry', 'dmnViews', 'dmnI18n'];

  private overlayIds: string[] = [];

  constructor(
    eventBus: EventBus,
    private readonly overlays: any,
    private readonly elementRegistry: any,
    private readonly dmnViews: DmnViews,
    private readonly i18n: any
  ) {
    eventBus.on(['commandStack.changed', 'import.done'], () => this.resync());
    this.resync();
  }

  private resync(): void {
    for (const id of this.overlayIds) {
      this.overlays.remove(id);
    }
    this.overlayIds = [];
    for (const shape of this.elementRegistry.filter((e: any) => e.type !== 'dmn:Definitions' && e.businessObject)) {
      const viewId = this.dmnViews.viewIdFor(shape.businessObject);
      if (!viewId) {
        continue;
      }
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'dmn-drill-badge';
      badge.title = this.i18n.t('打开表达式视图');
      badge.innerHTML = toolIconHtml('grid', 13);
      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        this.dmnViews.open(viewId);
      });
      this.overlayIds.push(
        this.overlays.add(shape, 'dmn-drill', {
          position: { bottom: -1, right: -1 },
          html: badge
        })
      );
    }
  }
}
