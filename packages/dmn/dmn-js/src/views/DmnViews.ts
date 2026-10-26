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
 * 多视图管理：DRD（画布）+ 各决策的表达式编辑视图（决策表/字面表达式）。
 *
 * 视图身份 = 语义元素（决策 bo.id）：视图不是独立文档，是同一语义树的不同
 * 投影。视图清单由文档派生（导入/元素增删后重算并广播 views.changed），切换
 * 只动宿主容器内的层显隐（画布层由 diagram-js 建，编辑器层本服务建），
 * 不清命令栈、不重导入——撤销栈跨视图共享同一语义树。
 *
 * 编辑器层为惰性单例容器：每次 open 重挂目标视图内容（编辑器自渲染），
 * DRD 激活时整层 display:none 收起。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { Injector } from 'didi';
import type { DmnDocumentState } from '../xml/DocumentState';

export type DmnViewKind = 'drd' | 'decisionTable' | 'literalExpression' | 'boxed';

export interface DmnView {
  /** 'drd' 或决策 bo.id */
  id: string;
  kind: DmnViewKind;
  name: string;
  /** 决策视图指向其 businessObject；DRD 视图为 null */
  element: any | null;
}

/** 表达式 $type → 视图类型（Boxed 五族入列；未识别表达式暂无编辑视图） */
const EXPRESSION_VIEWS: Record<string, DmnViewKind> = {
  'dmn:DecisionTable': 'decisionTable',
  'dmn:LiteralExpression': 'literalExpression',
  'dmn:Context': 'boxed',
  'dmn:Invocation': 'boxed',
  'dmn:Relation': 'boxed',
  'dmn:List': 'boxed',
  'dmn:FunctionDefinition': 'boxed'
};

export class DmnViews {
  static $inject = ['eventBus', 'canvas', 'injector', 'dmnDocumentState'];

  private activeId = 'drd';
  private views: DmnView[] = [];
  private editorLayer: HTMLElement | null = null;
  private currentEditor: { destroy(): void } | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly injector: Injector,
    private readonly state: DmnDocumentState
  ) {
    // 任何命令（含撤销重做）后重算清单：decisionLogic 的建/拆/类型切换走
    // updateModdleProperties（不另发事件），commandStack.changed 是全命令的
    // 单一汇合点。只重算不重建——活跃编辑器自监听命令栈重渲，此处重建会
    // 打断编辑焦点；活跃视图消失（决策被删/表达式被拆）或**类型切换**
    // （编辑器种类随 kind 变化）才重挂/回落 DRD。
    const recompute = (): void => {
      const before = this.views.find((v) => v.id === this.activeId);
      const hadActive = this.recompute();
      if (!hadActive && this.activeId !== 'drd') {
        this.open('drd');
        return;
      }
      const after = this.views.find((v) => v.id === this.activeId);
      if (before && after && before.kind !== after.kind) {
        this.remountActive();
      }
      this.eventBus.fire('views.changed', { views: this.views });
    };
    this.eventBus.on('commandStack.changed', recompute);
    // 导入=文档整体置换：重算并重挂（编辑器持旧 bo 引用需重建）
    this.eventBus.on('import.done', () => {
      const hadActive = this.recompute();
      if (!hadActive && this.activeId !== 'drd') {
        this.open('drd');
      } else {
        this.remountActive();
      }
      this.eventBus.fire('views.changed', { views: this.views });
    });
  }

  /** 视图清单：DRD 恒在首位，其后按文档序为各带可编辑表达式的决策 */
  list(): DmnView[] {
    return this.views;
  }

  getActive(): DmnView {
    return this.views.find((v) => v.id === this.activeId) ?? { id: 'drd', kind: 'drd', name: 'DRD', element: null };
  }

  /** 打开视图：DRD=收编辑器层亮画布层；决策=挂对应编辑器 */
  open(id: string): void {
    if (!this.views.some((v) => v.id === id)) {
      throw new Error(`视图不存在：${id}（可用：${this.views.map((v) => v.id).join(', ')}）`);
    }
    this.activeId = id;
    this.remountActive();
    this.eventBus.fire('view.changed', { view: this.getActive() });
  }

  private recompute(): boolean {
    const views: DmnView[] = [{ id: 'drd', kind: 'drd', name: 'DRD', element: null }];
    for (const bo of this.state.definitions.drgElement ?? []) {
      if (bo.$type !== 'dmn:Decision') {
        continue;
      }
      const kind = EXPRESSION_VIEWS[bo.decisionLogic?.$type ?? ''];
      if (!kind) {
        continue;
      }
      views.push({ id: bo.id, kind, name: bo.name || bo.id, element: bo });
    }
    this.views = views;
    return views.some((v) => v.id === this.activeId);
  }

  private remountActive(): void {
    const view = this.getActive();
    const layer = this.ensureEditorLayer();
    if (view.kind === 'drd') {
      this.destroyEditor();
      layer.style.display = 'none';
      this.canvas.getContainer().style.display = '';
      return;
    }
    this.destroyEditor();
    layer.style.display = '';
    this.canvas.getContainer().style.display = 'none';
    // 视图类型对应编辑器工厂经 injector 取（模块未装配则显式失败，不做兜底）
    const FACTORY_BY_KIND: Record<string, string> = {
      decisionTable: 'decisionTableEditorFactory',
      literalExpression: 'literalExpressionEditorFactory',
      boxed: 'boxedExpressionEditorFactory'
    };
    const editorFactory = this.injector.get<{ create(c: HTMLElement, bo: any): { destroy(): void } }>(
      FACTORY_BY_KIND[view.kind]
    );
    this.currentEditor = editorFactory.create(layer, view.element);
  }

  private destroyEditor(): void {
    this.currentEditor?.destroy();
    this.currentEditor = null;
  }

  /** 编辑器层挂宿主容器（画布层的兄弟节点），DRD 激活时隐藏 */
  private ensureEditorLayer(): HTMLElement {
    if (!this.editorLayer) {
      const host = this.canvas.getContainer().parentElement;
      if (!host) {
        throw new Error('画布容器无父节点，编辑器层无处挂载');
      }
      const layer = document.createElement('div');
      layer.className = 'dmn-editor-layer';
      layer.style.display = 'none';
      host.appendChild(layer);
      this.editorLayer = layer;
    }
    return this.editorLayer;
  }
}
