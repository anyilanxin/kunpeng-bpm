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
 * version 2 for more details (a copy is included in the licenses/ directory that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 模式服务：edit（完整编辑）/ preview（只读预览）。
 *
 * preview 的语义是三层防线，缺一不可：
 * 1. UI 层——palette / context pad 隐藏（容器挂 bpmn-preview-mode 类，
 *    styles/bpmn-js.css 隐藏规则），Provider 层同时返回空条目；
 * 2. 规则层——BpmnRules 对全部编辑动作（移动/创建/连线/缩放/删除/对齐/分布）一律否决，
 *    拖拽、套索移动、空间工具等交互即使绕过 UI 也无法改动模型；
 * 3. 直编层——LabelEditingProvider 拒绝激活。
 * 保留能力：选择（供属性面板等宿主读取当前元素）、缩放/平移导航、导入导出。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { Injector } from 'didi';

export type ModelerMode = 'edit' | 'preview';

/** 预览模式标记类（挂在 canvas 容器上，样式层据此隐藏编辑 UI） */
export const PREVIEW_CLASS = 'bpmn-preview-mode';

export class BpmnMode {
  static $inject = ['eventBus', 'canvas', 'injector', 'config.mode'];

  private mode: ModelerMode;

  // palette/contextPad 经 injector 可选获取（Viewer 底座不装配编辑面板，
  // 硬注入会在构造期 No provider 崩溃；connectionDocking 同款降级模式）
  private readonly palette: any;
  private readonly contextPad: any;

  constructor(
    private readonly eventBus: EventBus,
    private readonly canvas: Canvas,
    injector: Injector,
    initial?: string
  ) {
    this.palette = injector.get('palette', false);
    this.contextPad = injector.get('contextPad', false);
    if (initial !== undefined && initial !== 'edit' && initial !== 'preview') {
      throw new Error(`mode 仅接受 'edit' | 'preview'，收到：${initial}`);
    }
    this.mode = initial === 'preview' ? 'preview' : 'edit';
    this.applyClass();
  }

  get(): ModelerMode {
    return this.mode;
  }

  isEditable(): boolean {
    return this.mode === 'edit';
  }

  set(mode: ModelerMode): void {
    if (mode !== 'edit' && mode !== 'preview') {
      throw new Error(`mode 仅接受 'edit' | 'preview'，收到：${mode}`);
    }
    if (mode === this.mode) {
      return;
    }
    this.mode = mode;
    this.applyClass();
    // 已打开的编辑面板即刻收起；切回编辑时面板恢复（Viewer 底座无面板则跳过）
    if (mode === 'preview') {
      this.palette?.close();
      this.contextPad?.close();
    } else {
      this.palette?.open();
    }
    this.eventBus.fire('mode.changed', { mode });
  }

  private applyClass(): void {
    this.canvas.getContainer().classList.toggle(PREVIEW_CLASS, this.mode === 'preview');
  }
}
