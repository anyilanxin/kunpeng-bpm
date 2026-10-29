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
 * 下钻视图三模块（内部插件，对齐 bpmn 线插件装配契约）：每个下钻内容
 * = 一个自包含 didi 模块（__init__ 急切注册视图提供者）；装配恒装
 * DmnCoreModule（2026-10-27 用户裁定：三视图恒装、宿主不裁剪——模块化
 * 价值在注册表去耦，新视图形态=单模块单点接入）。
 * 下钻入口（DrillBadge）只调 DmnViews.openView 查注册表，不认识具体编辑器。
 */
import type { ModuleDeclaration } from 'didi';
import type { DmnViews, ViewProvider } from './DmnViews';
import type { EditorDeps } from './shared/types';
import { el } from './shared/dom';
import { mountDecisionTable } from './decision-table';
import { openLiteralView } from './LiteralView';
import { openBoxedView } from './BoxedView';

/** Decision+DecisionTable → 决策表（table-js 底座） */
class DecisionTableProvider {
  static $inject = ['dmnViews'];

  constructor(views: DmnViews) {
    views.registerViewProvider({
      id: 'decision-table',
      priority: 2000,
      matches(element) {
        const bo = element?.businessObject;
        return bo?.$type === 'dmn:Decision' && bo.decisionLogic?.$type === 'dmn:DecisionTable';
      },
      open(element, ctx: EditorDeps) {
        const bo = element.businessObject;
        const body = el('div', 'dmn-decision-editor');
        ctx.views.open(element, body);
        const host = el('div', 'dmn-tablejs-host');
        body.append(host);
        let tableView: { rebuild: () => void; destroy: () => void } | null = mountDecisionTable(
          host,
          bo.decisionLogic,
          { factory: ctx.factory, modeling: ctx.modeling, eventBus: ctx.eventBus }
        );
        const onClosed = (): void => {
          tableView?.destroy();
          tableView = null;
          ctx.eventBus.off('dmnViews.closed', onClosed);
        };
        ctx.eventBus.on('dmnViews.closed', onClosed);
      }
    } satisfies ViewProvider);
  }
}

/** Decision 非表形态（Literal/Context 等四族/空态）→ 字面视图（占位+形态切换） */
class LiteralProvider {
  static $inject = ['dmnViews'];

  constructor(views: DmnViews) {
    views.registerViewProvider({
      id: 'decision-literal',
      priority: 1000,
      matches(element) {
        const bo = element?.businessObject;
        return bo?.$type === 'dmn:Decision' && !!bo.decisionLogic && bo.decisionLogic.$type !== 'dmn:DecisionTable';
      },
      open(element, ctx: EditorDeps) {
        openLiteralView(element, ctx);
      }
    } satisfies ViewProvider);
  }
}

/** BKM+encapsulatedLogic → boxed 视图 */
class BoxedProvider {
  static $inject = ['dmnViews'];

  constructor(views: DmnViews) {
    views.registerViewProvider({
      id: 'bkm-boxed',
      priority: 1000,
      matches(element) {
        const bo = element?.businessObject;
        return bo?.$type === 'dmn:BusinessKnowledgeModel' && !!bo.encapsulatedLogic;
      },
      open(element, ctx: EditorDeps) {
        openBoxedView(element, ctx);
      }
    } satisfies ViewProvider);
  }
}

export const DmnDecisionTableModule: ModuleDeclaration = {
  __init__: ['dmnDecisionTableProvider'],
  'dmnDecisionTableProvider': ['type', DecisionTableProvider]
};

export const DmnLiteralViewModule: ModuleDeclaration = {
  __init__: ['dmnLiteralViewProvider'],
  'dmnLiteralViewProvider': ['type', LiteralProvider]
};

export const DmnBoxedViewModule: ModuleDeclaration = {
  __init__: ['dmnBoxedViewProvider'],
  'dmnBoxedViewProvider': ['type', BoxedProvider]
};
