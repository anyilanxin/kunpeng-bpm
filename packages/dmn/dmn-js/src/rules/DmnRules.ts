/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that licenses/ directories that accompany this code.
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
 * DMN 交互规则（规范 §11.3 需求方向矩阵）：
 * - 信息需求（实线箭头）：InputData/Decision/DecisionService → Decision
 * - 知识需求（虚线空心箭头）：BusinessKnowledgeModel → Decision/BKM/DS
 * - 权威需求（虚线圆头）：KnowledgeSource/DS → Decision/BKM/KS
 * - 关联：任意 DRG 形状/制品 → 任意（含注记）
 * 形状可自由移动（无 BPMN 池道容器约束）；DS 容器收 Decision 且整体落入
 * 单一分区（分割线上=输出带/下=封装区）；无元素重叠强约束（DRD 布局自由）。
 */
import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import { isDrgShapeType } from '../meta/ElementTypes';

/** 各连线类型的合法 source $type 全集 */
const CONNECTION_SOURCES: Record<string, readonly string[]> = {
  'dmn:InformationRequirement': ['dmn:InputData', 'dmn:Decision', 'dmn:DecisionService'],
  'dmn:KnowledgeRequirement': ['dmn:BusinessKnowledgeModel'],
  'dmn:AuthorityRequirement': ['dmn:KnowledgeSource', 'dmn:DecisionService'],
  'dmn:Association': ['dmn:Decision', 'dmn:InputData', 'dmn:BusinessKnowledgeModel', 'dmn:KnowledgeSource', 'dmn:DecisionService', 'dmn:TextAnnotation']
};

/** 各连线类型的合法 target $type 全集 */
const CONNECTION_TARGETS: Record<string, readonly string[]> = {
  'dmn:InformationRequirement': ['dmn:Decision'],
  'dmn:KnowledgeRequirement': ['dmn:Decision', 'dmn:BusinessKnowledgeModel', 'dmn:DecisionService'],
  'dmn:AuthorityRequirement': ['dmn:Decision', 'dmn:BusinessKnowledgeModel', 'dmn:KnowledgeSource'],
  'dmn:Association': ['dmn:Decision', 'dmn:InputData', 'dmn:BusinessKnowledgeModel', 'dmn:KnowledgeSource', 'dmn:DecisionService', 'dmn:TextAnnotation']
};

/** 按端点现型推导连线类型（palette 全局连线工具：拖出时按 source/target 裁决） */
export function connectionTypeFor(sourceType: string, targetType: string): string | null {
  for (const [type, sources] of Object.entries(CONNECTION_SOURCES)) {
    if (sources.includes(sourceType) && CONNECTION_TARGETS[type].includes(targetType)) {
      return type;
    }
  }
  return null;
}

export class DmnRules extends RuleProvider {
  static $inject = [];

  override init(): void {
    this.addRule('connection.create', (context: any) => this.canCreateConnection(context));
    this.addRule('connection.reconnect', (context: any) => this.canReconnect(context));
    this.addRule('shape.create', (context: any) => this.canCreateShape(context));
    this.addRule('shape.resize', (context: any) => this.canResize(context));
    this.addRule('elements.move', (context: any) => this.canMove(context));
  }

  private canCreateConnection(context: any): boolean | Record<string, unknown> {
    const { source, target, type } = context;
    if (source === target) {
      return false;
    }
    const sourceType = source.businessObject?.$type ?? source.type;
    const targetType = target.businessObject?.$type ?? target.type;
    if (!sourceType || !targetType) {
      return false;
    }
    // 全局连线工具：按端点现型裁决实际类型（connectionType 空则拒）
    const effectiveType = type === 'dmn:Association' ? type : connectionTypeFor(sourceType, targetType);
    if (!effectiveType) {
      return false;
    }
    return { type: effectiveType };
  }

  private canReconnect(context: any): boolean {
    const { source, target } = context;
    if (!source || !target || source === target) {
      return false;
    }
    const sourceType = source.businessObject?.$type ?? source.type;
    const targetType = target.businessObject?.$type ?? target.type;
    return connectionTypeFor(sourceType, targetType) !== null;
  }

  private canCreateShape(context: any): boolean {
    const { target } = context;
    // 新形状只能落在画布根或 DS 容器（DS 仅收 Decision，fitsServiceRegion）
    if (!target || target.type === 'dmn:Definitions') {
      return true;
    }
    return this.fitsDecisionService(target, context.shape);
  }

  private canResize(context: any): boolean {
    // 仅 DS 容器可调尺寸（注册表 resizable）
    return context.shape?.businessObject?.$type === 'dmn:DecisionService';
  }

  private canMove(context: any): boolean {
    const { shapes, target } = context;
    // 目标为根：自由；目标为 DS：全部成员须为 Decision 且落单一分区
    if (!target || target.type === 'dmn:Definitions') {
      return true;
    }
    if (target.businessObject?.$type !== 'dmn:DecisionService') {
      return false;
    }
    return shapes.every(
      (shape: any) =>
        shape.businessObject?.$type === 'dmn:Decision' &&
        this.fitsServiceRegion(target, shape, context.delta ?? { x: 0, y: 0 })
    );
  }

  /** DS 分区容纳判定：落点（现位置+delta）中心在分割线上/下皆可，但不许跨分区分裂（单形状本身不跨线） */
  private fitsServiceRegion(service: any, shape: any, delta: { x: number; y: number }): boolean {
    const divider = service.y + (service.dividerY ?? 90);
    const top = (shape.y + delta.y) * 1;
    const bottom = top + shape.height;
    // 整体落入单一分区：上带或下区（跨分割线拒收）
    return bottom <= divider || top >= divider;
  }

  private fitsDecisionService(target: any, shape: any): boolean {
    if (shape.businessObject?.$type !== 'dmn:Decision') {
      return false;
    }
    return this.fitsServiceRegion(target, shape, { x: 0, y: 0 });
  }
}

void isDrgShapeType;
