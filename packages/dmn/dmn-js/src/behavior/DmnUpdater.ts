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
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * for more details (a copy is included in the licenses/ directory that
 * accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 语义同步器门面（画布 → 语义树/DI 单向同步）：事件订阅壳，分发至三协作域
 * （updater/Adoption 挂接 · updater/DiSync DI 同步 · updater/Reconcile DS 调和）。
 * 服务名 dmnUpdater 与导出类名不变（宿主契约），2026-10-29 T4 拆分。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnDocumentState } from '../xml/DocumentState';
import { DmnDiSync } from './updater/DiSync';
import { DmnAdoption } from './updater/Adoption';
import { DmnServiceReconcile } from './updater/Reconcile';

export class DmnUpdater {
  static $inject = ['eventBus', 'dmnFactory', 'dmnDocumentState', 'canvas'];

  private readonly diSync: DmnDiSync;
  private readonly adoption: DmnAdoption;
  private readonly reconcile: DmnServiceReconcile;

  constructor(
    eventBus: EventBus,
    private readonly factory: DmnFactory,
    state: DmnDocumentState,
    canvas: any
  ) {
    this.diSync = new DmnDiSync(factory, state);
    this.reconcile = new DmnServiceReconcile(factory, state, canvas);
    this.adoption = new DmnAdoption(factory, state, this.diSync);

    // 命令栈相位事件=commandStack.<命令>.<相位>（diagram-js 15 一律带
    // commandStack. 前缀，CommandInterceptor.on 内部同款拼接；裸 '命令.相位'
    // 是永不派发的死监听）。elements.changed 是 CommandStack 直发的裸事件，不此前缀
    eventBus.on('commandStack.shape.create.executed', (event: any) => {
      this.adoption.adoptShape(event.context.shape);
      this.reconcile.reconcile();
    });
    eventBus.on('commandStack.shape.create.reverted', (event: any) => {
      this.adoption.orphanShape(event.context.shape);
      this.reconcile.reconcile();
    });
    eventBus.on('commandStack.connection.create.executed', (event: any) => this.adoption.wireConnection(event.context));
    eventBus.on('commandStack.connection.create.reverted', (event: any) => this.adoption.unwireConnection(event.context.connection));
    eventBus.on('commandStack.connection.reconnect.executed', (event: any) => this.adoption.rewire(event));
    // 删除走 shape.delete/connection.delete 而非 elements.delete：级联删除的
    // 进出连线只以嵌套 connection.delete 出现（elements.delete.context.elements
    // 不含级联件），且 revert 对称逐件派发——撤销删除的语义回挂在同通道闭环。
    // 摘除必须挂 .executed 而非 .postExecuted：redo 只重放 execute/executed
    // （pre/postExecute(d) 均不重放），挂 postExecuted 会让重做删除漏摘语义
    eventBus.on('commandStack.shape.delete.executed', (event: any) => {
      this.adoption.orphanShape(event.context.shape);
      this.reconcile.reconcile();
      this.factory.destroy(event.context.shape.businessObject);
    });
    eventBus.on('commandStack.shape.delete.reverted', (event: any) => {
      this.factory.reclaim(event.context.shape.businessObject);
      this.adoption.adoptShape(event.context.shape);
      this.reconcile.reconcile();
    });
    eventBus.on('commandStack.connection.delete.executed', (event: any) => {
      this.adoption.unwireConnection(event.context.connection);
      this.factory.destroy(event.context.connection.businessObject);
    });
    eventBus.on('commandStack.connection.delete.reverted', (event: any) => {
      this.factory.reclaim(event.context.connection.businessObject);
      this.adoption.rewireConnection(event.context.connection);
    });
    eventBus.on('elements.changed', (event: any) => {
      this.diSync.syncElements(event.elements);
      this.reconcile.reconcile();
    });
  }
}
