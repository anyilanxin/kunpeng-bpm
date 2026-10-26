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
 * 下钻视图（用户定规 2026-10-26 终版）：元素右上角蓝底白网格角标点击 →
 * **同一页面**进入该元素的决策内容编辑视图（决策表/boxed）——编辑视图以
 * 绝对定位层整面覆盖画布区（不新开 tab/路由，画布 DOM 保持挂载不动，
 * 无 display:none 视口计算陷阱）；「Edit DRD」返回 DRD 画布。
 *
 * 视图本体只是壳（工具栏+标题+内容挂载点），决策表/字面编辑器（G5）经
 * getContentHost() 接管内容区；打开/关闭经 drillView.opened/closed 事件
 * 通知（属性面板等宿主件据此切换上下文）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';

const VIEW_CLASS = 'dmn-drill-view';

export class DrillViewService {
  static $inject = ['eventBus', 'canvas'];

  private view: HTMLElement | null = null;
  private currentElement: any = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly canvas: Canvas
  ) {
    this.eventBus.on('dmn.destroy', () => this.teardown());
  }

  isOpen(): boolean {
    return this.view !== null;
  }

  /** 当前下钻目标元素（未下钻为 null） */
  getElement(): any {
    return this.currentElement;
  }

  open(element: any): void {
    if (!element?.id) {
      return;
    }
    if (this.isOpen()) {
      this.close();
    }
    this.view = this.buildView(element);
    (this.canvas.getContainer() as HTMLElement).appendChild(this.view);
    this.currentElement = element;
    this.eventBus.fire('drillView.opened', { element });
  }

  close(): void {
    if (!this.view) {
      return;
    }
    const element = this.currentElement;
    this.view.remove();
    this.view = null;
    this.currentElement = null;
    this.eventBus.fire('drillView.closed', { element });
  }

  /** 内容区挂载点（G5 决策表/字面编辑器接管） */
  getContentHost(): HTMLElement | null {
    return this.view?.querySelector<HTMLElement>('.dmn-drill-view-content') ?? null;
  }

  private buildView(element: any): HTMLElement {
    const view = document.createElement('div');
    view.className = VIEW_CLASS;

    const header = document.createElement('div');
    header.className = 'dmn-drill-view-header';

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'dmn-drill-back';
    back.textContent = '← Edit DRD';
    back.addEventListener('click', () => this.close());

    const title = document.createElement('span');
    title.className = 'dmn-drill-view-title';
    title.textContent = element.businessObject?.name ?? element.id;

    header.append(back, title);

    const content = document.createElement('div');
    content.className = 'dmn-drill-view-content';

    view.append(header, content);
    return view;
  }

  private teardown(): void {
    this.view?.remove();
    this.view = null;
    this.currentElement = null;
  }
}
