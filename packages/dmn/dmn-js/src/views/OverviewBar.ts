/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder has
 * designated this particular file as subject to the "Classpath" exception
 * as provided in the licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 */
/**
 * 下钻视图顶部概览工具条（样式对齐 kunpeng-modeler，逻辑自研）：
 * - Edit DRD：返回 DRD 画布（onEditDrd 回调，由 DmnViews.close 承担）
 * - Open overview：左缘折叠面板（默认宽 300，拖宽 150–650，× 关闭），
 *   内容为主画布 SVG 的静态快照（克隆即只读，改图后 150ms 防抖重拍）。
 * 不实例化第二个查看器——modules.ts 依赖图不可触达 Viewer.ts
 * （Viewer extends Modeler 顶层求值，经 Modeler→modules 会成循环崩点）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';

const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 150;
const MAX_WIDTH = 650;
const REFRESH_DEBOUNCE = 150;

export interface OverviewChrome {
  toolbar: HTMLElement;
  bodyRow: HTMLElement;
  contentSlot: HTMLElement;
  destroy(): void;
}

export function buildOverviewChrome(
  onEditDrd: () => void,
  deps: { eventBus: EventBus; canvas: Canvas }
): OverviewChrome {
  let width = DEFAULT_WIDTH;
  let open = false;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- 工具条 ----
  const toolbar = document.createElement('div');
  toolbar.className = 'dmn-overview-toolbar';
  const editDrd = document.createElement('button');
  editDrd.type = 'button';
  editDrd.className = 'dmn-overview-edit-drd';
  editDrd.title = 'Switch back to DRD view';
  editDrd.textContent = 'Edit DRD';
  editDrd.addEventListener('click', onEditDrd);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'dmn-overview-toggle-button';
  toolbar.append(editDrd, toggle);

  // ---- 面板骨架 ----
  const bodyRow = document.createElement('div');
  bodyRow.className = 'dmn-editor-body-row';
  const panel = document.createElement('div');
  panel.className = 'dmn-overview-panel';
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'dmn-overview-resize-handle';
  const close = document.createElement('div');
  close.className = 'dmn-overview-close';
  close.title = 'Close overview';
  close.textContent = '×';
  const viewer = document.createElement('div');
  viewer.className = 'dmn-overview-viewer';
  panel.append(resizeHandle, close, viewer);
  const contentSlot = document.createElement('div');
  contentSlot.className = 'dmn-editor-content';
  bodyRow.append(panel, contentSlot);

  // ---- 快照小图：克隆主画布 SVG（只读静态渲染） ----
  const renderMini = (): void => {
    viewer.textContent = '';
    const svg = (deps.canvas.getContainer() as HTMLElement).querySelector(':scope > svg');
    if (!svg) {
      return;
    }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    clone.style.width = '100%';
    clone.style.height = '100%';
    viewer.append(clone);
    // 挂载后量内容包围盒，全图适配（带 20px 呼吸边）
    requestAnimationFrame(() => {
      const bb = clone.getBBox();
      if (!bb.width || !bb.height) {
        return;
      }
      const pad = 20;
      clone.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${bb.width + pad * 2} ${bb.height + pad * 2}`);
    });
  };

  const updateToggle = (): void => {
    toggle.textContent = open ? 'Close overview' : 'Open overview';
    toggle.title = open ? 'Close DRD overview' : 'Open DRD overview';
  };
  const openPanel = (): void => {
    if (open) {
      return;
    }
    open = true;
    panel.classList.add('open');
    panel.style.width = `${width}px`;
    renderMini();
    updateToggle();
  };
  const closePanel = (): void => {
    if (!open) {
      return;
    }
    open = false;
    panel.classList.remove('open');
    panel.style.width = '0px';
    viewer.textContent = '';
    updateToggle();
  };
  toggle.addEventListener('click', () => (open ? closePanel() : openPanel()));
  close.addEventListener('click', closePanel);

  // ---- 拖宽（右缘手柄，150–650） ----
  resizeHandle.addEventListener('mousedown', (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const onMove = (moveEvent: MouseEvent): void => {
      width = Math.min(Math.max(startWidth + (moveEvent.clientX - startX), MIN_WIDTH), MAX_WIDTH);
      panel.style.width = `${width}px`;
    };
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      panel.classList.remove('resizing');
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    panel.classList.add('resizing');
  });

  // ---- 改图后防抖重拍（面板开着才拍） ----
  const onCommandsChanged = (): void => {
    if (!open) {
      return;
    }
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      renderMini();
    }, REFRESH_DEBOUNCE);
  };
  deps.eventBus.on('commandStack.changed', onCommandsChanged);

  updateToggle();
  return {
    toolbar,
    bodyRow,
    contentSlot,
    destroy(): void {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
      deps.eventBus.off('commandStack.changed', onCommandsChanged);
    }
  };
}
