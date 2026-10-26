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
 * DMN 编辑器视图（决策表/字面/BKM boxed）挂载点：以编辑器层覆盖画布区
 * （不进 canvas 图层，画布 DOM 保持挂载不动）；打开/关闭经
 * dmnViews.opened/closed 事件（属性面板/角标据此切换上下文）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import { buildViewHeader } from './backButton';

const VIEW_CLASS = 'dmn-editor-layer';

export class DmnViews {
  static $inject = ['eventBus', 'canvas'];

  private layer: HTMLElement | null = null;
  private currentElement: any = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly canvas: Canvas
  ) {
    this.eventBus.on('dmn.destroy', () => this.teardown());
  }

  isOpen(): boolean {
    return this.layer !== null;
  }

  getElement(): any {
    return this.currentElement;
  }

  /** 打开元素编辑视图；body 由调用方（编辑器渲染器）提供 */
  open(element: any, title: string, body: HTMLElement, rightSlot?: HTMLElement): void {
    if (!element?.id) {
      return;
    }
    if (this.isOpen()) {
      this.close();
    }
    this.layer = this.buildLayer(element, title, body, rightSlot);
    (this.canvas.getContainer() as HTMLElement).appendChild(this.layer);
    this.currentElement = element;
    this.eventBus.fire('dmnViews.opened', { element });
  }

  close(): void {
    if (!this.layer) {
      return;
    }
    const element = this.currentElement;
    this.layer.remove();
    this.layer = null;
    this.currentElement = null;
    this.eventBus.fire('dmnViews.closed', { element });
  }

  private buildLayer(element: any, title: string, body: HTMLElement, rightSlot?: HTMLElement): HTMLElement {
    const layer = document.createElement('div');
    layer.className = VIEW_CLASS;
    layer.append(buildViewHeader(title, () => this.close(), rightSlot));
    const content = document.createElement('div');
    content.className = 'dmn-editor-content';
    content.append(body);
    layer.append(content);
    return layer;
  }

  private teardown(): void {
    this.layer?.remove();
    this.layer = null;
    this.currentElement = null;
  }
}
