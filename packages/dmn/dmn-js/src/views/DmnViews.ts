/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 */
/**
 * DMN 编辑器视图挂载点：以编辑器层覆盖画布区（不进 canvas 图层，画布 DOM
 * 保持挂载不动）；打开/关闭经 dmnViews.opened/closed 事件（属性面板/角标
 * 据此切换上下文）。层内首行为概览工具条（Edit DRD / Open overview），
 * 返回通道由工具条 Edit DRD 承担。
 * 视图提供者注册表（2026-10-27 模块化）：每个下钻内容=一个内部插件模块
 * （views/DmnViewModules.ts）经 registerViewProvider 注册；下钻入口只调
 * openView(element) 按优先级取首个 matches 的提供者，编辑器上下文（ctx）
 * 由本服务统一组装——入口不再认识具体编辑器。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnModeling } from '../command/DmnModeling';
import type { EditorDeps } from './shared/types';
import { buildOverviewChrome, type OverviewChrome } from './OverviewBar';

const VIEW_CLASS = 'dmn-editor-layer';

/** 下钻视图提供者（模块注册单元）：matches 判定入参为画布元素 */
export interface ViewProvider {
  id: string;
  /** 数值大者优先（diagram-js 优先级协议同向）；缺省 1000 */
  priority?: number;
  matches(element: any): boolean;
  open(element: any, ctx: EditorDeps): void;
}

export class DmnViews {
  static $inject = ['eventBus', 'canvas', 'dmnFactory', 'modeling'];

  private layer: HTMLElement | null = null;
  private currentElement: any = null;
  private chrome: OverviewChrome | null = null;
  private providers: ViewProvider[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly factory: DmnFactory,
    private readonly modeling: DmnModeling
  ) {
    this.eventBus.on('dmn.destroy', () => this.teardown());
  }

  /** 模块注册视图提供者（同 id 后到者覆写） */
  registerViewProvider(provider: ViewProvider): void {
    const idx = this.providers.findIndex((p) => p.id === provider.id);
    if (idx >= 0) {
      this.providers[idx] = provider;
    } else {
      this.providers.push(provider);
    }
    this.providers.sort((a, b) => (b.priority ?? 1000) - (a.priority ?? 1000));
  }

  /** 下钻入口：按优先级取首个 matches 的提供者开视图；无匹配返回 false */
  openView(element: any): boolean {
    const provider = this.providers.find((p) => p.matches(element));
    if (!provider) {
      return false;
    }
    provider.open(element, {
      views: this,
      factory: this.factory,
      modeling: this.modeling,
      eventBus: this.eventBus
    });
    return true;
  }

  isOpen(): boolean {
    return this.layer !== null;
  }

  getElement(): any {
    return this.currentElement;
  }

  /** 打开元素编辑视图；body 由视图提供者提供 */
  open(element: any, body: HTMLElement): void {
    if (!element?.id) {
      return;
    }
    if (this.isOpen()) {
      this.close();
    }
    this.layer = this.buildLayer(element, body);
    (this.canvas.getContainer() as HTMLElement).appendChild(this.layer);
    this.currentElement = element;
    this.eventBus.fire('dmnViews.opened', { element });
  }

  close(): void {
    if (!this.layer) {
      return;
    }
    const element = this.currentElement;
    this.chrome?.destroy();
    this.chrome = null;
    this.layer.remove();
    this.layer = null;
    this.currentElement = null;
    this.eventBus.fire('dmnViews.closed', { element });
  }

  private buildLayer(element: any, body: HTMLElement): HTMLElement {
    const layer = document.createElement('div');
    layer.className = VIEW_CLASS;
    this.chrome = buildOverviewChrome(() => this.close(), {
      eventBus: this.eventBus,
      canvas: this.canvas
    });
    this.chrome.contentSlot.append(body);
    layer.append(this.chrome.toolbar, this.chrome.bodyRow);
    return layer;
  }

  private teardown(): void {
    this.chrome?.destroy();
    this.chrome = null;
    this.layer?.remove();
    this.layer = null;
    this.currentElement = null;
  }
}
