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
 * BPMN 元素记法图标（palette / 替换菜单 / context pad 类型条目共用）。
 *
 * 图标基准=标准图标集（icons/IconSet，docs/bpmnicon 资产）：有已确认映射的
 * 类型直接输出图标集剪影 SVG（iconSetKeyOf）；集合未覆盖或不适配的槽位
 * （调用活动/事件网关/泳道/分组/注记/连线族/循环标记叠加）回退到自绘记法。
 *
 * 自绘分支与画布（render/BpmnRenderer + Symbols）严格同一套记法：以**画布
 * 真实几何**（事件直径 38、网关 52、任务盒 116×78、数据对象 40×56…）调用画布
 * 字形函数，再经 canvasGroup 整体等比缩放进 36 视框——环重（开始 2 / 结束 4 /
 * 中间双环 r-3）、网关标记（X/+ /O/双圆占 0.72 半宽）、任务字标位（14,14 s=8）、
 * 折叠 [+]（底边跨骑）全部与画布逐比例一致。
 *
 * 例外（画布长宽比过扁、等比缩到线宽不可读的元素）：池/泳道/分组/注记/展开子
 * 流程/连线缩样为手绘等比形，形状比例随画布、线宽取可读下限，理由随分支注明。
 */
import {
  drawEventSymbol,
  drawGatewayMarker,
  drawGatewayShape,
  taskGlyph,
  drawDataObjectShape,
  drawDataStoreShape,
  drawCollapsedMarker,
  drawAdHocMarker,
  drawLoopMarker,
  circle,
  eventRingWeight,
  gatewayMarkerOf,
  isDoubleRingEvent,
  loopMarkerAssetKey,
  NON_INTERRUPTING_DASH,
  type LoopMarkerKind,
  type StyleTheme
} from '../render/Symbols';
import { EventDefinitions } from '../meta/EventDefinitions';
import { isEventFamily, isGatewayFamily } from '../meta/ElementTypes';
import { loopKindOf, type LoopKind } from '../meta/LoopCharacteristics';
import { iconSetSvg, type IconSetKey } from './IconSet';
import { svgShell, entryShell } from './shell';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_STROKE = '#000000';

/** 开始事件符号 → 图标集键（规范 §10.5.1 Table 10.5 全触发） */
const START_SYMBOL_KEYS: Record<string, IconSetKey> = {
  message: 'eventStartMessage',
  timer: 'eventStartTimer',
  error: 'eventStartError',
  escalation: 'eventStartEscalation',
  conditional: 'eventStartConditional',
  signal: 'eventStartSignal',
  multiple: 'eventStartMultiple',
  parallelMultiple: 'eventStartParallelMultiple',
  compensation: 'eventStartCompensation'
};

/** 非中断开始（事件子流程内，虚线外环）→ 图标集键 */
const START_NI_KEYS: Record<string, IconSetKey> = {
  message: 'eventStartNonInterruptingMessage',
  timer: 'eventStartNonInterruptingTimer',
  signal: 'eventStartNonInterruptingSignal',
  conditional: 'eventStartNonInterruptingConditional',
  escalation: 'eventStartNonInterruptingEscalation',
  multiple: 'eventStartNonInterruptingMultiple',
  parallelMultiple: 'eventStartNonInterruptingParallelMultiple'
};

/** 中间捕获符号 → 图标集键（边界事件同捕获记法） */
const CATCH_SYMBOL_KEYS: Record<string, IconSetKey> = {
  timer: 'eventIntermediateTimer',
  message: 'eventIntermediateMessage',
  conditional: 'eventIntermediateConditional',
  link: 'eventIntermediateLink',
  signal: 'eventIntermediateSignal',
  error: 'eventIntermediateError',
  escalation: 'eventIntermediateEscalation',
  multiple: 'eventIntermediateMultiple',
  parallelMultiple: 'eventIntermediateParallelMultiple',
  cancel: 'eventIntermediateCancel',
  compensation: 'eventIntermediateCompensation'
};

/** 非中断中间捕获（边界 NI，虚线外环）→ 图标集键 */
const CATCH_NI_KEYS: Record<string, IconSetKey> = {
  message: 'eventIntermediateNonInterruptingMessage',
  timer: 'eventIntermediateNonInterruptingTimer',
  signal: 'eventIntermediateNonInterruptingSignal',
  conditional: 'eventIntermediateNonInterruptingConditional',
  escalation: 'eventIntermediateNonInterruptingEscalation',
  multiple: 'eventIntermediateNonInterruptingMultiple',
  parallelMultiple: 'eventIntermediateNonInterruptingParallelMultiple'
};

/** 中间抛出符号 → 图标集键（规范 §10.5.2 throw 族） */
const THROW_SYMBOL_KEYS: Record<string, IconSetKey> = {
  message: 'eventIntermediateMessageThrow',
  escalation: 'eventIntermediateEscalationThrow',
  link: 'eventIntermediateThrowLink',
  signal: 'eventIntermediateThrowSignal',
  compensation: 'eventIntermediateThrowCompensation',
  multiple: 'eventIntermediateThrowMultiple'
};

/** 结束事件结果 → 图标集键（规范 §10.5.3 Table 10.88 九种） */
const END_SYMBOL_KEYS: Record<string, IconSetKey> = {
  error: 'eventEndError',
  terminate: 'eventEndTerminate',
  message: 'eventEndMessage',
  escalation: 'eventEndEscalation',
  compensation: 'eventEndCompensation',
  signal: 'eventEndSignal',
  multiple: 'eventEndMultiple',
  cancel: 'eventEndCancel'
};

/** 元素类型元数据 → 图标集键（映射依据见 IconSet 各条目注释；未覆盖返回 undefined 走自绘回退） */
export function iconSetKeyOf(meta: BpmnIconMeta): IconSetKey | undefined {
  const t = meta.type;
  const sym = meta.eventSymbol ?? '';
  if (t === 'bpmn:StartEvent') {
    if (meta.nonInterrupting) {
      return START_NI_KEYS[sym];
    }
    return sym ? (START_SYMBOL_KEYS[sym] ?? 'eventStart') : 'eventStart';
  }
  if (t === 'bpmn:IntermediateCatchEvent' || t === 'bpmn:BoundaryEvent') {
    // 边界与中间捕获同记法；边界消息沿用既有专用键
    if (t === 'bpmn:BoundaryEvent' && !meta.nonInterrupting && sym === 'message') {
      return 'eventBoundaryMessage';
    }
    if (meta.nonInterrupting) {
      // 无专属 NI 图标的符号回退画布缩样（自绘虚线环记法）
      return CATCH_NI_KEYS[sym] ?? CATCH_SYMBOL_KEYS[sym];
    }
    return sym ? (CATCH_SYMBOL_KEYS[sym] ?? undefined) : undefined;
  }
  if (t === 'bpmn:IntermediateThrowEvent') {
    return sym ? (THROW_SYMBOL_KEYS[sym] ?? 'eventIntermediateNone') : 'eventIntermediateNone';
  }
  if (t === 'bpmn:EndEvent') {
    return sym ? (END_SYMBOL_KEYS[sym] ?? 'eventEnd') : 'eventEnd';
  }
  if (t === 'bpmn:Task') return 'task';
  if (t === 'bpmn:UserTask') return 'taskUser';
  if (t === 'bpmn:ServiceTask') return 'taskService';
  if (t === 'bpmn:ScriptTask') return 'taskScript';
  if (t === 'bpmn:ManualTask') return 'taskManual';
  if (t === 'bpmn:SendTask') return 'taskSend';
  if (t === 'bpmn:ReceiveTask') return 'taskReceive';
  if (t === 'bpmn:BusinessRuleTask') return 'taskBusinessRule';
  if (t === 'bpmn:SubProcess') {
    if (meta.symbol === 'subProcessCollapsed') return 'subProcessCollapsed';
    if (meta.symbol === 'subProcessEvent') return 'subProcessEvent';
    return 'subProcessExpanded';
  }
  if (t === 'bpmn:Transaction') return 'transaction';
  if (t === 'bpmn:Participant') return 'participant';
  if (t === 'bpmn:Group') return 'group';
  if (t === 'bpmn:CallActivity') return 'callActivity';
  if (t === 'bpmn:TextAnnotation') return 'textAnnotation';
  if (t === 'bpmn:EventBasedGateway') return 'gatewayEventBased';
  if (t === 'bpmn:ExclusiveGateway') return 'gatewayExclusive';
  if (t === 'bpmn:ParallelGateway') return 'gatewayParallel';
  if (t === 'bpmn:InclusiveGateway') return 'gatewayInclusive';
  if (t === 'bpmn:ComplexGateway') return 'gatewayComplex';
  if (t === 'bpmn:DataObjectReference') return 'dataObject';
  if (t === 'bpmn:DataStoreReference') return 'dataStore';
  if (t === 'bpmn:SequenceFlow') return 'sequenceFlow';
  if (t === 'bpmn:MessageFlow') return 'messageFlow';
  if (t === 'bpmn:Association') return 'association';
  if (t === 'bpmn:DataAssociation' || t === 'bpmn:DataInputAssociation' || t === 'bpmn:DataOutputAssociation') return 'dataAssociation';
  if (t === 'bpmn:Lane') return 'lane';
  return undefined;
}

/** 记法图标元数据：类型 + 变体（事件符号 / 非中断 / 子流程形态 / 循环特性） */
export interface BpmnIconMeta {
  type: string;
  symbol?: string;
  eventSymbol?: string;
  /** 非中断事件变体（边界 cancelActivity=false / 事件子流程开始 isInterrupting=false） */
  nonInterrupting?: boolean;
  /** 活动类循环特性标记（规范 §10.2.2），随图标绘出标记行 */
  loop?: LoopKind;
}

/** 连线记法：图标集整图键（iconSetKeyOf 映射，自绘缩样已废弃） */

/**
 * 画布几何 → 图标等比缩影组：以画布局部坐标（0,0=元素原点）绘制，
 * translate 至 36 视框中心后整体 scale(k)——描边随组缩放，比例与画布逐像素一致。
 */
function canvasGroup(k: number, w: number, h: number, draw: (g: Element) => void): string {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(18 18) scale(${k}) translate(${-w / 2} ${-h / 2})`);
  draw(g);
  return new XMLSerializer().serializeToString(g);
}

/** 无变换组（手绘缩样的字形复用） */
function plainGroup(draw: (g: Element) => void): string {
  const g = document.createElementNS(SVG_NS, 'g');
  draw(g);
  return new XMLSerializer().serializeToString(g);
}

/** 画布事件几何（SIZES.EVENT=38）：缩样 0.68 → 视框内 25.8，环重等比呈现 */
const EVENT_K = 0.68;
/** 画布网关几何（SIZES.GATEWAY=52）：缩样 0.67 → 对角 52 缩后恰满框留描边余量 */
const GATEWAY_K = 0.67;
/** 画布任务盒几何（116×78）：宽向受限 30/116 → 0.26，高 20.3 */
const TASK_K = 0.26;
/** 画布任务盒局部几何（drawCollapsedMarker/drawLoopMarker 消费） */
const TASK_BOX = { x: 0, y: 0, width: 116, height: 78 };

/**
 * 类型条目 → 记法缩样 SVG 字符串（viewBox 36，按 size 缩放输出）。
 * 公开 API：宿主/插件（如属性面板展示选中元素图标）可直接传元素类型
 * 字符串（如 'bpmn:UserTask'）或类型元数据（含事件符号/子流程形态/循环特性变体）。
 */
export function bpmnIconHtml(source: string | BpmnIconMeta, size = 20, fill = '#000000'): string {
  const meta = typeof source === 'string' ? { type: source } : source;

  // 图标集优先：已确认映射的类型直接输出标准剪影图标（元素记法图标固定黑色，
  // 与原自绘 ICON_STROKE 一致；currentColor 场景由 loopMarkerIconHtml 等显式传）
  const setKey = iconSetKeyOf(meta);
  if (setKey) {
    return iconSetSvg(setKey, size, fill);
  }

  const stroke = fill === 'currentColor' ? 'currentColor' : ICON_STROKE;
  const theme: StyleTheme = { stroke, fill: '#ffffff', labelColor: stroke };
  const parts: string[] = [];
  const P = (d: string, extra = '', w = 1.8) =>
    parts.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`);
  const R = (x: number, y: number, w2: number, h2: number, rx = 2, sw = 1.8) =>
    parts.push(`<rect x="${x}" y="${y}" width="${w2}" height="${h2}" rx="${rx}" fill="#ffffff" stroke="${stroke}" stroke-width="${sw}"/>`);

  const t = meta.type;
  const sym = meta.eventSymbol ?? '';

  if (isEventFamily(t)) {
    parts.push(canvasGroup(EVENT_K, 38, 38, (g) => {
      // 环重/双环/虚线笔型与画布 drawEvent 同源（Symbols 常量，单一事实源）
      const outer = circle(g, 19, 19, 19, stroke, '#ffffff', eventRingWeight(t));
      if (meta.nonInterrupting) {
        outer.setAttribute('stroke-dasharray', NON_INTERRUPTING_DASH);
      }
      if (isDoubleRingEvent(t)) {
        circle(g, 19, 19, 16, stroke, 'none', 2);
      }
      if (sym) {
        drawEventSymbol(g, sym, 19, 19, 15, theme, t === 'bpmn:EndEvent' || t === 'bpmn:IntermediateThrowEvent');
      }
    }));
  } else if (isGatewayFamily(t)) {
    parts.push(canvasGroup(GATEWAY_K, 52, 52, (g) => {
      // 画布同源 drawGatewayShape（闭合菱形，描边 2），标记占 0.72 半宽（drawGatewayMarker 同参）；
      // 未登记网关类型（如复杂网关）只画菱形不加标记——标记语义须类型明确，不默认顶替
      drawGatewayShape(g, 52, 52, theme);
      // 标记映射单一来源（Symbols.gatewayMarkerOf，与画布同源；此前缺 complex/实例化变体）
      const markerType = gatewayMarkerOf({ $type: t });
      if (markerType) {
        drawGatewayMarker(g, markerType, 26, 26, 26 * 0.72, theme);
      }
    }));
  } else if (t === 'bpmn:DataObjectReference') {
    parts.push(canvasGroup(0.43, 40, 56, (g) => drawDataObjectShape(g, { x: 0, y: 0, width: 40, height: 56 }, theme)));
  } else if (t === 'bpmn:DataStoreReference') {
    parts.push(canvasGroup(0.48, 50, 50, (g) => drawDataStoreShape(g, { x: 0, y: 0, width: 50, height: 50 }, theme)));
  } else if (t === 'bpmn:TextAnnotation') {
    P('M14 6.5 H7.5 V29.5 H14');
  } else if (t === 'bpmn:Group') {
    // 画布 220×140 圆角 8 虚线 7:5：等比缩样线宽不可读，取可读下限（短划风格一致）
    P('M8 9.5 H28 V26.5 H8 Z', 'stroke-dasharray="3 2.2"', 1.5);
  } else if (t === 'bpmn:SubProcess' && meta.symbol !== 'subProcessCollapsed') {
    // 展开子流程：画布 240×160 比例（1.5:1）缩样；圆角按画布比例（8→1），线宽取可读下限 1.5
    R(3, 8, 30, 20, 1.2, 1.5);
    if (meta.loop) {
      parts.push(plainGroup((g) => drawLoopMarker(g, { width: 36, height: 32 }, meta.loop!, theme)));
    }
  } else {
    // 任务族 / 调用活动 / 折叠子流程：画布 116×78 几何等比缩影
    parts.push(canvasGroup(TASK_K, 116, 78, (g) => {
      // 调用活动画布同款加粗边框 4（规范 §10.2.3），其余 2
      const sw = t === 'bpmn:CallActivity' ? 4 : 2;
      const rect = document.createElementNS(SVG_NS, 'rect');
      for (const [k, v] of Object.entries({
        x: 0, y: 0, width: 116, height: 78, rx: 9, ry: 9,
        fill: '#ffffff', stroke, 'stroke-width': sw
      })) {
        rect.setAttribute(k, String(v));
      }
      g.appendChild(rect);
      if (t === 'bpmn:SubProcess') {
        // 折叠 [+]：画布 drawCollapsedMarker 同形（底边跨骑、底部中央）
        drawCollapsedMarker(g, TASK_BOX, theme);
      } else if (t === 'bpmn:AdHocSubProcess') {
        // Ad-hoc 波浪号（图标集无资产，画布同源自绘记法）
        drawAdHocMarker(g, TASK_BOX.width / 2, TASK_BOX.height, theme);
      } else if (t !== 'bpmn:CallActivity') {
        // 任务字标：画布 drawTaskMarker 同位（中心 14,14，半尺寸 8）
        taskGlyph(g, meta.symbol ?? '', 14, 14, 8, theme);
      }
      if (meta.loop) {
        drawLoopMarker(g, TASK_BOX, meta.loop, theme);
      }
    }));
  }

  return svgShell(parts.join(''), 36, size);
}

/** palette / context pad 类型条目 html（裸 SVG 收不到交互，必须包标准 .entry 外壳） */
export function bpmnEntryHtml(meta: BpmnIconMeta, size = 18): string {
  // currentColor:条目图标随容器文字色,palette/context pad 悬停主题色反馈可见
  // (diagram-js 悬停语义=变色而非换底;固定 #000 会吞掉全部悬停反馈)
  return entryShell(bpmnIconHtml(meta, size, 'currentColor'));
}

/**
 * 循环/多实例标记小图标（replace 弹框标题行切换钮）：图标集剪影（markerLoop /
 * markerMiParallel / markerMiSequential），currentColor 随按钮态着色（active 高亮）。
 */
export function loopMarkerIconHtml(kind: LoopMarkerKind, size = 16): string {
  return iconSetSvg(loopMarkerAssetKey(kind), size, 'currentColor');
}

/**
 * 画布元素 → 记法缩样 SVG（公开 API：属性面板等宿主 UI 传当前选中元素即可）。
 * 变体自动推导：事件取事件定义符号、子流程取折叠形态、活动取循环特性标记。
 */
export function iconOfElement(element: any, size = 20, fill = '#000000'): string {
  const bo = element?.businessObject;
  const type: string = bo?.$type ?? element?.type ?? '';
  const meta: BpmnIconMeta = { type };
  if (isEventFamily(type)) {
    meta.eventSymbol = EventDefinitions.symbolOf(bo) || undefined;
    meta.nonInterrupting = EventDefinitions.nonInterruptingOf(bo);
  }
  if (type === 'bpmn:SubProcess') {
    meta.symbol = bo.triggeredByEvent
      ? 'subProcessEvent'
      : element.isExpanded === false ? 'subProcessCollapsed' : 'subProcessExpanded';
  }
  const loop = loopKindOf(bo);
  if (loop) {
    meta.loop = loop;
  }
  return bpmnIconHtml(meta, size, fill);
}
