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
 * 弹框家族统一入口（与 bpmn 线 BpmnPopup 同款契约：所有弹框同一套样式与
 * 行为）。集中弹框打开参数（标题/搜索/定宽）与贴靠规则；各 Provider 只声明
 * 目标元素、菜单 id、锚定上下文与标题。
 *
 * 贴靠规则（纵向"尽量靠下、与视口底留间距、贴近目标不遮挡"）：
 * - palette：palette 右侧展开（永不遮挡面板本体）；
 * - pad：context pad 正下方展开；放不下时整体上移，上移会盖住 pad 则翻到
 *   pad 上方，仍不足则贴顶。
 * 尺寸变化重贴靠（引擎 CLOSE_EVENTS 不含 resize）：三信号监听（见
 * util/Dom.observeBox）+ 尺寸签名比对去重。
 */
import type PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type ContextPad from 'diagram-js/lib/features/context-pad/ContextPad';
import type EventBus from 'diagram-js/lib/core/EventBus';
import { observeBox } from '../util/Dom';

export type DmnPopupAnchor =
  | { readonly kind: 'palette' }
  | { readonly kind: 'pad'; readonly target: unknown };

interface PopupSession {
  anchor: DmnPopupAnchor;
  position: { x: number; y: number };
  stopObserve: () => void;
  signature: string;
}

export class DmnPopup {
  /** 弹框家族统一宽度：条目 20px 图标 + 两字词长标签单行 + 滚动条余量 */
  static readonly WIDTH = 300;

  /** 视口底距/顶距/侧距（自有取值：约半个条目行留白；上翻不贴顶） */
  private static readonly BOTTOM_GAP = 16;
  private static readonly TOP_GAP = 10;
  private static readonly SIDE_GAP = 8;
  /** 首次定位用高度估计（渲染前不可量测）：标题+搜索+满高结果区之和 */
  private static readonly ESTIMATED_HEIGHT = 400;

  static $inject = ['popupMenu', 'canvas', 'contextPad', 'eventBus'];

  private session: PopupSession | null = null;

  constructor(
    private readonly popupMenu: PopupMenu,
    private readonly canvas: Canvas,
    private readonly contextPad: ContextPad,
    eventBus: EventBus
  ) {
    eventBus.on('popupMenu.closed', () => this.endSession());
  }

  /**
   * 打开家族弹框。search 语义：组件层 searchable = isDefined(search) && 条目>5
   * ——**false 也算"已定义"会照常开搜索，关搜索必须置 undefined（键缺席）**
   * （bpmn 线已立契约）。
   */
  open(
    target: unknown,
    menuId: string,
    anchor: DmnPopupAnchor,
    title: string,
    options?: { search?: boolean; className?: string }
  ): void {
    this.endSession();
    const position = this.place(anchor, null);
    const stopObserve = observeBox(this.canvas.getContainer(), () => this.checkSizeChanged());
    this.session = { anchor, position, stopObserve, signature: this.sizeSignature() };
    this.popupMenu.open(target as any, menuId, position, {
      title,
      search: options?.search === false ? undefined : true,
      width: DmnPopup.WIDTH,
      className: options?.className
    });
    // open() 同步渲染——按弹框真实高度精化一次
    this.reposition();
  }

  private checkSizeChanged(): void {
    const session = this.session;
    if (!session) {
      return;
    }
    if (!this.popupMenu.isOpen()) {
      this.endSession();
      return;
    }
    const signature = this.sizeSignature();
    if (signature !== session.signature) {
      session.signature = signature;
      this.reposition();
    }
  }

  private sizeSignature(): string {
    const rect = this.canvas.getContainer().getBoundingClientRect();
    return `${window.innerWidth}x${window.innerHeight}|${Math.round(rect.width)}x${Math.round(rect.height)}`;
  }

  private reposition(): void {
    const session = this.session;
    if (!session || !this.popupMenu.isOpen()) {
      return;
    }
    const popup = this.canvas.getContainer().querySelector<HTMLElement>('.djs-popup');
    const { x, y } = this.place(session.anchor, popup);
    // position 为引擎 _current 持有的同一引用：原地改值后引擎重渲染自然沿用
    session.position.x = x;
    session.position.y = y;
    if (popup) {
      popup.style.left = `${x}px`;
      popup.style.top = `${y}px`;
    }
  }

  private place(anchor: DmnPopupAnchor, popup: HTMLElement | null): { x: number; y: number } {
    const w = DmnPopup.WIDTH;
    const h = popup?.offsetHeight || DmnPopup.ESTIMATED_HEIGHT;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (anchor.kind === 'palette') {
      const rect = this.requirePalette().getBoundingClientRect();
      return {
        x: this.clampX(rect.right + 4, w, vw),
        y: Math.max(DmnPopup.TOP_GAP, vh - DmnPopup.BOTTOM_GAP - h)
      };
    }

    const pad = this.contextPad.getPad(anchor.target as any).html;
    const rect = pad.getBoundingClientRect();
    const below = rect.bottom + 6;
    let y: number;
    if (below + h <= vh - DmnPopup.BOTTOM_GAP) {
      y = below;
    } else {
      const shifted = Math.max(DmnPopup.TOP_GAP, vh - DmnPopup.BOTTOM_GAP - h);
      y = shifted < rect.top
        ? Math.max(DmnPopup.TOP_GAP, rect.top - 6 - h)
        : shifted;
    }
    return { x: this.clampX(rect.left, w, vw), y };
  }

  private clampX(x: number, w: number, vw: number): number {
    return Math.max(DmnPopup.SIDE_GAP, Math.min(x, vw - DmnPopup.SIDE_GAP - w));
  }

  private requirePalette(): HTMLElement {
    // Palette 服务无公共容器 getter，经画布容器查询其根元素；查无即内部不变
    // 量破坏，抛错
    const el = this.canvas.getContainer().querySelector<HTMLElement>('.djs-palette');
    if (!el) {
      throw new Error('palette container not found: popup anchor requires the palette to be mounted');
    }
    return el;
  }

  private endSession(): void {
    const session = this.session;
    if (!session) {
      return;
    }
    session.stopObserve();
    this.session = null;
  }
}
