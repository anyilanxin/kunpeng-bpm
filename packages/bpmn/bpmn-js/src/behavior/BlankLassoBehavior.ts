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
 * 空白拖拽即框选（建模器惯例）：基座空白 mousedown 无任何拖拽动作——框选必须
 * 先点面板「套索工具」或按住 Shift 在元素上按下，多选门槛过高。本行为在
 * 编辑态、无激活工具时把画布容器空白处的左键按下转成套索框选
 * （lassoTool.activateSelection autoActivate——按下即进入拖拽，移动圈选、
 * 抬起完成选择）。
 *
 * 让路规则：按下目标在元素图形（.djs-element）上→元素交互（移动/选中/边界
 * 挂靠）；在悬浮件（palette/context pad/弹框/工具栏/overlays/直编框）上→
 * 其自身交互。任一激活工具（抓手/套索/空间/连线/全局连线）时不抢——工具
 * 各自的拖拽语义优先。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { Injector } from 'didi';
import type { BpmnMode } from '../mode/BpmnMode';

/** 空白判定外的悬浮件容器（按下不构成画布空白交互） */
const SUSPENDED_SELECTORS = [
  '.djs-element',
  '.djs-palette',
  '.djs-context-pad',
  '.djs-popup',
  '.djs-overlays',
  '.djs-direct-editing-parent',
  '.bpmn-toolbar'
].join(',');

/** 激活时不抢空白按下的工具（各自拖拽语义优先） */
const YIELDING_TOOLS = ['hand', 'lasso', 'space', 'connect', 'global-connect'];

export class BlankLassoBehavior {
  static $inject = ['eventBus', 'canvas', 'injector', 'bpmnMode'];

  constructor(
    eventBus: EventBus,
    canvas: Canvas,
    injector: Injector,
    private readonly bpmnMode: BpmnMode
  ) {
    // 编辑服务/套索均可能缺席（只读底座、自拼裁剪）——非严格解析，缺则整组不建
    const lassoTool = injector.get<any>('lassoTool', false);
    const toolManager = injector.get<any>('toolManager', false);
    if (!lassoTool) {
      return;
    }

    (canvas.getContainer() as HTMLElement).addEventListener('mousedown', (event: MouseEvent) => {
      if (event.button !== 0 || !this.bpmnMode.isEditable()) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest(SUSPENDED_SELECTORS)) {
        return;
      }
      if (toolManager && YIELDING_TOOLS.some((tool) => toolManager.isActive(tool))) {
        return;
      }
      // autoActivate=false：按下不动（纯点击）不进框选态——无 crosshair 光标/
      // 无框选视觉，位移超过基座阈值后才真正启动框选（点击空白=清选不变）
      lassoTool.activateSelection(event, false);
    });
  }
}
