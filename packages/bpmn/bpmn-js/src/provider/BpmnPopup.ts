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
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 弹框家族统一入口（产品决策：所有弹框同一套样式与行为）。
 *
 * 职责：集中弹框打开参数（标题 + 搜索 + 定宽）与贴靠规则，视觉皮肤见
 * styles/bpmn-js.css「弹框家族外观」一节；各 Provider 只声明目标元素、
 * 菜单 id、锚定上下文与标题，不再各自拼 open 选项。
 *
 * 贴靠规则（产品给定，纵向"尽量靠下、与视口底留间距、贴近目标不遮挡"）：
 * - palette：palette 右侧展开（永不遮挡面板本体），纵向底边对齐
 *   视口底 - BOTTOM_GAP，向上只让位 TOP_GAP；
 * - pad：context pad 正下方展开（最近且不遮挡）；下方放不下时整体上移
 *   保住底距，若上移会盖住 pad 则翻到 pad 上方，仍不足则贴顶。
 * 面板/窗口尺寸变化时（引擎 CLOSE_EVENTS 不含 resize，弹框保持打开）
 * 按同一规则实时重贴靠。信号源三路并行：window resize、画布容器
 * ResizeObserver、会话期尺寸签名轮询——部分嵌入容器（如 IAB webview）
 * 前两者均不派发，轮询兜住（布局变化可量测，仅事件缺失）。
 */
import type PopupMenu from 'diagram-js/lib/features/popup-menu/PopupMenu';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type EventBus from 'diagram-js/lib/core/EventBus';
import { observeBox } from '@kunpeng-io/kernel-shared';

export type BpmnPopupAnchor =
  | { readonly kind: 'palette' }
  | { readonly kind: 'pad'; readonly target: unknown };

/** 贴靠会话：持有引擎 _current.position 的同一引用与尺寸监听，供重贴靠复用 */
interface PopupSession {
  anchor: BpmnPopupAnchor;
  position: { x: number; y: number };
  /** 三信号监听停止函数（窗口 resize / ResizeObserver / 轮询，见 util/Dom.observeBox） */
  stopObserve: () => void;
  /** 尺寸签名（视口+画布容器），变化即重贴靠 */
  signature: string;
}

export class BpmnPopup {
  /**
   * 弹框家族统一宽度：条目为 20px 图标 + 两字词长标签单行 + 滚动条余量
   * （按产品给定参考样式等比自适配）；恰为 diagram-js .djs-popup 的
   * max-width 上限，无需覆写引擎样式。
   */
  static readonly WIDTH = 300;

  /** 视口底距：留约半个条目行的空白——弹框尽量靠下但不悬空贴边 */
  private static readonly BOTTOM_GAP = 16;
  /** 视口顶距：上翻与极端矮视口时不贴顶 */
  private static readonly TOP_GAP = 10;
  /** 视口侧距：横向夹紧时两侧留白 */
  private static readonly SIDE_GAP = 8;
  /** 首次定位用高度估计（渲染前不可量测）：标题+搜索+满高结果区(280)之和 */
  private static readonly ESTIMATED_HEIGHT = 400;

  static $inject = ['popupMenu', 'canvas', 'eventBus'];

  private session: PopupSession | null = null;

  constructor(
    private readonly popupMenu: PopupMenu,
    private readonly canvas: Canvas,
    eventBus: EventBus
  ) {
    // 弹框关闭（CLOSE_EVENTS 自动关闭/条目 trigger/再开新框）即结束贴靠会话
    eventBus.on('popupMenu.closed', () => this.endSession());
  }

  /**
   * 打开家族弹框。搜索框在可操作条目多于 5 个时自动出现（PopupMenu
   * 组件契约），小菜单天然无搜索框，无需调用方区分；变体弹框（如对齐
   * 栅格）可经 options 关搜索并挂根类名（className 拼到 .djs-popup 根，
   * 变体皮肤的 CSS 挂点）。
   */
  open(
    target: unknown,
    menuId: string,
    anchor: BpmnPopupAnchor,
    title: string,
    options?: { search?: boolean; className?: string }
  ): void {
    this.endSession();
    const position = this.place(anchor, null);
    // 面板宽度调节/窗口缩放不关弹框（不在引擎 CLOSE_EVENTS 内）——三信号监听
    // 并重贴靠（util/Dom.observeBox）。各信号统一走签名比对：resize/RO 触发
    // 本就意味着视口或容器尺寸已变（签名必变），比对仅挡住无意义重入
    const stopObserve = observeBox(this.canvas.getContainer(), () => this.checkSizeChanged());
    this.session = { anchor, position, stopObserve, signature: this.sizeSignature() };
    // 目标按引擎调用惯例宽松传递（PopupMenuTarget 可为元素/元素数组）
    this.popupMenu.open(target as any, menuId, position, {
      title,
      // 组件层 searchable = isDefined(search) && 条目>5——false 也算"已定义"
      // 会照常开搜索，关搜索必须整个置 undefined（键缺席）
      search: options?.search === false ? undefined : true,
      width: BpmnPopup.WIDTH,
      className: options?.className
    });
    // open() 同步渲染——按弹框真实高度精化一次（首次定位用的是估计高度）
    this.reposition();
  }

  /** 尺寸签名变化（视口或画布容器）即重贴靠；弹框已被外部关闭则收尾会话 */
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

  /** 视口 + 画布容器（取整）尺寸签名 */
  private sizeSignature(): string {
    const rect = this.canvas.getContainer().getBoundingClientRect();
    return `${window.innerWidth}x${window.innerHeight}|${Math.round(rect.width)}x${Math.round(rect.height)}`;
  }

  /** 按贴靠规则重算并同步到已开弹框（尺寸变化重贴靠/初始精化共用） */
  private reposition(): void {
    const session = this.session;
    if (!session || !this.popupMenu.isOpen()) {
      return;
    }
    const popup = this.canvas.getContainer().querySelector<HTMLElement>('.djs-popup');
    const { x, y } = this.place(session.anchor, popup);
    // position 为引擎 _current 持有的同一引用：原地改值后，引擎后续重渲染
    // （refresh 等）自然沿用新位置；同时直接写 left/top 立即生效
    session.position.x = x;
    session.position.y = y;
    if (popup) {
      popup.style.left = `${x}px`;
      popup.style.top = `${y}px`;
    }
  }

  private place(anchor: BpmnPopupAnchor, popup: HTMLElement | null): { x: number; y: number } {
    const w = BpmnPopup.WIDTH;
    const h = popup?.offsetHeight || BpmnPopup.ESTIMATED_HEIGHT;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (anchor.kind === 'palette') {
      const rect = this.requirePalette().getBoundingClientRect();
      return {
        x: this.clampX(rect.right + 4, w, vw),
        // 纵向尽量靠下：底边距视口底 BOTTOM_GAP，向上仅让位 TOP_GAP
        y: Math.max(BpmnPopup.TOP_GAP, vh - BpmnPopup.BOTTOM_GAP - h)
      };
    }

    // 锚定取目标元素 gfx 实测矩形（连线=整条线包围盒），不读 context pad html
    // 布局：pad html 在命令管线中存在重建瞬态（如切换钮 updateProperties 触发
    // elements.changed 后 pad 重建），瞬时节点的 getBoundingClientRect 是垃圾值
    // （实测 left≈0、top 越出视口），弹框会飞到视口左下角（2026-11-04 修复）
    const target = anchor.target as any;
    const element = Array.isArray(target) ? target[0] : target;
    const rect = this.canvas.getGraphics(element)?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      // gfx 瞬态不可量（未挂载/零尺寸）：退视口中部，绝不采纳垃圾坐标
      return {
        x: this.clampX((vw - w) / 2, w, vw),
        y: Math.max(BpmnPopup.TOP_GAP, Math.min(vh - BpmnPopup.BOTTOM_GAP - h, (vh - h) / 2))
      };
    }
    const below = rect.bottom + 6;
    let y: number;
    if (below + h <= vh - BpmnPopup.BOTTOM_GAP) {
      y = below;
    } else {
      const shifted = Math.max(BpmnPopup.TOP_GAP, vh - BpmnPopup.BOTTOM_GAP - h);
      // 上移会盖住元素：翻到元素上方（2026-10-29 用户定规：切换弹框与元素重叠）
      y = shifted < rect.top
        ? Math.max(BpmnPopup.TOP_GAP, rect.top - 6 - h)
        : shifted;
    }
    return { x: this.clampX(rect.left, w, vw), y };
  }

  /** 横向夹紧：右溢出收回 SIDE_GAP，不向左越出 SIDE_GAP */
  private clampX(x: number, w: number, vw: number): number {
    return Math.max(BpmnPopup.SIDE_GAP, Math.min(x, vw - BpmnPopup.SIDE_GAP - w));
  }

  private requirePalette(): HTMLElement {
    // Palette 服务无公共容器 getter，经画布容器查询其根元素——与
    // ContextPad.getPad().html 同源的 DOM 定位思路；查无即内部不变量破坏，抛错。
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
