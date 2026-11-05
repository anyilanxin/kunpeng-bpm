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
/** 形态切换菜单（LE/boxed 共用）：简单下拉浮层，当前形态置灰，Escape/外点关闭 */
import { el } from './dom';

const KINDS: ReadonlyArray<{ kind: string; label: string }> = [
  { kind: 'dmn:DecisionTable', label: 'Decision Table' },
  { kind: 'dmn:LiteralExpression', label: 'Literal Expression' },
  { kind: 'dmn:Context', label: 'Context' },
  { kind: 'dmn:List', label: 'List' },
  { kind: 'dmn:Invocation', label: 'Invocation' },
  { kind: 'dmn:Relation', label: 'Relation' }
];

function kindMenu(current: string, onPick: (kind: string) => void): HTMLElement {
  const wrap = el('div', 'dmn-kind-menu');
  for (const o of KINDS) {
    const item = el('button', 'dmn-kind-item', o.label);
    if (o.kind === current) item.setAttribute('disabled', '');
    item.addEventListener('click', () => onPick(o.kind));
    wrap.append(item);
  }
  return wrap;
}

/** 点击形态标签弹出切换菜单（简单定位浮层；Escape/外点关闭） */
export function openKindMenu(anchor: HTMLElement, current: string, onPick: (kind: string) => void): void {
  const existing = document.querySelector('.dmn-kind-menu');
  existing?.remove();
  const menu = kindMenu(current, (kind) => {
    menu.remove();
    onPick(kind);
  });
  const rect = anchor.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  document.body.append(menu);
  const onDoc = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && e.target !== anchor) {
      menu.remove();
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      menu.remove();
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('mousedown', onDoc);
  document.addEventListener('keydown', onKey);
}

// ---- 形态标签文案 ----
export function logicKind(expr: any): string {
  return expr?.$type ?? '';
}

export function kindLabel(kind: string): string {
  return kind === 'dmn:DecisionTable' ? 'Decision Table'
    : kind === 'dmn:LiteralExpression' ? 'Literal Expression'
      : kind === 'dmn:Context' ? 'Context'
        : kind === 'dmn:List' ? 'List'
          : kind === 'dmn:Invocation' ? 'Invocation'
            : kind === 'dmn:Relation' ? 'Relation'
              : kind || 'Empty';
}
