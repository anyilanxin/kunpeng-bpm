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
 * DMN 元素类型注册表 —— 全库唯一数据源（可整体被插件替换）。
 *
 * 形状记法语义按 DMN 1.6 §6.2.1（Decision 矩形 / BKM 双切角矩形 / InputData
 * 两侧直边+两端半圆 / KS 三直边+一波浪边 / 注记方括号），像素尺寸为自有设计
 * （规范只规定形状语义不规定像素），取值理由随常量注明。
 *
 * DMN 名字一律绘制在形状内部（规范 §6.2.1 各条款 "Name MUST be displayed
 * inside the shape"），无外部标签体系——注册表不设 labelMode 字段。
 */
import { getBusinessObject } from '../util/ModelUtil';

export interface ShapeTypeMeta {
  /** DMN 类型名（= 语义 $type） */
  type: string;
  /** 面板/替换菜单显示名 */
  label: string;
  width: number;
  height: number;
  /** palette 分组 id；不填则不进面板（DecisionService 容器语义 P8 再开放） */
  paletteGroup?: string;
  /** palette 排序权重（组内升序） */
  order?: number;
  /** 替换族；不填不可替换（DRG 形状同族可互换，连线类型由端点唯一决定不可手换） */
  replaceFamily?: string;
  /** 是否可调整尺寸（注记随文字自适应手调；DRG 形状保比例语义不开放） */
  resizable?: boolean;
  /** 元素族判定（规则层用） */
  family: ElementFamily;
}

export interface ConnectionTypeMeta {
  type: string;
  label: string;
  order?: number;
  family: ElementFamily;
}

export type ElementFamily =
  | 'decision'
  | 'invocable'
  | 'input'
  | 'knowledgeSource'
  | 'decisionService'
  | 'artifact'
  | 'requirement'
  | 'association';

/** 类型条目的稳定 ASCII 标识（$type 本地名）：palette 条目 id / CSS 类名 */
export function metaId(meta: { type: string }): string {
  return meta.type.split(':').pop() ?? meta.type;
}

/**
 * 自有尺寸体系（规范未规定像素，仅规定形状语义）：
 * - Decision 150×70：两行 12px 名字 + 上下各 8 余量；宽高比 ≈2.1:1（扁矩形）；
 * - BKM 160×80：比 Decision 大一档（知识封装层级更高的视觉暗示），双切角边 20；
 * - InputData 170×50：胶囊形（两侧直边 + 两端半圆，半径=高半 25），长高比
 *   3.4:1 保证短名字不落半圆区、长名字有直边排版区；
 * - KS 130×80：波浪底幅 4——三峰可辨且不侵入名字区；
 * - 注记 140×70：三行说明文字起步；
 * - DecisionService 320×200：容纳 3×2 内部决策网格 + 顶带输出区（P8 容器语义）；
 * - 追加净空 72：与 BPMN 线同量级（跨组件一致的追加手感，连线长度=净空）。
 */
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
  ANNOTATION_W: 140,
  ANNOTATION_H: 70,
  SERVICE_W: 320,
  SERVICE_H: 200,
  /** 决策服务顶带（输出决策区）高度：一行决策 70 + 上下各 10 余量（自有设计） */
  SERVICE_DIVIDER_Y: 90,
  APPEND_GAP: 72,
  APPEND_STEP: 46
} as const;

/** DRG 形状（palette 全量 5 项 + DecisionService 登记） */
export const SHAPE_TYPES: ShapeTypeMeta[] = [
  {
    type: 'dmn:Decision', label: '决策', width: SIZES.DECISION_W, height: SIZES.DECISION_H,
    paletteGroup: 'drg', order: 10, replaceFamily: 'drg', family: 'decision'
  },
  {
    type: 'dmn:BusinessKnowledgeModel', label: '业务知识模型', width: SIZES.BKM_W, height: SIZES.BKM_H,
    paletteGroup: 'drg', order: 20, replaceFamily: 'drg', family: 'invocable'
  },
  {
    type: 'dmn:InputData', label: '输入数据', width: SIZES.INPUT_W, height: SIZES.INPUT_H,
    paletteGroup: 'drg', order: 30, replaceFamily: 'drg', family: 'input'
  },
  {
    type: 'dmn:KnowledgeSource', label: '知识源', width: SIZES.KS_W, height: SIZES.KS_H,
    paletteGroup: 'drg', order: 40, replaceFamily: 'drg', family: 'knowledgeSource'
  },
  {
    type: 'dmn:TextAnnotation', label: '文本注记', width: SIZES.ANNOTATION_W, height: SIZES.ANNOTATION_H,
    paletteGroup: 'artifact', order: 50, family: 'artifact', resizable: true
  },
  {
    // 容器（P8）：Decision 拖入装为封装/输出成员（顶带/主体按落点），可缩放
    type: 'dmn:DecisionService', label: '决策服务', width: SIZES.SERVICE_W, height: SIZES.SERVICE_H,
    paletteGroup: 'drg', order: 45, replaceFamily: 'drg', family: 'decisionService', resizable: true
  }
];

/** 需求连线与关联（类型由端点唯一决定——规范 §6.2.3，palette 不直列，经连线工具/规则派生） */
export const CONNECTION_TYPES: ConnectionTypeMeta[] = [
  { type: 'dmn:InformationRequirement', label: '信息需求', order: 10, family: 'requirement' },
  { type: 'dmn:KnowledgeRequirement', label: '知识需求', order: 20, family: 'requirement' },
  { type: 'dmn:AuthorityRequirement', label: '授权需求', order: 30, family: 'requirement' },
  { type: 'dmn:Association', label: '关联', order: 40, family: 'association' }
];

/**
 * 需求连线端点矩阵（规范 §6.2.2/§6.2.3 Table 2 的机器形态）：
 * - 信息需求（实线+实心箭头，指向消费方）：输入数据→决策、决策→决策；
 * - 知识需求（虚线+空心箭头，指向调用方）：BKM/决策服务→决策、BKM/决策服务→BKM；
 * - 授权需求（虚线+实心圆头，指向被管辖方）：知识源→决策/BKM/知识源、
 *   输入数据/决策→知识源（分析派生用途 §6.2.2.3b）；
 * 规范明言"类型由两端元素类型唯一决定"——本表即唯一裁决点，规则层/连线工具/
 * 建模命令共消费；输入数据无入边（"no requirements may be drawn terminating
 * in Input Data"）由矩阵结构保证。
 */
const REQUIREMENT_RULES: { type: string; from: string[]; to: string[] }[] = [
  { type: 'dmn:InformationRequirement', from: ['dmn:InputData'], to: ['dmn:Decision'] },
  { type: 'dmn:InformationRequirement', from: ['dmn:Decision'], to: ['dmn:Decision'] },
  {
    type: 'dmn:KnowledgeRequirement',
    from: ['dmn:BusinessKnowledgeModel', 'dmn:DecisionService'],
    to: ['dmn:Decision', 'dmn:BusinessKnowledgeModel']
  },
  {
    type: 'dmn:AuthorityRequirement',
    from: ['dmn:KnowledgeSource'],
    to: ['dmn:Decision', 'dmn:BusinessKnowledgeModel', 'dmn:KnowledgeSource']
  },
  {
    type: 'dmn:AuthorityRequirement',
    from: ['dmn:InputData', 'dmn:Decision'],
    to: ['dmn:KnowledgeSource']
  }
];

/** 端点 → 需求连线类型（唯一裁决）；无合法类型返回 null（连线工具据此判不可连） */
export function requirementBetween(sourceType: string, targetType: string): string | null {
  for (const rule of REQUIREMENT_RULES) {
    if (rule.from.includes(sourceType) && rule.to.includes(targetType)) {
      return rule.type;
    }
  }
  return null;
}

export class DmnElementTypes {
  /** palette 快捷集（DMN 形状集小，全量直列——无"更多元素"弹层） */
  static readonly PALETTE_QUICK_IDS: readonly string[] = [
    'Decision',
    'BusinessKnowledgeModel',
    'InputData',
    'KnowledgeSource',
    'TextAnnotation'
  ];

  // didi 按参数名回退解析：缺 $inject 会把 quickIds 当服务名解析（No provider）
  static $inject = ['config.paletteQuickIds'];

  private readonly shapeByType = new Map<string, ShapeTypeMeta>();
  private readonly connectionByType = new Map<string, ConnectionTypeMeta>();
  private readonly paletteShapes: ShapeTypeMeta[];

  constructor(quickIds?: string[]) {
    for (const meta of SHAPE_TYPES) {
      if (!this.shapeByType.has(meta.type)) {
        this.shapeByType.set(meta.type, meta);
      }
    }
    for (const meta of CONNECTION_TYPES) {
      this.connectionByType.set(meta.type, meta);
    }
    this.paletteShapes = SHAPE_TYPES.filter((meta) => !!meta.paletteGroup)
      .slice()
      .sort((a, b) => (a.paletteGroup! === b.paletteGroup! ? (a.order ?? 0) - (b.order ?? 0) : 0));

    if (quickIds !== undefined) {
      if (!Array.isArray(quickIds)) {
        throw new Error(`paletteQuickIds 必须是 metaId 字符串数组，收到：${typeof quickIds}`);
      }
      const byId = new Map(this.paletteShapes.map((meta) => [metaId(meta), meta] as const));
      for (const id of quickIds) {
        if (!byId.has(id)) {
          throw new Error(`paletteQuickIds 含未注册的 metaId：${id}（可用值见 ElementTypes 注册表）`);
        }
      }
    }
  }

  shapeMeta(type: string): ShapeTypeMeta | undefined {
    return this.shapeByType.get(type);
  }

  connectionMeta(type: string): ConnectionTypeMeta | undefined {
    return this.connectionByType.get(type);
  }

  defaultSize(type: string): { width: number; height: number } | undefined {
    const meta = this.shapeByType.get(type);
    return meta ? { width: meta.width, height: meta.height } : undefined;
  }

  family(type: string): ElementFamily | undefined {
    return this.shapeByType.get(type)?.family ?? this.connectionByType.get(type)?.family;
  }

  /** palette 条目（分组与组内 order 已排；只读缓存） */
  paletteShapeEntries(): ShapeTypeMeta[] {
    return this.paletteShapes;
  }

  /** 类型元数据 → 画布创建载荷（palette/菜单/context pad 快捷追加共消费） */
  createAttrs(meta: ShapeTypeMeta): { type: string } {
    return { type: meta.type };
  }

  /** 替换族成员（DRG 形状互换；"与当前同形"的排除经 matchesElement 判定） */
  replaceTargets(familyId: string): ShapeTypeMeta[] {
    return SHAPE_TYPES.filter((meta) => meta.replaceFamily === familyId);
  }

  /** 注册表形态与画布元素是否同形（DMN 形状无孪生变体，$type 即身份） */
  matchesElement(meta: ShapeTypeMeta, element: any): boolean {
    const bo = getBusinessObject(element);
    return bo?.$type === meta.type;
  }

  /** DRG 形状判定（规则/建图用） */
  isDrgShapeType(type: string | undefined | null): boolean {
    if (!type) return false;
    const family = this.shapeByType.get(type)?.family;
    return family === 'decision' || family === 'invocable' || family === 'input'
      || family === 'knowledgeSource' || family === 'decisionService';
  }

  isRequirementType(type: string | undefined | null): boolean {
    return !!type && this.connectionByType.get(type)?.family === 'requirement';
  }

  isArtifactShapeType(type: string | undefined | null): boolean {
    return type === 'dmn:TextAnnotation';
  }
}
