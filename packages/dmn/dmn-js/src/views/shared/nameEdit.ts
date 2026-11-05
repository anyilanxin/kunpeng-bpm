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
/** 名字头就地编辑（对齐决策表标题条交互：点击名→覆盖输入框，Enter/失焦提交、Esc 放弃）。
 * nameSel 参数化名字元素选择器（LE=.decision-name、boxed=.element-name——
 * 原 ExpressionViews 版硬编码 .decision-name 致 boxed 名字点击无响应，拆分时修正）。 */
import type { EditorDeps } from './types';

export function startNameEdit(
  host: HTMLElement,
  nameSel: string,
  bo: any,
  current: string,
  deps: EditorDeps,
  rerender: () => void
): void {
  const existing = host.querySelector(`${nameSel}.editing`);
  if (existing) return;
  const nameEl = host.querySelector(nameSel);
  if (!nameEl) return;
  const input = document.createElement('input');
  input.className = 'content-editable-input';
  input.value = current;
  nameEl.textContent = '';
  nameEl.classList.add('editing');
  nameEl.classList.remove('editable');
  nameEl.append(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (save: boolean) => {
    if (done) return;
    done = true;
    if (save && input.value && input.value !== current) {
      deps.modeling.updateModdleProperties(bo, bo, { name: input.value });
    }
    // 命令与放弃两路都重渲（保存后视图须显示新名——命令不触发视图重建）
    rerender();
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
}
