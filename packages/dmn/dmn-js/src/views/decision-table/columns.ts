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
 * 列宽体系：vdom 骑缝手柄 + 拖拽（Excel 语义——相邻两列互补保持总量、
 * 双侧下限 MIN_COL_WIDTH、落点记忆 WeakMap）。
 */
import { createElement } from 'inferno-create-element';
import { COL_WIDTHS, MIN_COL_WIDTH, INDEX_COL_WIDTH, DEFAULT_COL_WIDTH, type ColSpec } from './sheet';

export function createColumnTools(
  container: HTMLElement,
  getColSpecs: () => ColSpec[],
  rerender: () => void
) {
  const h = createElement;

  const clauseWidth = (spec: ColSpec): number | undefined =>
    COL_WIDTHS.get(spec.key) ?? (spec.colType === 'rownum' ? INDEX_COL_WIDTH : DEFAULT_COL_WIDTH);

  const resizeHandleVdom = (spec: ColSpec): any => h('div', {
    class: 'tjs-colresize',
    title: '拖拽调整列宽',
    onPointerdown: (e: PointerEvent) => startColumnDrag(e, spec)
  }, null);

  const startColumnDrag = (e: PointerEvent, spec: ColSpec): void => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const cell = handle.parentElement as HTMLElement | null;
    if (!cell) return;
    const next = cell.nextElementSibling as HTMLElement | null;
    const tableEl = container.querySelector('.tjs-table') as HTMLElement | null;
    const startX = e.clientX;
    const wA = cell.offsetWidth;
    const wB = next ? next.offsetWidth : 0;
    const colSpecs = getColSpecs();
    const specIndex = colSpecs.indexOf(spec);
    const nextSpec = next && specIndex >= 0 ? colSpecs[specIndex + 1] : null;
    const minA = Math.min(MIN_COL_WIDTH, wA);
    const minB = next ? Math.min(MIN_COL_WIDTH, wB) : 0;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('is-active');
    tableEl?.classList.add('tjs-table--resizing');
    const retotal = () => {
      if (!tableEl) return;
      const row = container.querySelector('.tjs-head-row');
      if (!row) return;
      const sum = Array.from(row.children).reduce((s, c) => s + (c as HTMLElement).offsetWidth, 0);
      tableEl.style.width = `${sum}px`;
    };
    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      let newA = wA + delta;
      if (next) newA = Math.min(Math.max(newA, minA), wA + wB - minB);
      else newA = Math.max(newA, minA);
      cell.style.width = `${Math.round(newA)}px`;
      if (next) next.style.width = `${Math.round(wA + wB - newA)}px`;
      retotal();
    };
    const onDone = () => {
      ac.abort();
      handle.classList.remove('is-active');
      tableEl?.classList.remove('tjs-table--resizing');
      COL_WIDTHS.set(spec.key, Math.round(cell.offsetWidth));
      if (nextSpec) COL_WIDTHS.set(nextSpec.key, Math.round((next as HTMLElement).offsetWidth));
      rerender();
    };
    const ac = new AbortController();
    handle.addEventListener('pointermove', onMove, { signal: ac.signal });
    handle.addEventListener('pointerup', onDone, { signal: ac.signal });
    handle.addEventListener('pointercancel', onDone, { signal: ac.signal });
  };

  return { clauseWidth, resizeHandleVdom, startColumnDrag };
}

export type ColumnTools = ReturnType<typeof createColumnTools>;
