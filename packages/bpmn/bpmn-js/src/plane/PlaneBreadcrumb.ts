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
 * 平面面包屑：画布容器左上角的层级路径（主平面名 › 子流程名 › …），祖先段
 * 可点回跳、当前段加重。主平面（栈深 1）隐藏。名称取 bo.name，未命名回退 id
 * （与参照截图一致）。重渲触发：plane.changed（导航）+ commandStack.changed
 * （重命名即时生效）；DOM 全量重建（节点数个位、无内部状态，重建即收敛）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { PlaneService } from './PlaneService';

export class PlaneBreadcrumb {
  static $inject = ['eventBus', 'canvas', 'planeService'];

  private readonly container: HTMLElement;

  constructor(eventBus: EventBus, canvas: Canvas, private readonly planeService: PlaneService) {
    this.container = document.createElement('div');
    this.container.className = 'bpmn-plane-breadcrumb';
    this.container.hidden = true;
    (canvas.getContainer() as HTMLElement).appendChild(this.container);

    eventBus.on('plane.changed', () => this.render());
    // 名称编辑（updateProperties）等命令后的即时回显
    eventBus.on('commandStack.changed', () => this.render());
  }

  private render(): void {
    const stack = this.planeService.getStack();
    if (stack.length <= 1) {
      this.container.hidden = true;
      this.container.replaceChildren();
      return;
    }
    this.container.hidden = false;
    const nodes: Node[] = [];
    stack.forEach((frame, index) => {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.className = 'bpmn-plane-breadcrumb-separator';
        separator.textContent = '›';
        nodes.push(separator);
      }
      const isCurrent = index === stack.length - 1;
      let crumb: HTMLElement;
      if (isCurrent) {
        const span = document.createElement('span');
        crumb = span;
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.addEventListener('click', () => this.planeService.upTo(index));
        crumb = button;
      }
      crumb.className = 'bpmn-plane-breadcrumb-crumb' + (isCurrent ? ' current' : '');
      crumb.textContent = frame.bo?.name || frame.bo?.id || '';
      crumb.title = crumb.textContent;
      nodes.push(crumb);
    });
    this.container.replaceChildren(...nodes);
  }
}
