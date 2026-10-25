/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/*
 * sortablejs 装配封装。
 *
 * Vue 列表与 sortable 的 DOM 抢占问题（vuedraggable 内部同款处理思路，自研实现）：
 * onEnd 先把 sortable 移动过的 DOM **原位还原**，再执行模型命令并让 Vue 以数据为
 * 源全权重渲——杜绝 vdom 与真实 DOM 错位。palette 为 clone 源（put:false），落点
 * 元素是克隆节点，还原 = 直接移除克隆。
 */
import Sortable from 'sortablejs';
import type { DesignerContext } from './context';

const PALETTE_MARK = 'fjd-palette-list';

/** 还原 sortable 在 onEnd 时已完成的 DOM 变更（画布源：移回原位；palette 源：删克隆） */
function revertDom(evt: Sortable.SortableEvent): void {
  const { item, from, to, oldIndex } = evt;
  if (from.classList.contains(PALETTE_MARK)) {
    item.remove();
    return;
  }
  if (to !== from) {
    item.remove();
  }
  const ref = oldIndex !== undefined ? from.children[oldIndex] : undefined;
  from.insertBefore(item, ref ?? null);
}

/** onEnd 统一处理：按源容器分类走 addField（palette 拖出）/ moveField（画布内含跨容器） */
function handleEnd(ctx: DesignerContext, evt: Sortable.SortableEvent): void {
  const from = evt.from;
  const to = evt.to;
  const parentId = to.dataset.parentId || undefined;
  const index = evt.newIndex ?? 0;
  if (from.classList.contains(PALETTE_MARK)) {
    const type = evt.item.dataset.type;
    if (!type) {
      revertDom(evt);
      return;
    }
    revertDom(evt);
    ctx.run(() => {
      const id = ctx.model.addField(type as never, { parentId, index });
      ctx.select(id);
    });
    return;
  }
  const id = evt.item.dataset.id;
  revertDom(evt);
  if (!id) {
    return;
  }
  ctx.run(() => ctx.model.moveField(id, { parentId, index }));
}

export function attachPaletteSortable(el: HTMLElement, ctx: DesignerContext): Sortable {
  const sortable = Sortable.create(el, {
    group: { name: 'form-fields', pull: 'clone', put: false },
    sort: false,
    animation: 0,
    onEnd: (evt) => handleEnd(ctx, evt)
  });
  // DEV 验收口：IAB 无法合成 HTML5 DnD 事件序列，直调 handleEnd（拖拽结束唯一
  // 逻辑入口，真实事件与直调同函数）覆盖「DOM 还原 + 模型命令 + 视图重渲」全链路
  if (import.meta.env.DEV) {
    (globalThis as Record<string, unknown>).__fjdHandleEnd = (evt: Sortable.SortableEvent) =>
      handleEnd(ctx, evt);
  }
  return sortable;
}

export function attachCanvasSortable(el: HTMLElement, parentId: string | null, ctx: DesignerContext): Sortable {
  el.dataset.parentId = parentId ?? '';
  return Sortable.create(el, {
    group: { name: 'form-fields', put: true },
    handle: '.fjd-drag-handle',
    animation: 0,
    onEnd: (evt) => handleEnd(ctx, evt)
  });
}
