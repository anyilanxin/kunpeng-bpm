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
 * 编辑态、无激活工具时把画布容器空白处的左键按下转成套索工具拖拽
 * （lassoTool.activateLasso + autoActivate=false——阈值启动：位移超过基座
 * 阈值才出现框选视觉，抬起即选区生效）。
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

    // 框选圈人只按元素坐标比对，隐藏态外部标签（element.hidden，gfx 被
    // GraphicsFactory 置 display:none）会被无声圈进选区——其 DOM 矩形退化为
    // (0,0,0,0)，基座 ContextPad 多选定位的联合包围盒随之落到画布外（混合
    // 选区 pad "消失"的根因）。不可见元素本就无从单独交互，在基座 lasso.end
    // （优先级 0，读取 marked 生效选区）之前把隐藏元素从 marked 剔除。
    eventBus.on('lasso.end', 100, (event: any) => {
      const marked = event.context?.marked;
      if (!(marked instanceof Set)) {
        return;
      }
      for (const element of marked) {
        if (element.hidden) {
          marked.delete(element);
        }
      }
    });

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
      // 无框选视觉，位移超过基座阈值后才真正启动框选（点击空白=清选不变）。
      // 必须用 activateLasso（工具前缀拖拽）而非 activateSelection：后者是
      // palette 套索钮的两段式武装流——其前缀事件无圈选处理者，释放时还会
      // activateLasso(originalEvent, autoActivate=true) 再武装出鼠标已抬起的
      // 幽灵套索，随后的移动/点击会以任意圈选结果覆盖刚完成的选区。
      lassoTool.activateLasso(event, false);
    });
  }
}
