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
 * 需求连线语义解析（单一事实源）。
 *
 * DMN 与 BPMN 的关键结构差异：三类需求连线（Information/Knowledge/Authority
 * Requirement）不是全局元素——它们是**消费侧 DRG 元素的组成部分**（规范
 * §6.3.13/14/15），且引用经 DMNElementReference 包装（href="#id"，带 '#'）。
 * 本组件统一不变量：**画布 target 侧持有语义元素，引用字段指向 source**：
 * - 信息/知识需求：requiredInput/requiredDecision/requiredKnowledge → source；
 * - 授权需求（§6.2.2.3a 知识源管辖）：持有方=被管辖元素，requiredAuthority→KS；
 * - 授权需求（§6.2.2.3b 分析派生）：持有方=知识源，requiredInput/requiredDecision
 *   → 输入数据/决策 source。
 * Association 的 sourceRef/targetRef 是 DMNElementReference 子元素（非属性）。
 */

/** href 引用取 id（剥 '#'；非 href 形态的 id 字符串原样返回） */
export function refIdFromHref(ref: unknown): string {
  if (!ref) return '';
  const href = typeof ref === 'string' ? ref : String((ref as any).href ?? (ref as any).id ?? '');
  return href.startsWith('#') ? href.slice(1) : href;
}

/** 需求连线 bo → source 端语义 id（按引用字段族解析；解析不出返回 null） */
export function requirementSourceId(bo: any): string | null {
  if (!bo) return null;
  const fields = ['requiredInput', 'requiredDecision', 'requiredKnowledge', 'requiredAuthority'];
  for (const field of fields) {
    const ref = bo.get ? bo.get(field) : bo[field];
    const id = refIdFromHref(ref);
    if (id) return id;
  }
  return null;
}

/** 需求连线 bo 的 source 引用字段名（建/删时同字段读写） */
export function requirementSourceField(bo: any): string | null {
  const fields = ['requiredInput', 'requiredDecision', 'requiredKnowledge', 'requiredAuthority'];
  for (const field of fields) {
    const ref = bo.get ? bo.get(field) : bo[field];
    if (refIdFromHref(ref)) return field;
  }
  return null;
}

/**
 * 按 source/target 类型选择需求的引用字段（创建路径用）——与
 * meta/ElementTypes 的 REQUIREMENT_RULES 端点矩阵一一对应：
 * - 信息需求：source=InputData→requiredInput，source=Decision→requiredDecision；
 * - 知识需求：requiredKnowledge；
 * - 授权需求：target=KS（分析派生向）按 source 类型选 requiredInput/requiredDecision，
 *   其余（KS 管辖向）一律 requiredAuthority。
 */
export function requirementFieldFor(requirementType: string, sourceType: string, targetType: string): string {
  if (requirementType === 'dmn:InformationRequirement') {
    return sourceType === 'dmn:InputData' ? 'requiredInput' : 'requiredDecision';
  }
  if (requirementType === 'dmn:KnowledgeRequirement') {
    return 'requiredKnowledge';
  }
  // AuthorityRequirement
  if (targetType === 'dmn:KnowledgeSource') {
    return sourceType === 'dmn:InputData' ? 'requiredInput' : 'requiredDecision';
  }
  return 'requiredAuthority';
}

/** 需求语义元素的宿主（持有方）属性名：信息/知识=同名复数数组，授权同 */
export function requirementHostProperty(requirementType: string): string {
  return requirementType.split(':')[1].replace(/^./, (c) => c.toLowerCase());
}

/** 关联 bo → 两端语义 id（sourceRef/targetRef 子元素引用） */
export function associationEndpointIds(bo: any): { sourceId: string; targetId: string } | null {
  if (!bo) return null;
  const sourceId = refIdFromHref(bo.get ? bo.get('sourceRef') : bo.sourceRef);
  const targetId = refIdFromHref(bo.get ? bo.get('targetRef') : bo.targetRef);
  return sourceId && targetId ? { sourceId, targetId } : null;
}
