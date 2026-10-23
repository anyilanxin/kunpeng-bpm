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
 * BPMN 语义模型公共类型。
 *
 * 设计约束（需求规格 NFR-1）：
 * - 语义对象（businessObject）是唯一持久状态，画布元素只是它的视图；
 * - DI 不做常驻双向同步，导入时由 Reader 生成、导出时由 Writer 从画布一次性推导，
 *   避免"命令后忘同步 DI"这一类状态漂移缺陷。
 */

/** 规范 §8.1 BaseElement：所有 BPMN 元素的公共部分 */
export interface BpmnSemanticBase {
  id: string;
  $type: string;
  /** 文档元素（文档化用途，不参与执行语义） */
  documentation?: string;
  /** 扩展属性（插件/宿主可用，导出时并入 extensionElements 之外的同名属性） */
  [key: string]: any;
}

/** 流程节点（规范 §10 FlowNode）：可接顺序流 */
export interface FlowNodeSemantic extends BpmnSemanticBase {
  name?: string;
  incoming?: FlowSemantic[];
  outgoing?: FlowSemantic[];
}

/** 连线类（规范 §8.4 / §10）：顺序流 / 消息流 / 关联 / 数据关联 */
export interface FlowSemantic extends BpmnSemanticBase {
  name?: string;
  sourceRef?: BpmnSemanticBase | null;
  targetRef?: BpmnSemanticBase | null;
}

export interface SequenceFlowSemantic extends FlowSemantic {
  conditionExpression?: { $type: string; body: string } | null;
}

/** 事件（规范 §10.2）：0..n 个事件定义决定符号 */
export interface EventSemantic extends FlowNodeSemantic {
  eventDefinitions?: BpmnSemanticBase[];
  /** 边界事件宿主 */
  attachedToRef?: FlowNodeSemantic | null;
  /** 边界事件是否中断宿主（规范默认 true） */
  cancelActivity?: boolean;
}

/** 容器类：process / subProcess 均持有 flowElements */
export interface ContainerSemantic extends FlowNodeSemantic {
  flowElements?: BpmnSemanticBase[];
  /** 折叠/展开（仅 subProcess） */
  triggeredByEvent?: boolean;
}

export interface ProcessSemantic extends ContainerSemantic {
  processType?: string;
  isExecutable?: boolean;
  laneSets?: LaneSetSemantic[];
}

export interface ParticipantSemantic extends BpmnSemanticBase {
  name?: string;
  processRef?: ProcessSemantic | null;
}

export interface CollaborationSemantic extends BpmnSemanticBase {
  name?: string;
  participants?: ParticipantSemantic[];
  messageFlows?: FlowSemantic[];
  artifacts?: BpmnSemanticBase[];
}

export interface LaneSemantic extends BpmnSemanticBase {
  name?: string;
  flowNodeRef?: FlowNodeSemantic[];
  childLaneSet?: LaneSetSemantic | null;
}

export interface LaneSetSemantic extends BpmnSemanticBase {
  lanes: LaneSemantic[];
}

/** definitions 根（规范 §8.2；DI 图挂 diagrams 属性位，BPMN DI schema 结构） */
export interface DefinitionsSemantic extends BpmnSemanticBase {
  name?: string;
  targetNamespace: string;
  rootElements: BpmnSemanticBase[];
  /** bpmndi:BPMNDiagram 集合（主图=首个；多平面属后续版本范围） */
  diagrams?: any[];
}

/** Reader 输出 / Writer 输入的整图语义文档（DI 图随语义树一体，挂 definitions.diagrams） */
export interface BpmnDocument {
  definitions: DefinitionsSemantic;
  /** 主图 BPMNPlane 指向的根元素 id（collaboration 或 process） */
  plane: {
    bpmnElement: string;
  };
}

export interface BpmnImportResult {
  warnings: string[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
