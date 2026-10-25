/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and directories/ that accompany this code.
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
/**
 * 悬浮工具栏服务：渲染进画布容器、相对画布水平居中（容器随宿主布局伸缩，
 * 面板让位/窗口缩放下恒居中）。内置动作（撤销重做组 / 缩放组，横纵布局钮嵌
 * 在缩放组内放大与适应画布之间）走内核服务；宿主经 `bpmnToolbar.actions`
 * 注册应用级动作（导入导出、模式切换、取色器等——render() 可放任意控件），
 * 按 group 连续成组、换组分隔。
 * 宽度上限 min(画布容器宽 × ½, 视口宽 × ⅓)（常态最多占画布一半、小屏收敛
 * 到屏幕三分之一），装不下的尾段自动收进「更多」弹层（容器尺寸/模式变化
 * 即时重排）。
 *
 * 只读实例（Viewer/NavigatedViewer）可装配：撤销重做/横纵布局依赖的
 * commandStack/modeling 经注入器非严格解析（缺失即 null，整组不建），
 * 缩放组与宿主动作照常——宿主声明 showInPreview 的动作在预览态保留。
 *
 * 皮肤全部走 --bio-* 语义令牌（宿主 .djs-container 令牌作用域，暗色随宿主
 * 热切换）；预览（只读）模式下隐藏编辑动作，仅保留声明 showInPreview 的
 * 宿主动作。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type CommandStack from 'diagram-js/lib/command/CommandStack';
import { ICONS } from './icons';

/** 内核服务的结构化类型（插件按结构消费，不耦合内核内部模块路径） */
type ModelOrientation = 'horizontal' | 'vertical';
interface ModeService {
  isEditable(): boolean;
}
interface OrientationLike {
  getOrientation(): ModelOrientation;
}
interface ModelingLike {
  setOrientation(orientation: ModelOrientation): void;
}
interface I18nLike {
  t(text: string): string;
}
/** 注入器结构化类型（编辑类服务按非严格解析：缺失得 null 而非抛错） */
interface InjectorLike {
  get<T = unknown>(name: string, strict?: boolean): T;
}

/** 宿主动作规格：图标钮（svg+onClick）或自定义控件（render），二者给一 */
export interface ToolbarActionSpec {
  id: string;
  title: string;
  /** 连续同组共存一组，换组插分隔线；缺省 'app' */
  group?: string;
  /** 图标钮：48×48 viewBox、currentColor 描边的自绘 SVG 字符串 */
  svg?: string;
  onClick?: () => void;
  /** 自定义控件（取色器等）：与图标钮互斥，返回元素直接入栏 */
  render?: () => HTMLElement;
  /** 激活态（高亮底，随刷新时机重估） */
  isActive?: () => boolean;
  /** 可用态（禁用钮，随刷新时机重估） */
  isEnabled?: () => boolean;
  /** 预览（只读）模式下仍显示；缺省仅编辑态 */
  showInPreview?: boolean;
}

/** 插件配置（Modeler 构造项 `bpmnToolbar` 键，组件包插件 config 契约） */
export interface ToolbarConfig {
  actions?: ToolbarActionSpec[];
}

/** 内置缩放步进与示例 App 原工具栏一致（1.2 倍率） */
const ZOOM_STEP = 1.2;

export class BpmnToolbar {
  static $inject = [
    'eventBus',
    'canvas',
    'bpmnMode',
    'orientationService',
    'bpmnI18n',
    'injector',
    'config.bpmnToolbar'
  ];

  private readonly root: HTMLElement;
  private readonly zoomLabel: HTMLButtonElement;
  /** 只读实例缺 commandStack/modeling（编辑模块不进注入器），相应组整组不建 */
  private readonly commandStack: CommandStack | null;
  private readonly modeling: ModelingLike | null;
  private readonly undoBtn?: HTMLButtonElement;
  private readonly redoBtn?: HTMLButtonElement;
  private readonly orientationBtn?: HTMLButtonElement;
  private readonly customControls: Array<{ spec: ToolbarActionSpec; el: HTMLElement }> = [];
  /** 顶层级段落（组/分隔线/宿主控件）的规范序——溢出收纳每轮全量回栏重排 */
  private readonly sections: HTMLElement[] = [];
  private readonly moreBtn: HTMLButtonElement;
  private readonly popup: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly onViewportResize = (): void => this.reflow();
  private onDocPointerDown: ((event: MouseEvent) => void) | null = null;

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly bpmnMode: ModeService,
    private readonly orientationService: OrientationLike,
    private readonly bpmnI18n: I18nLike,
    injector: InjectorLike,
    config: ToolbarConfig = {}
  ) {
    this.commandStack = injector.get<CommandStack | null>('commandStack', false);
    this.modeling = injector.get<ModelingLike | null>('modeling', false);

    const t = (text: string): string => this.bpmnI18n.t(text);
    this.root = document.createElement('div');
    this.root.className = 'bpmn-toolbar';

    // 宿主动作组（在前）：换组分隔
    let lastGroup: string | null = null;
    for (const spec of config.actions ?? []) {
      const group = spec.group ?? 'app';
      if (lastGroup !== null && group !== lastGroup) {
        this.root.appendChild(separator());
      }
      lastGroup = group;
      this.root.appendChild(this.buildCustomControl(spec));
    }

    // 内置组（在后）：撤销重做 → 缩放；横纵布局钮嵌在缩放组内（放大与适应画布
    // 之间）。编辑服务缺失的组/钮不建（只读实例仅剩缩放组）
    if (lastGroup !== null) {
      this.root.appendChild(separator());
    }
    if (this.commandStack) {
      const history = group('history', true);
      this.undoBtn = iconButton('undo', t('撤销 (Ctrl+Z)'), ICONS.undo, () => this.commandStack!.undo());
      this.redoBtn = iconButton('redo', t('重做 (Ctrl+Shift+Z)'), ICONS.redo, () => this.commandStack!.redo());
      history.append(this.undoBtn, this.redoBtn);
      this.root.appendChild(history);
      // 撤销重做独立成组，与缩放组以分隔线划界
      this.root.appendChild(separator());
    }

    // 布局单钮：图标标识当前朝向（横/纵各一款，随朝向换显），提示写明具体
    // 目标朝向，点击翻转（构造先用横款占位，init 序列里 syncOrientation 归位）。
    // 位于缩放组内放大与适应画布之间；只读态随钮级 data-edit-only 隐藏
    if (this.modeling) {
      this.orientationBtn = iconButton(
        'orientation',
        t('切换为纵向布局'),
        ICONS.orientationHorizontal,
        () =>
          this.modeling!.setOrientation(
            this.orientationService.getOrientation() === 'vertical' ? 'horizontal' : 'vertical'
          )
      );
      this.orientationBtn.setAttribute('data-edit-only', 'true');
    }

    // 缩放组对只读实例也有意义（NavigatedViewer 导航/Viewer 程序化缩放），不设编辑专属
    const zoom = group('zoom', false);
    this.zoomLabel = document.createElement('button');
    this.zoomLabel.type = 'button';
    this.zoomLabel.className = 'bpmn-toolbar-val';
    this.zoomLabel.title = t('重置缩放 (Ctrl+0)');
    // zoom 第二参缺省即取视口中心（'center' 语义）；fit 的中心锚只判真值（_fitViewport
    // 忽略具体坐标），传零点字面量与 'auto' 等价且不破 Point 类型
    this.zoomLabel.addEventListener('click', () => this.canvas.zoom(1));
    zoom.append(
      iconButton('zoom-out', t('缩小 (Ctrl+-)'), ICONS.zoomOut, () => this.canvas.zoom(this.canvas.zoom() / ZOOM_STEP)),
      this.zoomLabel,
      iconButton('zoom-in', t('放大 (Ctrl++)'), ICONS.zoomIn, () => this.canvas.zoom(this.canvas.zoom() * ZOOM_STEP)),
      ...(this.orientationBtn ? [this.orientationBtn] : []),
      iconButton('zoom-fit', t('适应画布'), ICONS.zoomFit, () => this.canvas.zoom('fit-viewport', { x: 0, y: 0 }))
    );
    this.root.appendChild(zoom);

    this.canvas.getContainer().appendChild(this.root);

    // —— 溢出收纳（更多）：宽度上限 min(画布½, 视口⅓)，装不下的尾段落弹层收纳 ——
    this.sections.push(...Array.from(this.root.children) as HTMLElement[]);
    this.moreBtn = iconButton('more', t('更多'), ICONS.more, () => this.togglePopup());
    this.popup = document.createElement('div');
    this.popup.className = 'bpmn-toolbar-popup';
    this.popup.hidden = true;
    this.root.append(this.moreBtn, this.popup);
    // 画布容器宽度变化（面板让位等宿主布局伸缩）即时重排；observe 起始还自带
    // 一次回调。视口缩放另挂 window resize——diagram-js 不代挂窗口事件，且部分
    // 嵌入 webview 停渲下 ResizeObserver 回调不送达（窗口 resize 事件仍派发）
    this.resizeObserver = new ResizeObserver(() => this.reflow());
    this.resizeObserver.observe(this.canvas.getContainer());
    window.addEventListener('resize', this.onViewportResize);

    eventBus.on('canvas.viewbox.changed', () => this.syncZoom());
    // 朝向变化两路：转置命令（含撤销重做）与导入解析（标记/池 DI 推断）
    eventBus.on('commandStack.changed', () => {
      this.syncHistory();
      this.syncOrientation();
    });
    eventBus.on('import.done', () => this.syncOrientation());
    eventBus.on('mode.changed', () => this.syncMode());
    eventBus.on('diagram.destroy', () => this.destroy());

    this.reflow();
    this.syncZoom();
    this.syncHistory();
    this.syncOrientation();
    this.syncMode();
  }

  /** 刷新宿主动作激活/可用态与缩放百分比（命令栈/视口/模式变化后由各 sync 汇入） */
  refresh(): void {
    for (const { spec, el } of this.customControls) {
      if (spec.isEnabled) {
        (el as HTMLButtonElement).disabled = spec.isEnabled() === false;
      }
      el.classList.toggle('bpmn-toolbar-btn--active', spec.isActive?.() === true);
    }
    this.syncZoom();
    this.syncHistory();
    this.syncOrientation();
    this.syncMode();
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.onViewportResize);
    this.closePopup();
    this.root.remove();
  }

  /**
   * 宽度上限重排：上限取 min(画布容器宽 × ½, 视口宽 × ⅓)——常态最多占画布
   * 一半，小屏（画布≈视口）收敛到屏幕三分之一。全量回栏后按段累加，装不下
   * 的尾段（连同其紧邻分隔线）移入「更多」弹层；弹层内是同一批 DOM 节点，
   * 监听器与状态同步原样生效。
   */
  private reflow(): void {
    const containerWidth = this.canvas.getContainer().clientWidth;
    const cap = Math.floor(Math.min(containerWidth / 2, window.innerWidth / 3));
    this.root.style.maxWidth = `${cap}px`;
    this.closePopup();
    for (const section of this.sections) {
      this.root.appendChild(section); // 上一轮移入弹层的段落归位（保持规范序）
    }
    this.root.append(this.moreBtn, this.popup);

    const style = getComputedStyle(this.root);
    const gap = parseFloat(style.columnGap) || 6;
    const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const widths = this.sections.map((section) => section.offsetWidth);
    const natural = padding + widths.reduce((sum, w) => sum + w, 0) + gap * this.sections.length;
    if (natural <= cap) {
      this.moreBtn.style.display = 'none';
      return;
    }
    // 超限：更多钮占位后逐段累加找溢出起点（预留尾随 gap 与钮宽）
    this.moreBtn.style.display = '';
    const budget = cap - padding - this.moreBtn.offsetWidth - gap;
    let used = 0;
    let firstMoved = this.sections.length;
    for (let i = 0; i < this.sections.length; i++) {
      used += widths[i] + gap;
      if (used > budget) {
        firstMoved = i;
        break;
      }
    }
    // 紧邻溢出点的分隔线一并入弹层（主栏不留尾随分隔线）
    if (firstMoved > 0 && this.sections[firstMoved - 1].classList.contains('bpmn-toolbar-sep')) {
      firstMoved--;
    }
    for (let i = firstMoved; i < this.sections.length; i++) {
      this.popup.appendChild(this.sections[i]);
    }
  }

  private togglePopup(): void {
    if (this.popup.hidden) {
      this.popup.hidden = false;
      this.moreBtn.classList.add('bpmn-toolbar-btn--active');
      this.onDocPointerDown = (event: MouseEvent) => {
        if (!this.popup.contains(event.target as Node) && event.target !== this.moreBtn) {
          this.closePopup();
        }
      };
      document.addEventListener('mousedown', this.onDocPointerDown);
    } else {
      this.closePopup();
    }
  }

  private closePopup(): void {
    if (this.onDocPointerDown) {
      document.removeEventListener('mousedown', this.onDocPointerDown);
      this.onDocPointerDown = null;
    }
    this.popup.hidden = true;
    this.moreBtn.classList.remove('bpmn-toolbar-btn--active');
  }

  private buildCustomControl(spec: ToolbarActionSpec): HTMLElement {
    if (spec.render) {
      const host = spec.render();
      if (spec.showInPreview !== true) {
        host.setAttribute('data-edit-only', 'true');
      }
      this.customControls.push({ spec, el: host });
      return host;
    }
    const btn = iconButton(spec.id, spec.title, spec.svg ?? '', () => spec.onClick?.());
    if (spec.showInPreview !== true) {
      btn.setAttribute('data-edit-only', 'true');
    }
    this.customControls.push({ spec, el: btn });
    return btn;
  }

  private syncZoom(): void {
    this.zoomLabel.textContent = `${Math.round(this.canvas.zoom() * 100)}%`;
  }

  private syncHistory(): void {
    if (!this.commandStack || !this.undoBtn || !this.redoBtn) {
      return;
    }
    this.undoBtn.disabled = !this.commandStack.canUndo();
    this.redoBtn.disabled = !this.commandStack.canRedo();
  }

  /** 布局钮图标/提示随当前朝向显示：图标标识当前态（横=横箭头款/纵=纵箭头款），
      提示写明点击将切到的具体目标朝向 */
  private syncOrientation(): void {
    if (!this.orientationBtn) {
      return;
    }
    const horizontal = this.orientationService.getOrientation() === 'horizontal';
    this.orientationBtn.innerHTML = horizontal ? ICONS.orientationHorizontal : ICONS.orientationVertical;
    this.orientationBtn.title = this.bpmnI18n.t(horizontal ? '切换为纵向布局' : '切换为横向布局');
  }

  private syncMode(): void {
    this.root.classList.toggle('bpmn-toolbar--readonly', !this.bpmnMode.isEditable());
    for (const { spec, el } of this.customControls) {
      if (spec.isEnabled) {
        (el as HTMLButtonElement).disabled = spec.isEnabled() === false;
      }
      el.classList.toggle('bpmn-toolbar-btn--active', spec.isActive?.() === true);
    }
    // 只读显隐改变段落数量与宽度，重排收纳
    this.reflow();
  }
}

function group(name: string, editOnly: boolean): HTMLElement {
  const el = document.createElement('div');
  el.className = 'bpmn-toolbar-group';
  el.dataset.group = name;
  if (editOnly) {
    el.setAttribute('data-edit-only', 'true');
  }
  return el;
}

function separator(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'bpmn-toolbar-sep';
  return el;
}

function iconButton(
  action: string,
  title: string,
  svg: string,
  onClick: () => void
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bpmn-toolbar-btn';
  btn.dataset.action = action;
  btn.title = title;
  btn.innerHTML = svg;
  btn.addEventListener('click', onClick);
  return btn;
}
