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
 * 标签直编 Provider（diagram-js-direct-editing 契约 {activate, update}）。
 *
 * 编辑带位置与形态（2026-10-26 定规三式）：
 * ① 任务族/折叠子流程/调用活动：编辑框=整元素（透明，点击元素任意处即
 *    聚焦；文字垂直居中=渲染 center-middle，内容垫 10 保持换行宽与渲染同宽）；
 * ② 泳道/池/展开子流程/注记：编辑框只在内容位置（头带/顶带/注记内），透明
 *    无边框无背景——画布上只见光标闪烁，看不出输入框；
 * ③ 外部标签（事件/网关/数据/连线）：白底浮卡（默认），高度下限 28。
 * 编辑期已渲染标签由 LabelBehavior 以 label-editing marker 藏去（防双文本）。
 *
 * 坐标契约：TextBox 把 bounds 直接当画布容器 CSS 像素（不做视口变换），
 * 故本 Provider 先按模型坐标算框，出口统一经 canvas.getAbsoluteBBox 仿射
 * 到视口坐标，字号随缩放同步（下限 8px 保可读）——zoom≠1 或画布平移后
 * 编辑框仍与元素对齐。空标签测量宽为个位数像素（竖排输入），编辑框宽
 * 下限 46（约 4 个 11px 汉字，自有取值）；渲染几何另由 LabelGeometry
 * 唯一决定，编辑加宽不落盘。
 */
import {
  connectionLabelBox,
  externalLabelBox,
  EXTERNAL_FONT,
  INTERNAL_FONT
} from '../label/LabelGeometry';
import type TextUtil from 'diagram-js/lib/util/Text';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { BpmnMode } from '../mode/BpmnMode';
import type { OrientationService } from '../meta/Orientation';

const INTERNAL_TYPES = /^bpmn:(Task|UserTask|ServiceTask|ScriptTask|ManualTask|SendTask|ReceiveTask|BusinessRuleTask|CallActivity|SubProcess|Transaction|AdHocSubProcess)/;

/** 编辑框最小宽（模型像素）：窄标签输入不逐字折行 */
const EDIT_MIN_WIDTH = 46;
/** 编辑字号缩放下限：过小无法读/选 */
const MIN_EDIT_FONT = 8;

/** 池/泳道头带半宽/半高（模型像素）：编辑框罩住头带可视区 */
const BAND_HALF_W = 60;
const BAND_HALF_H = 14;

/** 垂直池/道 'band' 标签带盒（与渲染 drawInternalLabel 'band' 模式同参） */
function bandBox(element: { x: number; y: number; width: number }): { x: number; y: number; width: number; height: number } {
  return { x: element.x + 8, y: element.y + 6, width: element.width - 16, height: 26 };
}

/** 隐形编辑框样式（透明背景+无边框——TextBox 默认内联白底/#ccc 边须显式
 * 覆盖；CSS 无 !important 时压不过内联，皮肤全靠此处内联下发）：池/道/
 * 展开子流程/注记/任务族等形内标签族专用 */
const TRANSPARENT_STYLE = { backgroundColor: 'transparent', border: 'none' };

/** 外部标签浮卡样式=属性面板输入框同款（2026-10-26 用户定规"样式与属性
 * 面板输入框一样，只是聚焦不变蓝"）：浅灰底 + 1px 灰边，取值对齐面板
 * properties-panel.css 设计变量（--input-background/border-color，
 * hsl(225,10%,97%)/hsl(225,10%,75%)）；聚焦变色（面板蓝）刻意不带 */
const PANEL_INPUT_STYLE = { backgroundColor: 'hsl(225, 10%, 97%)', border: '1px solid hsl(225, 10%, 75%)' };

/** 外部标签编辑框高度下限（模型像素，自有取值：11px 单行 + 舒适上下垫，
 * 2026-10-26 用户定规"外部/下方标签输入框再调高一点"） */
const EXTERNAL_EDIT_MIN_H = 28;

/** 外部标签框抬高到下限（位置不变，只增高：上下各扩展一半保持中心） */
function taller(box: { x: number; y: number; width: number; height: number }): { x: number; y: number; width: number; height: number } {
  if (box.height >= EXTERNAL_EDIT_MIN_H) {
    return box;
  }
  return { ...box, y: box.y - (EXTERNAL_EDIT_MIN_H - box.height) / 2, height: EXTERNAL_EDIT_MIN_H };
}

/** 形内编辑卡片参数（自有取值，展开子流程族顶带专用）：内缩 6 让框随
 * 顶带；卡片宽=元素宽−12、内容左右垫 4×2 → 换行宽=元素宽−20，与渲染
 * 排版宽严格同宽（internalLabelBox padX 8×2 + 渲染 padding 2×2 = 元素宽
 * −20），换行点所见即所得；高度按文本测量自适应（行高 1.4 与皮肤 CSS
 * 同参数），单行保底 24；顶距 5=渲染带 y6+padding2−基线魔法≈8−内容垫 3，
 * 单行文本顶与渲染逐像素对齐 */
const CARD_INSET = 6;
const CARD_PAD_V = 3;
const CARD_MIN_H = 24;
const CARD_LINE_HEIGHT = 1.4;
/** 内容左右垫（与皮肤 .djs-direct-editing-content padding 同源） */
const CARD_PAD_H = 4;
/** 顶带顶距：对齐渲染 'top' 标签带文本顶（带 y6+padding2−基线魔法 ≈8，
 * 减内容垫 3 → 5，实测单行文本顶逐像素对齐 drawInternalLabel） */
const CARD_TOP_INSET = 5;

/** 展开子流程族顶带编辑框：宽度=元素宽−2×内缩，高度=max(保底, 文本高+上下垫) */
function internalCard(
  textUtil: TextUtil,
  element: { x: number; y: number; width: number; height: number },
  text: string
): { x: number; y: number; width: number; height: number } {
  const width = Math.max(element.width - CARD_INSET * 2, 10);
  // 测量排版宽=换行宽（卡片宽−内容垫），与渲染排版宽同源；无名/空名免测
  const measured = text
    ? textUtil.getDimensions(text, {
        box: { width: width - CARD_PAD_H * 2, height: 400 },
        style: { ...INTERNAL_FONT, lineHeight: CARD_LINE_HEIGHT },
        padding: 0
      })
    : { height: 0 };
  const height = Math.max(CARD_MIN_H, Math.ceil(measured.height) + CARD_PAD_V * 2);
  return {
    x: element.x + CARD_INSET,
    y: element.y + CARD_TOP_INSET,
    width,
    height
  };
}

interface ActivateContext {
  bounds: { x: number; y: number; width: number; height: number };
  text: string;
  style: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export class BpmnLabelEditingProvider {
  static $inject = ['directEditing', 'canvas', 'textRenderer', 'modeling', 'bpmnMode', 'orientationService'];

  constructor(
    directEditing: any,
    private readonly canvas: Canvas,
    private readonly textUtil: TextUtil,
    private readonly modeling: any,
    private readonly bpmnMode: BpmnMode,
    private readonly orientationService: OrientationService
  ) {
    directEditing.registerProvider(this);
  }

  activate(element: any): ActivateContext | null {
    // 预览模式拒绝直编（只读）
    if (!this.bpmnMode.isEditable()) {
      return null;
    }
    // 独立标签元素（外部标签/连线标签）：编辑框=标签元素当前位置（白底浮卡，
    // 高度下限抬高——外部标签框原本紧贴文字只有十几像素高，输入局促）
    if (element.labelTarget) {
      const text = element.businessObject?.name ?? '';
      return this.toViewport(widen(taller({ ...element })), text, { ...EXTERNAL_FONT, ...PANEL_INPUT_STYLE }, { resizable: true });
    }
    const bo = element.businessObject;
    if (!bo?.$type?.startsWith('bpmn:')) {
      return null;
    }

    const text = bo.$type === 'bpmn:TextAnnotation' ? bo.text : bo.name;
    const horizontal = this.orientationService.isHorizontal();

    if (element.waypoints) {
      const labelEl = element.labels?.[0];
      const box = labelEl && !labelEl.hidden
        ? { ...labelEl }
        : connectionLabelBox(this.textUtil, text || ' ', element.waypoints) ?? midBox(element);
      return this.toViewport(widen(taller(box)), text, { ...EXTERNAL_FONT, ...PANEL_INPUT_STYLE }, { resizable: true });
    }

    if (bo.$type === 'bpmn:Participant' || bo.$type === 'bpmn:Lane') {
      // 头带位置随布局朝向：水平=左侧竖排标签带（旋转标签按横排编辑，居中）；
      // 垂直=顶部横带，编辑框与渲染 'band' 标签盒同位同对齐（左上+左对齐，
      // 顶流），编辑所见即所得
      if (horizontal) {
        const box = {
          x: element.x + element.width / 2 - BAND_HALF_W,
          y: element.y + element.height / 2 - BAND_HALF_H,
          width: BAND_HALF_W * 2,
          height: BAND_HALF_H * 2
        };
        return this.toViewport(box, text, { ...INTERNAL_FONT, ...TRANSPARENT_STYLE }, {});
      }
      const box = bandBox(element);
      return this.toViewport(
        box, text,
        { ...INTERNAL_FONT, ...TRANSPARENT_STYLE, textAlign: 'left', padding: '3px 2px' },
        {}
      );
    }

    if (bo.$type === 'bpmn:TextAnnotation') {
      const box = annotationBox(element);
      return this.toViewport(box, text, { ...EXTERNAL_FONT, ...TRANSPARENT_STYLE, textAlign: 'left' }, {});
    }

    if (INTERNAL_TYPES.test(bo.$type)) {
      // 展开子流程族=顶带锚：编辑框与渲染 'top' 标签带同位（internalCard），
      // 内容顶流与 center-top 同构（勿 centerVertically）；池/道/展开子流程/
      // 注记为隐形框（透明背景）——编辑期已渲染标签由 LabelBehavior 藏去，
      // 画布上只见光标闪烁，看不出输入框（2026-10-26 用户定规）
      const topAnchor =
        (element.isExpanded !== false && (bo.$type === 'bpmn:SubProcess' || bo.$type === 'bpmn:AdHocSubProcess')) ||
        bo.$type === 'bpmn:Transaction';
      if (topAnchor) {
        return this.toViewport(
          internalCard(this.textUtil, element, text ?? ''),
          text, { ...INTERNAL_FONT, ...TRANSPARENT_STYLE }, {}
        );
      }
      // 任务族/折叠子流程/调用活动：整元素框（框=元素，透明无感，点击元素
      // 任意处即聚焦输入），文字垂直居中=渲染 center-middle；内容左右垫 10
      // 使换行宽=元素宽−20，与渲染排版宽同宽（所见即所得）
      return this.toViewport(
        { ...element },
        text, { ...INTERNAL_FONT, ...TRANSPARENT_STYLE, padding: '3px 10px' }, { centerVertically: true }
      );
    }

    // 事件/网关/分组/数据：外部标签元素（已有标签用其位置，未建/隐藏走派生默认）
    const labelEl = element.labels?.[0];
    if (labelEl && !labelEl.hidden) {
      return this.toViewport(widen(taller({ ...labelEl })), text, { ...EXTERNAL_FONT, ...PANEL_INPUT_STYLE }, { resizable: true });
    }
    const local = externalLabelBox(this.textUtil, text || ' ', element);
    const box = local
      ? { ...local, x: local.x + element.x, y: local.y + element.y }
      : {
          x: element.x + element.width / 2 - EDIT_MIN_WIDTH,
          y: element.y + element.height + 6,
          width: EDIT_MIN_WIDTH * 2,
          height: 24
        };
    return this.toViewport(widen(taller(box)), text, { ...EXTERNAL_FONT, ...PANEL_INPUT_STYLE }, {});
  }

  update(element: any, newText: string): void {
    // 标签元素上提交：归一到宿主（bo 共享，命令语义以宿主为对象）
    const host = element.labelTarget ?? element;
    this.modeling.updateLabel(host, newText?.trim() || '');
  }

  /**
   * 模型框 → 视口 CSS 框（TextBox 消费坐标）：getAbsoluteBBox 仿射
   * 位置与尺寸（对纯 bbox 输入恒走仿射分支）；字号随 zoom 同步缩放，
   * 维持"编辑所见≈最终渲染"。
   */
  private toViewport(
    box: { x: number; y: number; width: number; height: number },
    text: string,
    style: Record<string, unknown>,
    options: Record<string, unknown>
  ): ActivateContext {
    const zoom = this.canvas.zoom();
    const fontSize = Number(style.fontSize) || 12;
    return {
      // 运行时 getAbsoluteBBox 对纯 bbox 走仿射分支（已核 Canvas 源），
      // d.ts 签名只收元素形状，按实际语义断言
      bounds: this.canvas.getAbsoluteBBox(box as any),
      text: text || '',
      // fontSize 须带单位：CSS 赋值裸数字无效（回落继承字体）
      style: { ...style, fontSize: Math.max(fontSize * zoom, MIN_EDIT_FONT) + 'px' },
      options
    };
  }
}

/** 编辑框最小宽（模型像素）：窄/空标签输入不逐字折行，中心对齐保持 */
function widen(box: { x: number; y: number; width: number; height: number }): { x: number; y: number; width: number; height: number } {
  if (box.width >= EDIT_MIN_WIDTH) {
    return box;
  }
  const cx = box.x + box.width / 2;
  return { ...box, x: cx - EDIT_MIN_WIDTH / 2, width: EDIT_MIN_WIDTH };
}

/** 注记形内框（局部 → 绝对；内边距与渲染一致） */
function annotationBox(element: any): { x: number; y: number; width: number; height: number } {
  return { x: element.x + 5, y: element.y + 6, width: element.width - 10, height: element.height - 12 };
}

function midBox(element: any): { x: number; y: number; width: number; height: number } {
  const wps = element.waypoints;
  const first = wps[0];
  const last = wps[wps.length - 1];
  return {
    x: (first.x + last.x) / 2 - 50,
    y: (first.y + last.y) / 2 - 12,
    width: 100,
    height: 24
  };
}
