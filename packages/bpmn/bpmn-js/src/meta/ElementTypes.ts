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
 * BPMN 元素类型注册表 —— 全库唯一的数据源（可整体被插件替换）。
 *
 * 尺寸体系为自有设计（规范未规定像素尺寸，仅规定形状与比例语义），取值理由随常量注明：
 * - 事件直径 38：内部符号 20px 上下仍留 9px 视觉余量；
 * - 任务盒 116×78：可容纳两行 12px 标签（含 8px 上下内边距），宽约为事件直径 3 倍，横排连线视觉均衡；
 * - 网关 52：对角线约 73，X/O/+ 标记占 45% 仍不触边；
 * - 池 420×220 / 头带 34：头带 34 = 两行竖排标签（12px×1.4 行高）+ 8 余量；
 * - 展开子流程 240×160：容纳一个完整"开始→任务→结束"种子布局；
 * - 数据对象 40×56：接近 ISO 卡片比例，折叠角 12；
 * - 注记 120×64：三行说明文字起步宽度。
 */
import { EventDefinitions } from './EventDefinitions';

export interface ShapeTypeMeta {
  /** BPMN 类型名（= 语义 $type） */
  type: string;
  /** 面板/替换菜单显示名 */
  label: string;
  width: number;
  height: number;
  /** 渲染符号 key（render/Symbols），缺省用 box */
  symbol?: string;
  /** 事件类：事件定义符号（none 类不填） */
  eventSymbol?: string;
  /**
   * 非中断变体（规范 §10.3：虚线外环）：边界事件 cancelActivity=false、
   * 事件子流程内开始事件 isInterrupting=false
   */
  nonInterrupting?: boolean;
  /** palette 分组 id；不填则不进面板（如 lane 由 contextPad 生成） */
  paletteGroup?: string;
  /** palette 排序权重（组内升序） */
  order?: number;
  /** 替换菜单家族 id；不填不可替换 */
  replaceFamily?: string;
  /** 是否可容纳子元素 */
  isContainer?: boolean;
  /** 是否可调整尺寸 */
  resizable?: boolean;
  /** 名称标签绘制位置：internal=形内 / external=形外下方 */
  labelMode?: 'internal' | 'external';
  /** 元素族判定（规则层用） */
  family: ElementFamily;
}

/**
 * 子流程族（规范 §10.3.2：SubProcess / Transaction / AdHocSubProcess
 * 均可嵌套 flowElements）。结构性类型集：不在类型表条目里派生（同 $type 多
 * 形态共享族语义），各消费方判型一律经此谓词，禁止内联三元组字面量比较。
 */
export const SUBPROCESS_FAMILY_TYPES: readonly string[] = [
  'bpmn:SubProcess',
  'bpmn:Transaction',
  'bpmn:AdHocSubProcess'
];

export function isSubProcessFamily(type: string | undefined | null): boolean {
  return type != null && SUBPROCESS_FAMILY_TYPES.includes(type);
}

export interface ConnectionTypeMeta {
  type: string;
  label: string;
  paletteGroup?: string;
  order?: number;
  replaceFamily?: string;
  family: ElementFamily;
}

export type ElementFamily =
  | 'event'
  | 'activity'
  | 'gateway'
  | 'container'
  | 'artifact'
  | 'data'
  | 'flow'
  | 'process';

/**
 * 类型条目的稳定 ASCII 标识：取 $type 本地名，再拼接区分同类型变体的字段
 * （事件定义符号 + 非中断标志；子流程的展开/折叠/事件形态）。用作 palette
 * 条目 id 与图标类名 —— 类名进入 CSS 选择器，必须是合法 CSS 标识符。
 */
export function metaId(meta: { type: string; eventSymbol?: string; symbol?: string; nonInterrupting?: boolean }): string {
  const local = meta.type.split(':').pop() ?? meta.type;
  const variants: string[] = [];
  if (meta.eventSymbol) variants.push(meta.eventSymbol);
  if (meta.nonInterrupting) variants.push('ni');
  if (meta.type === 'bpmn:SubProcess') {
    variants.push(
      meta.symbol === 'subProcessCollapsed' ? 'collapsed' : meta.symbol === 'subProcessEvent' ? 'event' : 'expanded'
    );
  }
  if (meta.type === 'bpmn:AdHocSubProcess') {
    variants.push(meta.symbol === 'adHocSubProcessCollapsed' ? 'collapsed' : 'expanded');
  }
  return variants.length ? `${local}-${variants.join('-')}` : local;
}

/** 子流程展开态推导：SubProcess 的 expanded/event 变体=true、collapsed=false；
 *  AdHocSubProcess 同理（collapsed 变体=false）；其余类型 undefined */
export function subProcessExpandedOf(meta: ShapeTypeMeta): boolean | undefined {
  if (meta.type === 'bpmn:AdHocSubProcess') {
    return meta.symbol !== 'adHocSubProcessCollapsed';
  }
  if (meta.type !== 'bpmn:SubProcess') {
    return undefined;
  }
  return meta.symbol !== 'subProcessCollapsed';
}

export const SIZES = {
  EVENT: 38,
  GATEWAY: 52,
  TASK_W: 116,
  TASK_H: 78,
  SUBPROCESS_W: 240,
  SUBPROCESS_H: 160,
  /** 池默认尺寸=恰容一条最小泳道（MIN_LANE_SPAN+头带 / MIN_LANE_BAND），垂直朝向经 containerSize 转置 */
  POOL_W: 634,
  POOL_H: 250,
  POOL_HEADER: 34,
  /** 插入泳道带的默认厚度=最小带厚（产品下限，见 PoolGeometry.MIN_LANE_BAND） */
  LANE_H: 250,
  DATA_W: 40,
  DATA_H: 56,
  /** 数据存储：等宽高圆柱（规范示例为扁顶椭圆的矮圆柱，50 保证两道刻痕可辨） */
  DATASTORE: 50,
  /** 文本注记默认 100×40（对齐用户参考规格样例；可拖角调整大小） */
  ANNOTATION_W: 100,
  ANNOTATION_H: 40,
  GROUP_W: 220,
  GROUP_H: 140,
  /** 追加间距：源右缘 → 新元素左缘 */
  APPEND_GAP: 36,
  /** 追加碰撞错开的步进距离 */
  APPEND_STEP: 46
} as const;

/** 事件族：按“开始/中间捕获/中间抛出/结束/边界”分替换族（规范 §10.2 分类） */
export const SHAPE_TYPES: ShapeTypeMeta[] = [
  // ---- 开始事件（细单线圆；规范：仅可捕获类定义） ----
  {
    type: 'bpmn:StartEvent', label: '开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', paletteGroup: 'startEvents', order: 10, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '消息开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'message', paletteGroup: 'startEvents', order: 20, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '定时开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'timer', paletteGroup: 'startEvents', order: 30, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  // 规范 §10.5.1 Table 10.5 其余触发（补齐全矩阵，2026-10-21 规范全量对齐）
  {
    type: 'bpmn:StartEvent', label: '错误开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'error', paletteGroup: 'startEvents', order: 40, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '升级开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'escalation', paletteGroup: 'startEvents', order: 50, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '条件开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'conditional', paletteGroup: 'startEvents', order: 60, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '信号开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'signal', paletteGroup: 'startEvents', order: 70, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '多实例开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'multiple', paletteGroup: 'startEvents', order: 80, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '并行多实例开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'parallelMultiple', paletteGroup: 'startEvents', order: 90, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    // 规范 §10.5：补偿开始仅事件子流程内合法
    type: 'bpmn:StartEvent', label: '补偿开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'compensation', paletteGroup: 'startEvents', order: 95, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  // 非中断开始（事件子流程专用；规范 Table 10.86：虚线外环 + isInterrupting=false）
  {
    type: 'bpmn:StartEvent', label: '非中断消息开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'message', nonInterrupting: true, paletteGroup: 'startEvents', order: 110, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '非中断定时开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'timer', nonInterrupting: true, paletteGroup: 'startEvents', order: 120, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '非中断信号开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'signal', nonInterrupting: true, paletteGroup: 'startEvents', order: 130, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '非中断条件开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'conditional', nonInterrupting: true, paletteGroup: 'startEvents', order: 140, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '非中断升级开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'escalation', nonInterrupting: true, paletteGroup: 'startEvents', order: 150, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '非中断多实例开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'multiple', nonInterrupting: true, paletteGroup: 'startEvents', order: 160, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:StartEvent', label: '非中断并行多实例开始事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventStart', eventSymbol: 'parallelMultiple', nonInterrupting: true, paletteGroup: 'startEvents', order: 170, replaceFamily: 'startEvent',
    family: 'event', labelMode: 'external'
  },
  // ---- 中间捕获（细双线圆） ----
  {
    type: 'bpmn:IntermediateCatchEvent', label: '定时中间捕获', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventCatch', eventSymbol: 'timer', paletteGroup: 'intermediateCatch', order: 10, replaceFamily: 'intermediateCatch',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateCatchEvent', label: '消息中间捕获', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventCatch', eventSymbol: 'message', paletteGroup: 'intermediateCatch', order: 20, replaceFamily: 'intermediateCatch',
    family: 'event', labelMode: 'external'
  },
  // 规范 §10.5.2 其余捕获触发（错误/升级捕获以边界语境为主，此处按记法补齐）
  {
    type: 'bpmn:IntermediateCatchEvent', label: '条件中间捕获', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventCatch', eventSymbol: 'conditional', paletteGroup: 'intermediateCatch', order: 30, replaceFamily: 'intermediateCatch',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateCatchEvent', label: '链接中间捕获', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventCatch', eventSymbol: 'link', paletteGroup: 'intermediateCatch', order: 40, replaceFamily: 'intermediateCatch',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateCatchEvent', label: '信号中间捕获', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventCatch', eventSymbol: 'signal', paletteGroup: 'intermediateCatch', order: 50, replaceFamily: 'intermediateCatch',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateCatchEvent', label: '错误中间捕获', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventCatch', eventSymbol: 'error', paletteGroup: 'intermediateCatch', order: 60, replaceFamily: 'intermediateCatch',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateCatchEvent', label: '升级中间捕获', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventCatch', eventSymbol: 'escalation', paletteGroup: 'intermediateCatch', order: 70, replaceFamily: 'intermediateCatch',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateCatchEvent', label: '多实例中间捕获', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventCatch', eventSymbol: 'multiple', paletteGroup: 'intermediateCatch', order: 80, replaceFamily: 'intermediateCatch',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateCatchEvent', label: '并行多实例中间捕获', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventCatch', eventSymbol: 'parallelMultiple', paletteGroup: 'intermediateCatch', order: 90, replaceFamily: 'intermediateCatch',
    family: 'event', labelMode: 'external'
  },
  // ---- 中间抛出 ----
  {
    type: 'bpmn:IntermediateThrowEvent', label: '无定义中间抛出', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventThrow', paletteGroup: 'intermediateThrow', order: 10, replaceFamily: 'intermediateThrow',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateThrowEvent', label: '消息中间抛出', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventThrow', eventSymbol: 'message', paletteGroup: 'intermediateThrow', order: 20, replaceFamily: 'intermediateThrow',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateThrowEvent', label: '升级中间抛出', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventThrow', eventSymbol: 'escalation', paletteGroup: 'intermediateThrow', order: 30, replaceFamily: 'intermediateThrow',
    family: 'event', labelMode: 'external'
  },
  // 规范 §10.5.2 抛出族其余结果（link/signal/compensation/multiple）
  {
    type: 'bpmn:IntermediateThrowEvent', label: '链接中间抛出', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventThrow', eventSymbol: 'link', paletteGroup: 'intermediateThrow', order: 40, replaceFamily: 'intermediateThrow',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateThrowEvent', label: '信号中间抛出', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventThrow', eventSymbol: 'signal', paletteGroup: 'intermediateThrow', order: 50, replaceFamily: 'intermediateThrow',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateThrowEvent', label: '补偿中间抛出', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventThrow', eventSymbol: 'compensation', paletteGroup: 'intermediateThrow', order: 60, replaceFamily: 'intermediateThrow',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:IntermediateThrowEvent', label: '多实例中间抛出', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventThrow', eventSymbol: 'multiple', paletteGroup: 'intermediateThrow', order: 70, replaceFamily: 'intermediateThrow',
    family: 'event', labelMode: 'external'
  },
  // ---- 边界事件（吸附宿主） ----
  {
    type: 'bpmn:BoundaryEvent', label: '定时边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'timer', paletteGroup: 'boundaryEvents', order: 10, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '消息边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'message', paletteGroup: 'boundaryEvents', order: 20, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  // 规范 §10.5.2 Table 10.90 边界全矩阵（补偿/取消恒为中断型）
  {
    type: 'bpmn:BoundaryEvent', label: '错误边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'error', paletteGroup: 'boundaryEvents', order: 30, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '升级边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'escalation', paletteGroup: 'boundaryEvents', order: 40, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '条件边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'conditional', paletteGroup: 'boundaryEvents', order: 50, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '信号边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'signal', paletteGroup: 'boundaryEvents', order: 60, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '多实例边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'multiple', paletteGroup: 'boundaryEvents', order: 70, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '并行多实例边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'parallelMultiple', paletteGroup: 'boundaryEvents', order: 80, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    // 规范 §10.5：取消边界仅事务子流程边界合法
    type: 'bpmn:BoundaryEvent', label: '取消边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'cancel', paletteGroup: 'boundaryEvents', order: 90, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '补偿边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'compensation', paletteGroup: 'boundaryEvents', order: 95, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  // 非中断边界（规范 Table 10.90：虚线外环 + cancelActivity=false）
  {
    type: 'bpmn:BoundaryEvent', label: '非中断定时边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'timer', nonInterrupting: true, paletteGroup: 'boundaryEvents', order: 110, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '非中断消息边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'message', nonInterrupting: true, paletteGroup: 'boundaryEvents', order: 120, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '非中断升级边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'escalation', nonInterrupting: true, paletteGroup: 'boundaryEvents', order: 130, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '非中断条件边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'conditional', nonInterrupting: true, paletteGroup: 'boundaryEvents', order: 140, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '非中断信号边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'signal', nonInterrupting: true, paletteGroup: 'boundaryEvents', order: 150, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '非中断多实例边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'multiple', nonInterrupting: true, paletteGroup: 'boundaryEvents', order: 160, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:BoundaryEvent', label: '非中断并行多实例边界事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventBoundary', eventSymbol: 'parallelMultiple', nonInterrupting: true, paletteGroup: 'boundaryEvents', order: 170, replaceFamily: 'boundaryEvent',
    family: 'event', labelMode: 'external'
  },
  // ---- 结束事件（粗单线圆） ----
  {
    type: 'bpmn:EndEvent', label: '结束事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventEnd', paletteGroup: 'endEvents', order: 10, replaceFamily: 'endEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:EndEvent', label: '错误结束事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventEnd', eventSymbol: 'error', paletteGroup: 'endEvents', order: 20, replaceFamily: 'endEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:EndEvent', label: '终止结束事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventEnd', eventSymbol: 'terminate', paletteGroup: 'endEvents', order: 30, replaceFamily: 'endEvent',
    family: 'event', labelMode: 'external'
  },
  // 规范 §10.5.3 Table 10.88 九种结果补齐（cancel 仅事务子流程内合法）
  {
    type: 'bpmn:EndEvent', label: '消息结束事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventEnd', eventSymbol: 'message', paletteGroup: 'endEvents', order: 40, replaceFamily: 'endEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:EndEvent', label: '升级结束事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventEnd', eventSymbol: 'escalation', paletteGroup: 'endEvents', order: 50, replaceFamily: 'endEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:EndEvent', label: '补偿结束事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventEnd', eventSymbol: 'compensation', paletteGroup: 'endEvents', order: 60, replaceFamily: 'endEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:EndEvent', label: '信号结束事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventEnd', eventSymbol: 'signal', paletteGroup: 'endEvents', order: 70, replaceFamily: 'endEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:EndEvent', label: '多实例结束事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventEnd', eventSymbol: 'multiple', paletteGroup: 'endEvents', order: 80, replaceFamily: 'endEvent',
    family: 'event', labelMode: 'external'
  },
  {
    type: 'bpmn:EndEvent', label: '取消结束事件', width: SIZES.EVENT, height: SIZES.EVENT,
    symbol: 'eventEnd', eventSymbol: 'cancel', paletteGroup: 'endEvents', order: 90, replaceFamily: 'endEvent',
    family: 'event', labelMode: 'external'
  },
  // ---- 活动族 ----
  { type: 'bpmn:Task', label: '任务', width: SIZES.TASK_W, height: SIZES.TASK_H, paletteGroup: 'activities', order: 10, replaceFamily: 'activity', resizable: true, family: 'activity', labelMode: 'internal' },
  { type: 'bpmn:UserTask', label: '用户任务', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'taskUser', paletteGroup: 'activities', order: 20, replaceFamily: 'activity', resizable: true, family: 'activity', labelMode: 'internal' },
  { type: 'bpmn:ServiceTask', label: '服务任务', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'taskService', paletteGroup: 'activities', order: 30, replaceFamily: 'activity', resizable: true, family: 'activity', labelMode: 'internal' },
  { type: 'bpmn:ScriptTask', label: '脚本任务', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'taskScript', paletteGroup: 'activities', order: 40, replaceFamily: 'activity', resizable: true, family: 'activity', labelMode: 'internal' },
  { type: 'bpmn:ManualTask', label: '手工任务', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'taskManual', paletteGroup: 'activities', order: 50, replaceFamily: 'activity', resizable: true, family: 'activity', labelMode: 'internal' },
  { type: 'bpmn:SendTask', label: '发送任务', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'taskSend', paletteGroup: 'activities', order: 60, replaceFamily: 'activity', resizable: true, family: 'activity', labelMode: 'internal' },
  { type: 'bpmn:ReceiveTask', label: '接收任务', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'taskReceive', paletteGroup: 'activities', order: 70, replaceFamily: 'activity', resizable: true, family: 'activity', labelMode: 'internal' },
  { type: 'bpmn:BusinessRuleTask', label: '业务规则任务', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'taskBusinessRule', paletteGroup: 'activities', order: 75, replaceFamily: 'activity', resizable: true, family: 'activity', labelMode: 'internal' },
  { type: 'bpmn:CallActivity', label: '调用活动', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'callActivity', paletteGroup: 'activities', order: 80, replaceFamily: 'activity', resizable: true, family: 'activity', labelMode: 'internal' },
  // ---- 子流程 ----
  { type: 'bpmn:SubProcess', label: '展开子流程', width: SIZES.SUBPROCESS_W, height: SIZES.SUBPROCESS_H, symbol: 'subProcessExpanded', paletteGroup: 'subProcesses', order: 10, replaceFamily: 'subProcess', isContainer: true, resizable: true, family: 'activity', labelMode: 'internal' },
  { type: 'bpmn:SubProcess', label: '折叠子流程', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'subProcessCollapsed', paletteGroup: 'subProcesses', order: 20, replaceFamily: 'subProcess', resizable: true, family: 'activity', labelMode: 'internal' },
  // 事件子流程（SubProcess triggeredByEvent=true，规范 §10.5.4：虚线边框）
  { type: 'bpmn:SubProcess', label: '事件子流程', width: SIZES.SUBPROCESS_W, height: SIZES.SUBPROCESS_H, symbol: 'subProcessEvent', paletteGroup: 'subProcesses', order: 30, replaceFamily: 'subProcess', isContainer: true, resizable: true, family: 'activity', labelMode: 'internal' },
  // 事务子流程（规范 §10.5.6：双线边框；恒展开态）
  { type: 'bpmn:Transaction', label: '事务子流程', width: SIZES.SUBPROCESS_W, height: SIZES.SUBPROCESS_H, symbol: 'transaction', paletteGroup: 'subProcesses', order: 40, replaceFamily: 'subProcess', isContainer: true, resizable: true, family: 'activity', labelMode: 'internal' },
  // Ad-hoc 子流程（规范 §10.5.5：底部波浪号标记）
  { type: 'bpmn:AdHocSubProcess', label: 'Ad-hoc 子流程', width: SIZES.SUBPROCESS_W, height: SIZES.SUBPROCESS_H, symbol: 'adHocSubProcess', paletteGroup: 'subProcesses', order: 50, replaceFamily: 'subProcess', isContainer: true, resizable: true, family: 'activity', labelMode: 'internal' },
  // 折叠形态排在展开之后：shapeByType 取数组首条，展开态（容器/大尺寸）须胜出
  { type: 'bpmn:AdHocSubProcess', label: 'Ad-hoc 子流程（折叠）', width: SIZES.TASK_W, height: SIZES.TASK_H, symbol: 'adHocSubProcessCollapsed', paletteGroup: 'subProcesses', order: 55, replaceFamily: 'subProcess', resizable: true, family: 'activity', labelMode: 'internal' },
  // ---- 网关 ----
  { type: 'bpmn:ExclusiveGateway', label: '排他网关', width: SIZES.GATEWAY, height: SIZES.GATEWAY, symbol: 'gatewayExclusive', paletteGroup: 'gateways', order: 10, replaceFamily: 'gateway', family: 'gateway', labelMode: 'external' },
  { type: 'bpmn:ParallelGateway', label: '并行网关', width: SIZES.GATEWAY, height: SIZES.GATEWAY, symbol: 'gatewayParallel', paletteGroup: 'gateways', order: 20, replaceFamily: 'gateway', family: 'gateway', labelMode: 'external' },
  { type: 'bpmn:InclusiveGateway', label: '包容网关', width: SIZES.GATEWAY, height: SIZES.GATEWAY, symbol: 'gatewayInclusive', paletteGroup: 'gateways', order: 30, replaceFamily: 'gateway', family: 'gateway', labelMode: 'external' },
  { type: 'bpmn:EventBasedGateway', label: '事件网关', width: SIZES.GATEWAY, height: SIZES.GATEWAY, symbol: 'gatewayEventBased', paletteGroup: 'gateways', order: 40, replaceFamily: 'gateway', family: 'gateway', labelMode: 'external' },
  { type: 'bpmn:ComplexGateway', label: '复杂网关', width: SIZES.GATEWAY, height: SIZES.GATEWAY, symbol: 'gatewayComplex', paletteGroup: 'gateways', order: 50, replaceFamily: 'gateway', family: 'gateway', labelMode: 'external' },
  // ---- 容器 ----
  { type: 'bpmn:Participant', label: '池/参与者', width: SIZES.POOL_W, height: SIZES.POOL_H, symbol: 'participant', paletteGroup: 'containers', order: 10, resizable: true, family: 'container', labelMode: 'internal' },
  // ---- 数据与制品 ----
  { type: 'bpmn:DataObjectReference', label: '数据对象', width: SIZES.DATA_W, height: SIZES.DATA_H, symbol: 'dataObject', paletteGroup: 'artifacts', order: 10, family: 'data', labelMode: 'external' },
  { type: 'bpmn:DataStoreReference', label: '数据存储', width: SIZES.DATASTORE, height: SIZES.DATASTORE, symbol: 'dataStore', paletteGroup: 'artifacts', order: 15, family: 'data', labelMode: 'external' },
  { type: 'bpmn:TextAnnotation', label: '文本注记', width: SIZES.ANNOTATION_W, height: SIZES.ANNOTATION_H, symbol: 'textAnnotation', paletteGroup: 'artifacts', order: 20, resizable: true, family: 'artifact', labelMode: 'internal' },
  { type: 'bpmn:Group', label: '分组', width: SIZES.GROUP_W, height: SIZES.GROUP_H, symbol: 'group', paletteGroup: 'artifacts', order: 30, resizable: true, family: 'artifact', labelMode: 'external' }
];

export const CONNECTION_TYPES: ConnectionTypeMeta[] = [
  { type: 'bpmn:SequenceFlow', label: '顺序流', paletteGroup: 'connectors', order: 10, family: 'flow' },
  { type: 'bpmn:MessageFlow', label: '消息流', paletteGroup: 'connectors', order: 20, family: 'flow' },
  { type: 'bpmn:Association', label: '关联', paletteGroup: 'connectors', order: 30, family: 'flow' },
  { type: 'bpmn:DataAssociation', label: '数据关联', paletteGroup: 'connectors', order: 40, family: 'flow' }
];

// ---------------- 类型族谓词（单一事实源） ----------------
// 族判定派生自类型表：新增类型只登记数据，规则/工厂/读写器/Provider/渲染各处
// 判型自动跟随——禁止在消费方内联 $type 字面量比较或后缀匹配（本次收敛前
// 子流程三元组散布 9 处、容器谓词 5 处、endsWith 判型 17 处、规则层硬编码
// 集合 3 套）。结构性类型集（池族/子流程族）保持显式列举：Lane 不上注册表。

/** $type → family（形状+连线全量；同 $type 多形态族恒同，Map 覆盖无副作用） */
const FAMILY_BY_TYPE: ReadonlyMap<string, ElementFamily> = new Map(
  [...SHAPE_TYPES, ...CONNECTION_TYPES].map((meta) => [meta.type, meta.family])
);

function familyOf(type: string | undefined | null, family: ElementFamily): boolean {
  return type != null && FAMILY_BY_TYPE.get(type) === family;
}

export function isEventFamily(type?: string | null): boolean {
  return familyOf(type, 'event');
}

export function isGatewayFamily(type?: string | null): boolean {
  return familyOf(type, 'gateway');
}

export function isActivityFamily(type?: string | null): boolean {
  return familyOf(type, 'activity');
}

export function isDataFamily(type?: string | null): boolean {
  return familyOf(type, 'data');
}

export function isArtifactFamily(type?: string | null): boolean {
  return familyOf(type, 'artifact');
}

/** 流节点（规范 §10.2 FlowNode = 事件/活动/网关）：连线类型推断与作用域判定 */
export function isFlowNodeType(type?: string | null): boolean {
  if (type == null) {
    return false;
  }
  const family = FAMILY_BY_TYPE.get(type);
  return family === 'event' || family === 'activity' || family === 'gateway';
}

/** 池族（Participant/Lane；Lane 不上注册表，显式列举） */
export function isPoolFamily(type?: string | null): boolean {
  return type === 'bpmn:Participant' || type === 'bpmn:Lane';
}

/** 落点容器（池/泳道/展开子流程）：创建/移动/菜单承载判定（折叠子流程不承载） */
export function isContainerType(type?: string | null, isExpanded?: boolean): boolean {
  return isPoolFamily(type) || (isSubProcessFamily(type) && isExpanded !== false);
}

/**
 * palette 快捷集：默认直接展示的条目（metaId 稳定 id，顺序即面板序）。
 * 取值=产品规定的直列清单（创建顺序：事件族 → 网关 → 任务 → 子流程 →
 * 数据 → 容器 → 分组）：开始事件 / 中间事件 / 结束事件 / 排他网关 / 任务 /
 * 折叠子流程 / 数据对象 / 数据存储 / 池 / 分组；其余全部类型经面板底部 "…"
 * 打开创建弹框选用。宿主可用 `config.paletteQuickIds` 整体替换（见类注释）。
 * 挂为类静态公开：宿主替换快捷集时可直接引用作缺省集或拼装子集。
 */
/**
 * 类型注册表服务。palette 条目三级插件化：
 * 1. 配置级——`new Modeler({ paletteQuickIds: [...] })` 覆盖快捷集（metaId 数组，
 *    未知 id 直接 throw 不静默跳过；[] 合法=面板只剩工具与 "…"）；
 * 2. Provider 级——palette.registerProvider 追加/覆盖条目（diagram-js 多 Provider
 *    合并语义，插件可注入全新条目，见 examples sample-plugin）；
 * 3. 服务级——didi 覆盖 `bpmnElementTypes` 整体替换注册表（增删类型/改尺寸）。
 */
export class BpmnElementTypes {
  static $inject = ['config.paletteQuickIds'];

  /** 默认快捷集（9 条；见上方取值说明），宿主未传 paletteQuickIds 时生效 */
  static readonly PALETTE_QUICK_IDS: readonly string[] = [
    'StartEvent',
    'IntermediateThrowEvent',
    'EndEvent',
    'ExclusiveGateway',
    'Task',
    'DataObjectReference',
    'DataStoreReference',
    'Participant',
    'Group'
  ];

  private readonly shapeByType = new Map<string, ShapeTypeMeta>();
  private readonly connectionByType = new Map<string, ConnectionTypeMeta>();
  private readonly quickIds: readonly string[];

  constructor(quickIds?: string[]) {
    for (const meta of SHAPE_TYPES) {
      if (!this.shapeByType.has(meta.type)) {
        this.shapeByType.set(meta.type, meta);
      }
    }
    for (const meta of CONNECTION_TYPES) {
      this.connectionByType.set(meta.type, meta);
    }

    // 注册表构造后只读：palette 条目的过滤/排序一次算好并缓存
    // （这些查询在每次 palette/contextPad/弹框打开时都会走，避免重复排序）
    this.paletteShapes = SHAPE_TYPES.filter((meta) => !!meta.paletteGroup)
      .slice()
      .sort((a, b) => (a.paletteGroup! === b.paletteGroup! ? (a.order ?? 0) - (b.order ?? 0) : 0));
    this.paletteConnections = CONNECTION_TYPES.filter((meta) => !!meta.paletteGroup)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (quickIds !== undefined) {
      if (!Array.isArray(quickIds)) {
        throw new Error(`paletteQuickIds 必须是 metaId 字符串数组，收到：${typeof quickIds}`);
      }
      // 快捷 id 必须一一对应注册表条目：未知 id 属于宿主配置错误，禁止静默丢弃
      const byId = new Map(this.paletteShapes.map((meta) => [metaId(meta), meta] as const));
      for (const id of quickIds) {
        if (!byId.has(id)) {
          throw new Error(`paletteQuickIds 含未注册的 metaId：${id}（可用值见 ElementTypes 注册表）`);
        }
      }
      this.quickIds = quickIds;
    } else {
      this.quickIds = BpmnElementTypes.PALETTE_QUICK_IDS;
    }
    const byId = new Map(this.paletteShapes.map((meta) => [metaId(meta), meta] as const));
    this.quickShapes = this.quickIds.map((id) => byId.get(id)!);
  }

  private readonly paletteShapes: ShapeTypeMeta[];
  private readonly paletteConnections: ConnectionTypeMeta[];
  private readonly quickShapes: ShapeTypeMeta[];

  shapeMeta(type: string): ShapeTypeMeta | undefined {
    return this.shapeByType.get(type);
  }

  connectionMeta(type: string): ConnectionTypeMeta | undefined {
    return this.connectionByType.get(type);
  }

  defaultSize(type: string): { width: number; height: number } | undefined {
    const meta = this.shapeByType.get(type);
    if (!meta) {
      return undefined;
    }
    // 注册表以展开态登记 SubProcess；折叠态任务盒特例在
    // BpmnElementFactory.defaultSize（工厂能感知创建时的 isExpanded 属性）
    return { width: meta.width, height: meta.height };
  }

  family(type: string): ElementFamily | undefined {
    return this.shapeByType.get(type)?.family ?? this.connectionByType.get(type)?.family;
  }

  /** palette 条目（按分组与组内 order 排序；构造时算好的只读缓存） */
  paletteShapeEntries(): ShapeTypeMeta[] {
    return this.paletteShapes;
  }

  paletteConnectionEntries(): ConnectionTypeMeta[] {
    return this.paletteConnections;
  }

  /** palette 快捷集条目（默认展示；按生效的 quickIds 给定序） */
  paletteQuickShapeEntries(): ShapeTypeMeta[] {
    return this.quickShapes;
  }

  /** 类型元数据 → 画布创建载荷（单一来源：palette/菜单/context pad 快捷追加共消费） */
  createAttrs(meta: ShapeTypeMeta): { type: string; eventSymbol?: string; nonInterrupting?: boolean; symbol?: string; isExpanded?: boolean } {
    const attrs: { type: string; eventSymbol?: string; nonInterrupting?: boolean; symbol?: string; isExpanded?: boolean } = { type: meta.type };
    if (meta.eventSymbol) {
      attrs.eventSymbol = meta.eventSymbol;
    }
    if (meta.nonInterrupting) {
      attrs.nonInterrupting = true;
    }
    if (meta.symbol) {
      attrs.symbol = meta.symbol;
    }
    const isExpanded = subProcessExpandedOf(meta);
    if (isExpanded !== undefined) {
      attrs.isExpanded = isExpanded;
    }
    return attrs;
  }

  /** 替换族成员（全量；"与当前元素同形"的排除经 matchesElement 判定）。
   *  任务族（activity）额外收录四个子流程 morph 形态（用户定规 2026-10-25：
   *  折叠/展开 + Ad-hoc 折叠/展开——任务可改成的目标；事件/事务子流程不在列。
   *  反向不开放：子流程元素的替换菜单仍只列子流程族）。
   *  中间事件族（intermediateCatch/intermediateThrow 两族同集对称，用户定规
   *  2026-10-25）：开始/结束事件 + 五捕获（消息/定时/条件/链接/信号）+ 六抛出
   *  （消息/升级/链接/补偿/信号/多实例）；错误/升级/多实例/并行多实例捕获与
   *  无定义抛出不在列。反向不开放：开始/结束元素的替换菜单仍只列各自族 */
  replaceTargets(familyId: string): ShapeTypeMeta[] {
    if (familyId === 'activity') {
      const morphSymbols = new Set(['subProcessExpanded', 'subProcessCollapsed', 'adHocSubProcess', 'adHocSubProcessCollapsed']);
      return SHAPE_TYPES.filter((meta) =>
        meta.replaceFamily === 'activity'
        || (meta.replaceFamily === 'subProcess' && morphSymbols.has(meta.symbol ?? ''))
      );
    }
    if (familyId === 'intermediateCatch' || familyId === 'intermediateThrow') {
      const catchSymbols = new Set(['message', 'timer', 'conditional', 'link', 'signal']);
      const throwSymbols = new Set(['message', 'escalation', 'link', 'compensation', 'signal', 'multiple']);
      return SHAPE_TYPES.filter((meta) =>
        (meta.type === 'bpmn:StartEvent' && !meta.eventSymbol)
        || (meta.type === 'bpmn:EndEvent' && !meta.eventSymbol)
        || (meta.type === 'bpmn:IntermediateCatchEvent' && catchSymbols.has(meta.eventSymbol ?? ''))
        || (meta.type === 'bpmn:IntermediateThrowEvent' && throwSymbols.has(meta.eventSymbol ?? ''))
      );
    }
    return SHAPE_TYPES.filter((meta) => meta.replaceFamily === familyId);
  }

  /**
   * 注册表形态与画布元素是否同形（替换菜单排除自身用）：五轴一体
   * （$type / 事件符号 / 非中断 / 事件子流程 / 子流程折叠态）。label 不是
   * 身份——任一轴缺比都会让孪生形态（如中断与非中断、事件与普通子流程）
   * 互被误排。非中断的模型语义：边界 cancelActivity===false、开始
   * isInterrupting===false（与 BpmnElementFactory / ReplaceElementHandler
   * 落模型方向互逆）。
   */
  matchesElement(meta: ShapeTypeMeta, element: any): boolean {
    const bo = element.businessObject;
    if (!bo || meta.type !== bo.$type) {
      return false;
    }
    if ((meta.eventSymbol ?? null) !== EventDefinitions.symbolOf(bo)) {
      return false;
    }
    const nonInterrupting = bo.cancelActivity === false || bo.isInterrupting === false;
    if ((meta.nonInterrupting ?? false) !== nonInterrupting) {
      return false;
    }
    // 变体通用式（symbol 轴 ⇄ bo 布尔轴）：非对应族的 meta symbol 恒非该变体、
    // bo 布尔恒 undefined→false，两侧同为 false 天然相等，无需按类型分支
    if ((meta.symbol === 'subProcessEvent') !== (bo.triggeredByEvent === true)) {
      return false;
    }
    // 折叠轴（SubProcess/AdHocSubProcess 同判）：meta 折叠变体 ⇄ element.isExpanded=false
    const collapsedVariant = meta.symbol === 'subProcessCollapsed' || meta.symbol === 'adHocSubProcessCollapsed';
    return collapsedVariant === (element.isExpanded === false);
  }

  /** 面板分组定义（顺序即展示顺序） */
  static readonly PALETTE_GROUPS: { id: string; label: string }[] = [
    { id: 'startEvents', label: '开始事件' },
    { id: 'intermediateCatch', label: '中间捕获' },
    { id: 'intermediateThrow', label: '中间抛出' },
    { id: 'boundaryEvents', label: '边界事件' },
    { id: 'endEvents', label: '结束事件' },
    { id: 'activities', label: '活动' },
    { id: 'subProcesses', label: '子流程' },
    { id: 'gateways', label: '网关' },
    { id: 'containers', label: '容器' },
    { id: 'artifacts', label: '数据与制品' },
    { id: 'connectors', label: '连线' }
  ];
}
