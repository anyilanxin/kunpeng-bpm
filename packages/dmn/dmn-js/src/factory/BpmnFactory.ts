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
 * 语义对象工厂：经 BpmnModdle（moddle 引擎）类型化创建 businessObject。
 *
 * 所有创建集中于此，保证：id 统一经 ids 分配（claim），事件定义、缺省属性
 * （如 boundaryEvent.cancelActivity 规范缺省 true）在此一次成型。
 * 元素原型与属性校验由元模型描述驱动（未知类型即抛错，配置错误早暴露）。
 */
import { Ids } from 'ids';
import type { BpmnModdle } from '../meta/BpmnModdle';
import type {
  BpmnSemanticBase,
  CollaborationSemantic,
  DefinitionsSemantic,
  FlowSemantic,
  LaneSetSemantic,
  LaneSemantic,
  ParticipantSemantic,
  ProcessSemantic
} from '../Types';
import { EventDefinitions } from '../meta/EventDefinitions';

export class BpmnFactory {
  static $inject = ['bpmnIds', 'bpmnModdle'];

  private readonly ids: Ids;
  private readonly bpmnModdle: BpmnModdle;

  constructor(ids: Ids, bpmnModdle: BpmnModdle) {
    this.ids = ids;
    this.bpmnModdle = bpmnModdle;
  }

  /** 生成并登记新 id（前缀取类型局部名，单次前缀 + 7 位随机后缀，如 Task_1a2b3c4） */
  nextId(prefixHint: string): string {
    const local = prefixHint.includes(':') ? prefixHint.split(':')[1] : prefixHint;
    return this.ids.nextPrefixed(`${local}_`);
  }

  /**
   * 类型化创建（moddle 实例：描述校验/继承缺省/引用管理由引擎负责）。
   * 传入既有 id（替换 morph 保 id 场景）不重新分配，claim 幂等。
   * 支持两种入参形态：对象（{ $type, ...attrs }，组件内部用法）与
   * (type, attrs) 两参（面板等插件的通用惯例）。
   * id 仅对描述符声明了 id 属性的类型分配（ExtensionElements 等容器类型不占号）。
   */
  create<T extends BpmnSemanticBase>(
    typeOrAttrs: string | (Partial<T> & { $type: string }),
    maybeAttrs?: Partial<T>
  ): T {
    const attrs = (
      typeof typeOrAttrs === 'string' ? { ...(maybeAttrs as Record<string, unknown>), $type: typeOrAttrs } : typeOrAttrs
    ) as Partial<T> & { $type: string };
    const { $type, ...properties } = attrs as Record<string, unknown>;
    const bo = this.bpmnModdle.create<T>($type as string, properties);
    const idDescribed = (bo as any).$descriptor?.properties?.some((p: any) => p.name === 'id');
    if (idDescribed && !bo.id) {
      bo.id = this.nextId($type as string);
    }
    if (bo.id) {
      // claim 带持有者：assigned(id) 返回元素本体，面板查重区分自身与他人
      this.ids.claim(bo.id, bo);
    }
    return bo;
  }

  createDefinitions(targetNamespace: string): DefinitionsSemantic {
    return this.create<DefinitionsSemantic>({
      $type: 'bpmn:Definitions',
      targetNamespace: targetNamespace || 'http://bpmn.io/schema/bpmn',
      rootElements: [],
      diagrams: []
    });
  }

  createProcess(attrs: Partial<ProcessSemantic> = {}): ProcessSemantic {
    return this.create<ProcessSemantic>({ $type: 'bpmn:Process', flowElements: [], laneSets: [], ...attrs });
  }

  createCollaboration(): CollaborationSemantic {
    return this.create<CollaborationSemantic>({
      $type: 'bpmn:Collaboration',
      participants: [],
      messageFlows: [],
      artifacts: []
    });
  }

  createParticipant(process: ProcessSemantic): ParticipantSemantic {
    return this.create<ParticipantSemantic>({
      $type: 'bpmn:Participant',
      processRef: process
    });
  }

  createLaneSet(): LaneSetSemantic {
    return this.create<LaneSetSemantic>({ $type: 'bpmn:LaneSet', lanes: [] });
  }

  createLane(attrs: Partial<LaneSemantic> = {}): LaneSemantic {
    return this.create<LaneSemantic>({ $type: 'bpmn:Lane', flowNodeRef: [], ...attrs });
  }

  createFlow(attrs: Partial<FlowSemantic> & { $type: string }): FlowSemantic {
    return this.create<FlowSemantic>({ ...attrs });
  }

  /** DI 图（BPMNDiagram→BPMNPlane，平面目标为语义元素引用，序列化自动 id 化；集合属性显式初始化——引擎对 isMany 属性不建默认数组） */
  createDiagram(planeTarget: BpmnSemanticBase): any {
    const plane = this.create<any>({
      $type: 'bpmndi:BPMNPlane',
      bpmnElement: planeTarget,
      planeElement: []
    });
    return this.create<any>({ $type: 'bpmndi:BPMNDiagram', plane });
  }

  /**
   * 按事件符号补挂事件定义（创建/替换事件类型时调用）。
   * 无符号 → 清空 eventDefinitions（无定义事件）。
   * multiple / parallelMultiple 为多定义形态（规范 §10.5：无专属定义类型）——
   * 组装 message+timer 双定义（自有选择：最常见触发对；parallelMultiple
   * 额外置 parallelMultiple=true），序列化与导入侧自然按「多定义」往返。
   */
  applyEventSymbol(bo: any, symbol: string | undefined): void {
    if (!symbol) {
      bo.eventDefinitions = [];
      return;
    }
    if (EventDefinitions.isVirtualSymbol(symbol)) {
      const pair = ['message', 'timer'].map((s) => this.createEventDefinition(s));
      bo.eventDefinitions = pair;
      bo.parallelMultiple = symbol === 'parallelMultiple';
      return;
    }
    // 单定义形态不设 parallelMultiple：moddle 实例上显式赋 undefined 会被
    // writer 序列化成 parallelMultiple="undefined" 污染 XML（新建对象天然
    // 无该属性，无需清除）
    bo.eventDefinitions = [this.createEventDefinition(symbol)];
  }

  private createEventDefinition(symbol: string): BpmnSemanticBase {
    const type = EventDefinitions.definitionType(symbol);
    if (!type) {
      throw new Error(`未知事件定义符号：${symbol}`);
    }
    return this.create<BpmnSemanticBase>({ $type: type });
  }

  /**
   * 活动循环特性（规范 §10.2.2 / §13.3）：标准循环 / 多实例
   * （MultiInstanceLoop 的 isSequential 区分并行 false 与顺序 true）。
   */
  createLoopCharacteristics(kind: 'loop' | 'parallel' | 'sequential'): BpmnSemanticBase {
    if (kind === 'loop') {
      return this.create<BpmnSemanticBase>({ $type: 'bpmn:StandardLoopCharacteristics' });
    }
    return this.create<BpmnSemanticBase>({
      $type: 'bpmn:MultiInstanceLoopCharacteristics',
      isSequential: kind === 'sequential'
    });
  }

  /** 语义注销（删除元素时释放 id；树引用由 BpmnUpdater 摘除） */
  destroy(bo: BpmnSemanticBase): void {
    this.ids.unclaim(bo.id);
  }

  /** 删除撤销后重新登记既有 id（对象复用，幂等；带持有者与 create 路径同约定） */
  reclaim(bo: BpmnSemanticBase): void {
    this.ids.claim(bo.id, bo);
  }
}
