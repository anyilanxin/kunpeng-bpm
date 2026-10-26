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
 * 语义类型面（moddle 树上的关键节点形状，字段名以 dmn13/dmndi13 描述符为准）。
 * 保持宽松（any 兜底）——moddle 动态属性远多于静态标注，类型只标注高频消费字段。
 */

/** dmn:Definitions（语义根；drgElement/artifact 为多态数组） */
export interface DefinitionsSemantic {
  $type: 'dmn:Definitions';
  id: string;
  name?: string;
  namespace?: string;
  drgElement: any[];
  artifact?: any[];
  /** dmndi:DMNDI（单实例；内含 diagrams 多态数组） */
  dmnDI?: any;
}

/** dmn:DMNElementReference（模型侧引用包装：href="#id"，注意带 '#'） */
export interface DmnElementReference {
  $type: 'dmn:DMNElementReference';
  href: string;
}

/** 三类需求连线语义（统一不变量：target 侧持有语义元素，引用指向 source） */
export interface RequirementSemantic {
  $type: 'dmn:InformationRequirement' | 'dmn:KnowledgeRequirement' | 'dmn:AuthorityRequirement';
  id?: string;
  description?: string;
  requiredInput?: DmnElementReference;
  requiredDecision?: DmnElementReference;
  requiredKnowledge?: DmnElementReference;
  requiredAuthority?: DmnElementReference;
}

/** dmn:Association（Artifact；sourceRef/targetRef 为 DMNElementReference 子元素） */
export interface AssociationSemantic {
  $type: 'dmn:Association';
  id?: string;
  sourceRef?: DmnElementReference;
  targetRef?: DmnElementReference;
  associationDirection?: 'None' | 'One' | 'Both';
}

/** 宿主扩展命名空间描述符（moddle 包形态：name/prefix/uri/types） */
export interface ModdleExtension {
  name: string;
  prefix: string;
  uri: string;
  types: unknown[];
}
