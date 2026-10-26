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
 * DMN 元素类型注册表 —— 全库唯一的数据源（可整体被插件替换）。
 *
 * 尺寸体系为自有设计（规范只规定形状语义与记法，不规定像素尺寸），取值
 * 理由随常量注明（U2 沿用一期已评审定值）：
 * - Decision 150×70：两行 12px 名字 + 12px 余量，四类 DRG 形状基准盒；
 * - BKM 160×80：比 Decision 大一档（知识封装层级更高的视觉暗示），双切角边 20；
 * - InputData 170×50：胶囊形（两侧直边+两端半圆，半径=高半 25），3.4:1
 *   长高比保证短名字不落半圆区；
 * - KS 130×80：波浪底幅 4——三峰可辨且不侵入名字区（规范记法开底波浪线）；
 * - DecisionService 320×200：容纳 3×2 内部决策网格+顶带输出区，默认分割
 *   线 90=一行决策 70+上下各 10；
 * - 注记 140×70：三行说明文字起步；
 * - 追加净空 72：与 BPMN 线同量级（跨组件一致的追加手感，连线长度=净空）。
 *
 * palette 定规（用户 2026-10-26）：抓手/套索工具后依次为 创建决策（Decision）/
 * InputData/KnowledgeSource/KnowledgeModel(BKM)；DecisionService 不进面板。
 */
export interface ShapeTypeMeta {
  /** DMN 类型名（= 语义 $type） */
  type: string;
  /** 面板/替换菜单显示名 */
  label: string;
  width: number;
  height: number;
  /** palette 分组 id；不填则不进面板（如 DecisionService 由 contextPad 生成） */
  paletteGroup?: string;
  /** palette 排序权重（组内升序） */
  order?: number;
  /** 替换菜单家族 id；不填不可替换 */
  replaceFamily?: string;
  /** 是否可容纳子元素 */
  isContainer?: boolean;
  /** 是否可调整尺寸 */
  resizable?: boolean;
  /** 名称标签绘制位置：internal=形内（DMN 全族形内，规范 §6.2.1） */
  labelMode?: 'internal' | 'external';
  /** 有表达式编辑视图（左上角下钻图标判定；Decision=decisionLogic、BKM=encapsulatedLogic） */
  drillable?: boolean;
  /** 元素族判定（规则层用） */
  family: ElementFamily;
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
  | 'decision'
  | 'invocable'
  | 'input'
  | 'knowledge'
  | 'service'
  | 'artifact'
  | 'requirement'
  | 'association';

/**
 * 类型条目的稳定 ASCII 标识：取 $type 本地名。用作 palette 条目 id 与
 * 图标类名——类名进入 CSS 选择器，必须是合法 CSS 标识符。
 */
export function metaId(meta: { type: string }): string {
  return meta.type.split(':').pop() ?? meta.type;
}

export const SIZES = {
  DECISION_W: 150,
  DECISION_H: 70,
  BKM_W: 160,
  BKM_H: 80,
  BKM_CUT: 20,
  INPUT_W: 170,
  INPUT_H: 50,
  KS_W: 130,
  KS_H: 80,
  KS_WAVE: 4,
  SERVICE_W: 320,
  SERVICE_H: 200,
  /** DS 分割线默认 y（顶带到内容区的一行决策高+上下各 10 余量） */
  SERVICE_DIVIDER_Y: 90,
  ANNOTATION_W: 140,
  ANNOTATION_H: 70,
  /** 追加净空（连线长度=净空）与堆叠步进（同位多次追加的纵向让位） */
  APPEND_GAP: 72,
  APPEND_STEP: 46
} as const;

/** DRG 形状（palette 定规 4 项 + DecisionService 注册表登记 + 注记制品） */
export const SHAPE_TYPES: ShapeTypeMeta[] = [
  {
    type: 'dmn:Decision', label: '决策', width: SIZES.DECISION_W, height: SIZES.DECISION_H,
    paletteGroup: 'drg', order: 10, replaceFamily: 'drg', family: 'decision', drillable: true
  },
  {
    type: 'dmn:InputData', label: '输入数据', width: SIZES.INPUT_W, height: SIZES.INPUT_H,
    paletteGroup: 'drg', order: 20, replaceFamily: 'drg', family: 'input'
  },
  {
    type: 'dmn:KnowledgeSource', label: '知识源', width: SIZES.KS_W, height: SIZES.KS_H,
    paletteGroup: 'drg', order: 30, replaceFamily: 'drg', family: 'knowledge'
  },
  {
    type: 'dmn:BusinessKnowledgeModel', label: '业务知识模型', width: SIZES.BKM_W, height: SIZES.BKM_H,
    paletteGroup: 'drg', order: 40, replaceFamily: 'drg', family: 'invocable', drillable: true
  },
  {
    type: 'dmn:DecisionService', label: '决策服务', width: SIZES.SERVICE_W, height: SIZES.SERVICE_H,
    isContainer: true, resizable: true, family: 'service'
  },
  {
    type: 'dmn:TextAnnotation', label: '注记', width: SIZES.ANNOTATION_W, height: SIZES.ANNOTATION_H,
    family: 'artifact'
  }
];

/**
 * 需求连线端点矩阵（规范 §11.3 信息/知识/权威需求方向；authority=虚线
 * 圆头指向被授权者）：source→target 均为可连 $type 全集。
 */
export const CONNECTION_TYPES: ConnectionTypeMeta[] = [
  {
    type: 'dmn:InformationRequirement', label: '信息需求',
    replaceFamily: 'requirement', family: 'requirement'
  },
  {
    type: 'dmn:KnowledgeRequirement', label: '知识需求',
    replaceFamily: 'requirement', family: 'requirement'
  },
  {
    type: 'dmn:AuthorityRequirement', label: '权威需求',
    replaceFamily: 'requirement', family: 'requirement'
  },
  {
    type: 'dmn:Association', label: '关联',
    family: 'association'
  }
];

/** 形状类型表查找（未登记类型得 null——渲染/规则按未知类型处理） */
export function shapeMetaOf(type: string): ShapeTypeMeta | null {
  return SHAPE_TYPES.find((m) => m.type === type) ?? null;
}

/** 连线类型表查找 */
export function connectionMetaOf(type: string): ConnectionTypeMeta | null {
  return CONNECTION_TYPES.find((m) => m.type === type) ?? null;
}

/** 需求连线族判定（三类 dmn:*Requirement；关联不在此族） */
const REQUIREMENT_TYPES: readonly string[] = [
  'dmn:InformationRequirement',
  'dmn:KnowledgeRequirement',
  'dmn:AuthorityRequirement'
];

export function isRequirementType(type: string | undefined | null): boolean {
  return type != null && REQUIREMENT_TYPES.includes(type);
}

/** DRG 形状（palette 可建的 4 类 + DS）：连线端点/容器判定的事实源 */
export function isDrgShapeType(type: string | undefined | null): boolean {
  if (type == null) {
    return false;
  }
  return type === 'dmn:Decision' || type === 'dmn:InputData' || type === 'dmn:BusinessKnowledgeModel' ||
    type === 'dmn:KnowledgeSource' || type === 'dmn:DecisionService';
}

/** 注册表整体（BpmnElementTypes 同构门面：插件可整体替换） */
export class DmnElementTypes {
  readonly shapes: readonly ShapeTypeMeta[] = SHAPE_TYPES;
  readonly connections: readonly ConnectionTypeMeta[] = CONNECTION_TYPES;

  shapeMetaOf = shapeMetaOf;
  connectionMetaOf = connectionMetaOf;
  isRequirementType = isRequirementType;
  isDrgShapeType = isDrgShapeType;
}
