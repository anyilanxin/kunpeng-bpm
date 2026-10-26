/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 编辑器视图头部（下钻/多视图共用）：「← 返回 DRD」+ 标题 + 右区插槽。
 * 样式件随宿主（dmn 下钻视图 dmn-js.css / bpmn 面包屑已同款字体族）。
 */
export function buildBackButton(onBack: () => void): HTMLButtonElement {
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'dmn-view-back';
  back.textContent = '← 返回 DRD';
  back.addEventListener('click', onBack);
  return back;
}

export function buildViewHeader(
  title: string,
  onBack: () => void,
  rightSlot?: HTMLElement
): HTMLElement {
  const header = document.createElement('div');
  header.className = 'dmn-view-header';
  header.append(buildBackButton(onBack));
  const titleEl = document.createElement('span');
  titleEl.className = 'dmn-view-title';
  titleEl.textContent = title;
  header.append(titleEl);
  if (rightSlot) {
    header.append(rightSlot);
  }
  return header;
}
