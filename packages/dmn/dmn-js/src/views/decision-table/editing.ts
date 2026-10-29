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
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * for more details (a copy is included in the licenses/ directory that
 * accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 就地编辑态与控件（对齐 dmn-js content-editable：覆盖格子的白底蓝框浮层）。
 */
import { createElement } from 'inferno-create-element';

/** 正在就地编辑的 cell id（视图生命周期内单值；null=无） */
export interface EditState {
  cellId: string | null;
  kind: 'cell' | 'colname' | 'coltype' | null;
}

/** 就地编辑输入控件（Enter/失焦提交、Escape 取消） */
export function editInput(value: string, onCommit: (v: string) => void, onCancel: () => void): any {
  const h = createElement;
  let current = value;
  let done = false;
  const finish = (save: boolean) => {
    if (done) return;
    done = true;
    if (save) onCommit(current);
    else onCancel();
  };
  return h('input', {
    class: 'content-editable-input',
    value,
    onClick: (e: MouseEvent) => e.stopPropagation(),
    onInput: (e: any) => { current = e.target.value; },
    onBlur: () => finish(true),
    onKeydown: (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    }
  }, null);
}
