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
 * 面板布局监测：容器高度变化时驱动 palette 单列 ⇄ 双列自动切换。
 *
 * 引擎机制（diagram-js Palette）：`canvas.resized` → `_layoutChanged` →
 * `_needsCollapse(parent.clientHeight, entries)`——容器高不足时切
 * `.two-column`（94px 双列，高度自适应内容，无滚动条）；足够高时回到单列。
 * 但引擎**不自动监测容器尺寸**（canvas.resized 由宿主手动调），面板高度调整
 * 后切换不会发生——本服务补上监测，并按本组件条目结构修正高度估算。
 *
 * 估算覆写（引擎源码注释明示"改了 palette 样式须覆写 _needsCollapse"）：
 * 引擎把所有条目按 46px 行高估算，而本组件含 separator 条目（实占 11px：
 * margin 5 + padding-top 5 + 1px 分隔线），按 46 计会虚高一行导致能放下也误切
 * 双列。修正公式：普通条目 ×46 + separator ×11 + 边距 50（沿用引擎语义
 * top 20 + toggle 10 + bottom 20）。
 *
 * 三信号监听与 BpmnPopup 贴靠共用 util/Dom.observeBox（真实浏览器 window
 * resize / 支持 ResizeObserver 的环境 / 嵌入式 webview 两类事件都可能不派发
 * 时的轮询兜底）：签名比对通过才触发，轮询仅两次整数比较的量级。触发走公共
 * API `canvas.resized()`（顺带失效 viewbox 缓存，语义即"容器变了"）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type Palette from 'diagram-js/lib/features/palette/Palette';
import { observeBox } from '../util/Dom';

/** 普通条目行高（引擎 CSS 契约） */
const ENTRY_H = 46;
/** separator 条目实占高度：margin 5 + padding-top 5 + 1px 分隔线 */
const SEPARATOR_H = 11;
/** 上下留白与折叠钮空间：top 20 + toggle 10 + bottom 20（引擎语义） */
const MARGIN = 50;

export class BpmnPaletteLayout {
  static $inject = ['eventBus', 'canvas', 'palette'];

  constructor(eventBus: EventBus, canvas: Canvas, palette: Palette) {
    // 覆写高度估算（见文件头说明）：separator 条目按实占 11px 计
    (palette as any)._needsCollapse = (availableHeight: number, entries: Record<string, any>): boolean => {
      const list = Object.values(entries ?? {});
      const separators = list.filter((entry) => entry?.separator).length;
      const entriesHeight = (list.length - separators) * ENTRY_H + separators * SEPARATOR_H;
      return availableHeight < entriesHeight + MARGIN;
    };

    const container = canvas.getContainer();
    let signature = '';

    const check = () => {
      const el = container.querySelector('.djs-palette');
      if (!el) {
        // palette 尚未渲染/已随实例销毁移除：等待下一拍
        return;
      }
      const next = `${window.innerWidth}x${window.innerHeight}|${Math.round(container.clientWidth)}x${Math.round(container.clientHeight)}`;
      if (next === signature) {
        return;
      }
      signature = next;
      canvas.resized();
    };

    // 三信号监听（窗口 resize / 容器 ResizeObserver / 轮询兜底）统一走 observeBox
    const stopObserve = observeBox(container, check);

    eventBus.on('diagram.destroy', stopObserve);

    check();
  }
}

