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
/** 下钻视图 DOM 小件（三视图共用原语） */

export function el(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function makeTextInput(value: string | undefined, onCommit: (v: string) => void, placeholder?: string): HTMLInputElement {
  const input = document.createElement('input');
  input.className = 'dmn-editor-input';
  input.value = value ?? '';
  if (placeholder) input.placeholder = placeholder;
  input.addEventListener('change', () => onCommit(input.value));
  return input;
}

export function makeTextArea(value: string | undefined, onCommit: (v: string) => void, placeholder?: string): HTMLTextAreaElement {
  const ta = document.createElement('textarea');
  ta.className = 'dmn-editor-textarea';
  ta.value = value ?? '';
  if (placeholder) ta.placeholder = placeholder;
  ta.addEventListener('change', () => onCommit(ta.value));
  return ta;
}
