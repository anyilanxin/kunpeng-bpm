/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and directories/ that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included with the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License
 * version 2 with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 直编触发行为：双击元素、新建形状即激活标签直接编辑（可被插件覆盖的
 * 独立行为）。
 *
 * 新建即命名（2026-10-25 用户定规）：palette 拖放（create.end）与追加/
 * 注记（autoPlace.end）落形后立即进入编辑态；连线创建不触发——连线依附
 * 两端元素存在，命名非首步。弹框「创建」放置是 modeling 直调不经事件，
 * 在 BpmnElementMenuProvider 建形后直调激活（同一语义）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';

export class LabelBehavior {
  static $inject = ['eventBus', 'directEditing'];

  constructor(eventBus: EventBus, private readonly directEditing: any) {
    eventBus.on('element.dblclick', 1200, (event: any) => {
      this.directEditing.activate(event.element);
    });
    // TextBox 只设选区不显式聚焦（基座库无 focus 调用）：真实点击路径用户
    // 会点进框内才可打字，创建即编要求落地即可输入——激活事件（框已建）
    // 后统一显式聚焦，双击/追加/弹框放置三路径同源
    eventBus.on('directEditing.activate', () => {
      document.querySelector<HTMLElement>('.djs-direct-editing-content')?.focus();
    });
    // create.end 基座处理者（默认 1000）在监听内真正建形并回填
    // context.shape，本监听取 500 排其后才能拿到画布元素；基座取消分支
    // （canExecute false / 无 target）返回 false 截断传播，天然只在成功
    // 落形时触发
    eventBus.on('create.end', 500, (event: any) => {
      this.editCreated(event.context?.shape);
    });
    // autoPlace.end 平铺载荷（source/shape），appendShape 建形后同步发出
    eventBus.on('autoPlace.end', (event: any) => {
      this.editCreated(event.shape);
    });
  }

  private editCreated(shape: any): void {
    if (!shape || shape.waypoints || shape.labelTarget) {
      return;
    }
    this.directEditing.activate(shape);
  }
}
