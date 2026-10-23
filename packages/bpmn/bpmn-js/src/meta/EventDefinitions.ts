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
 * BPMN 事件定义族（规范 §10.3.2-§10.3.9、§10.5）。
 *
 * 事件定义决定事件内符号（如 timer=时钟、message=信封）。这里只登记类型名与
 * 符号 key 的映射，符号字形由 render/Symbols.ts 按图标集键绘制。
 *
 * multiple / parallelMultiple 不是事件定义类型（规范 §10.5：无专属
 * EventDefinition 子类，由「多个事件定义 + parallelMultiple 属性」表达），
 * 仅作为符号 key 存在：symbolOf 对多定义事件推导之，构造侧由
 * BpmnFactory.applyEventSymbol 组装双定义。
 */

export type EventDefinitionKind =
  | 'message'
  | 'timer'
  | 'error'
  | 'escalation'
  | 'signal'
  | 'conditional'
  | 'terminate'
  | 'link'
  | 'cancel'
  | 'compensation'
  /** 多定义事件（规范 §10.5：>1 个事件定义即多实例记法=五边形） */
  | 'multiple'
  /** 并行多定义（多定义 + parallelMultiple 属性=开口加号记法） */
  | 'parallelMultiple';

/** 事件定义 $type → 符号 key（multiple/parallelMultiple 无 $type，见文件头） */
const DEFINITION_TYPE_TO_SYMBOL: Record<string, string> = {
  'bpmn:MessageEventDefinition': 'message',
  'bpmn:TimerEventDefinition': 'timer',
  'bpmn:ErrorEventDefinition': 'error',
  'bpmn:EscalationEventDefinition': 'escalation',
  'bpmn:SignalEventDefinition': 'signal',
  'bpmn:ConditionalEventDefinition': 'conditional',
  'bpmn:TerminateEventDefinition': 'terminate',
  'bpmn:LinkEventDefinition': 'link',
  'bpmn:CancelEventDefinition': 'cancel',
  'bpmn:CompensateEventDefinition': 'compensation'
};

/** 符号 key → 缺省事件定义 $type（创建/替换时使用；multiple/parallelMultiple 除外） */
const SYMBOL_TO_DEFINITION_TYPE: Record<string, string> = invert(DEFINITION_TYPE_TO_SYMBOL);

function invert(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(map)) {
    out[map[k]] = k;
  }
  return out;
}

export const EventDefinitions = {
  /**
   * 取事件符号：单定义按 $type 映射；多定义（规范 §10.3.12 multiple）按
   * parallelMultiple 属性推导 parallelMultiple（开口加号），否则 multiple（五边形）。
   */
  symbolOf(event: { eventDefinitions?: any[]; parallelMultiple?: boolean }): string | null {
    const defs = event.eventDefinitions;
    if (!defs || defs.length === 0) {
      return null;
    }
    if (defs.length > 1) {
      return event.parallelMultiple === true ? 'parallelMultiple' : 'multiple';
    }
    return DEFINITION_TYPE_TO_SYMBOL[defs[0].$type] ?? null;
  },

  /** 由符号取事件定义 $type（multiple/parallelMultiple 为多定义形态，返回 null）；实例创建走 BpmnFactory（moddle 类型化） */
  definitionType(symbol: string): string | null {
    return SYMBOL_TO_DEFINITION_TYPE[symbol] ?? null;
  },

  /** multiple/parallelMultiple 是否为虚拟符号（多定义形态，无单一 $type） */
  isVirtualSymbol(symbol: string): boolean {
    return symbol === 'multiple' || symbol === 'parallelMultiple';
  },

  isDefinitionType(type: string): boolean {
    return type in DEFINITION_TYPE_TO_SYMBOL;
  }
};
