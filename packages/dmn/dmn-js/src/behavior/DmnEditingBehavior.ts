/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
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
 * 直编行为（单源实现，双击/追加/面板三路径同享）：
 * - 编辑期藏已渲染名字：透明框下双文本重影——activate 给被编元素挂
 *   label-editing marker（CSS 藏 .djs-visual text），complete/cancel 摘除
 *   （complete 时 updateLabel 重渲新文本天然可见）；
 * - 落地即编：palette 拖放（create.end，优先级 500 排基座建形处理者之后
 *   ——context.shape 由基座回填，且基座取消分支返回 false 截断传播天然不
 *   触发）与追加（autoPlace.end）落形即进名称编辑；连线元素不触发（连线
 *   依附两端存在且无名称可编）；
 * - TextBox 基座只设选区从不调 focus()（"落地即可打字"要求 activate 事件
 *   后显式聚焦 .djs-direct-editing-content——bpmn 线已立契约）。
 */
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';

export class DmnEditingBehavior extends CommandInterceptor {
  static $inject = ['eventBus', 'canvas', 'directEditing'];

  constructor(eventBus: EventBus, private readonly canvas: Canvas, private readonly directEditing: any) {
    super(eventBus);

    eventBus.on('directEditing.activate', (event: any) => {
      const element = event.active.element;
      if (element) {
        this.canvas.addMarker(element, 'label-editing');
      }
      this.focusContent();
    });
    for (const hook of ['directEditing.complete', 'directEditing.cancel']) {
      eventBus.on(hook, (event: any) => {
        const element = event.active?.element;
        if (element) {
          this.canvas.removeMarker(element, 'label-editing');
        }
      });
    }

    // 落地即编：palette 拖放。500 < 基座建形处理者（1000，先执行）——
    // 悬停取消等分支被基座截断时不会走到这里
    eventBus.on('create.end', 500, (event: any) => {
      const shape = event.context.shape;
      if (shape && !shape.waypoints && !event.cancel) {
        this.directEditing.activate(shape);
      }
    });

    // 落地即编：追加（autoPlace 平铺载荷 shape；连线/弯点手势不经此）
    eventBus.on('autoPlace.end', (event: any) => {
      const shape = event.shape;
      if (shape && !shape.waypoints) {
        this.directEditing.activate(shape);
      }
    });
  }

  /** 基座 TextBox 从不调 focus()——落地即可打字需显式聚焦编辑框 */
  private focusContent(): void {
    requestAnimationFrame(() => {
      const container = (this.canvas.getContainer() as HTMLElement).querySelector<HTMLElement>(
        '.djs-direct-editing-content'
      );
      container?.focus();
    });
  }
}
