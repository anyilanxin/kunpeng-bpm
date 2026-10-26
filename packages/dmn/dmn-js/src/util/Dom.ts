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
 * DOM 观察工具（与 bpmn 线 util/Dom 同款契约）：容器尺寸响应三信号并行
 * ——window resize / ResizeObserver(容器) / 会话期轮询兜底（停渲 webview
 * 下前两者均不派发，布局变化可量测，仅事件缺失）。
 */

/** 轮询周期：视觉上实时、性能上可忽略 */
const POLL_MS = 250;

/** 容器/窗口尺寸变化信号（onSignal 可能重复触发，消费方自行去重） */
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
