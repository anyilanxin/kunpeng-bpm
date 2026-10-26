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
 * 模式服务：edit（完整编辑）/ preview（只读预览）。三层防线与 bpmn-js 内核
 * 同款：UI 层（容器标记类隐藏编辑面板）/ 规则层（P2 DmnRules 全否决）/
 * 直编层（P2 Provider 拒绝激活）。保留：选择、缩放/平移导航、导入导出。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { Injector } from 'didi';

export type ModelerMode = 'edit' | 'preview';

/** 预览模式标记类（挂 canvas 容器，styles/dmn-js.css 据此隐藏编辑 UI） */
export const PREVIEW_CLASS = 'dmn-preview-mode';

export class DmnMode {
  static $inject = ['eventBus', 'canvas', 'injector', 'config.mode'];

  private mode: ModelerMode;

  // palette/contextPad 经 injector 可选获取（只读底座不装配编辑面板，硬注入
  // 构造期 No provider 崩溃）
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
