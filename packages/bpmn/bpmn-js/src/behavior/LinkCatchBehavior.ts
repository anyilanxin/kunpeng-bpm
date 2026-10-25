/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License version 2 only, as published by
 * the Free Software Foundation. The copyright holder designates this
 * particular file as subject to the "Classpath" exception as provided in the
 * LICENSE file and directories/ that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * version 2 for more details (a copy of the GNU General Public License v2 is
 * included in the licenses/ directory).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 链接捕获事件入线约束（行为侧）：morph 成链接捕获时既有入线整体断开。
 * 规则侧（BpmnRules 顺序流校验）另行拒绝新入线/重连接入线，两侧互补——
 * 规则管"不能再连进来"，本行为管"已连进来的在成其为链接捕获时清场"。
 * 挂命令生命周期 preExecute 钩子（CommandStack 只放行 pre/post 钩子内的
 * 嵌套命令，execute/revert 相位发起即抛"illegal invocation"；此时元素尚为
 * 旧形态，判据取 context.target）——断线与 morph 同处一个 action，一次撤销
 * 全恢复。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Modeling from 'diagram-js/lib/features/modeling/Modeling';

export class LinkCatchBehavior {
  static $inject = ['eventBus', 'modeling'];

  constructor(eventBus: EventBus, private readonly modeling: Modeling) {
    eventBus.on('commandStack.bpmnReplace.preExecute', (event: any) => {
      const { element, target } = event.context;
      if (target.type !== 'bpmn:IntermediateCatchEvent' || target.eventSymbol !== 'link') {
        return;
      }
      // 走 elements.delete（与 UI 删除同命令）：语义清理/DI 摘除/标签级联
      // 全在 BpmnUpdater 的该命令钩子上；connection.delete 无语义钩子不可用
      const incoming = [...(element.incoming ?? [])];
      if (incoming.length > 0) {
        this.modeling.removeElements(incoming);
      }
    });
  }
}
