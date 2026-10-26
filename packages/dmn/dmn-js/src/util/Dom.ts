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
 * DOM 操作样板收敛：与模型/命令无关的纯 DOM 工具（手柄裁剪、尺寸三信号监听等）。
 */

/** 查询并移除文档中全部匹配节点 */
export function queryRemoveAll(selector: string): void {
  document.querySelectorAll(selector).forEach((n) => n.remove());
}

/** resize 手柄方向全集（diagram-js ResizeHandles 八向） */
const RESIZE_DIRECTIONS = ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'] as const;

/**
 * resize 手柄裁剪：只保留 keepDirs 中列出的方向字母（如 'we'/'ns'），其余移除。
 * 手柄节点按方向挂 .djs-resizer-{dir} 类；diagram-js 只为单选元素建手柄且
 * 每次 selection.changed 先清空手柄层，按方向移除与按"元素+方向"移除同效。
 */
export function trimResizeHandles(keepDirs: string): void {
  for (const dir of RESIZE_DIRECTIONS) {
    if (!keepDirs.includes(dir)) {
      queryRemoveAll(`.djs-resizer-${dir}`);
    }
  }
}

/** 轮询间隔：150ms 肉眼连续（≤1/6 秒级），回调仅两次量测/整数比较的开销 */
const POLL_MS = 150;

/** 尺寸三信号监听（窗口 resize / ResizeObserver / 150ms 轮询兜底）：返回停止函数。
 * 弹框贴靠与面板单双列切换共用；签名回调形态由调用方自定。
 * 轮询兜底：部分嵌入容器（如 IAB webview）前两类事件均不派发，布局变化可量测、仅事件缺失。 */
export function observeBox(el: Element, onSignal: () => void): () => void {
  window.addEventListener('resize', onSignal);
  const observer = new ResizeObserver(onSignal);
  observer.observe(el);
  const timer = window.setInterval(onSignal, POLL_MS);
  return () => {
    window.removeEventListener('resize', onSignal);
    observer.disconnect();
    window.clearInterval(timer);
  };
}
