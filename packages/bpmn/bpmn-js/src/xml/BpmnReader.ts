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
 * XML 导入器：moddle-xml Reader（描述驱动，MIT）为内核。
 *
 * 元素/属性/类型化/引用全部由元模型描述（自有协议包 + 宿主 moddleExtensions）
 * 驱动——新元素接入只需补描述条目，无需改本文件。lax 模式下未知元素以 Any
 * 形态保留在树上（往返不丢），引用（sourceRef/processRef/…）经 references
 * 列表统一解析为元素对象。
 *
 * 输出契约：
 * - definitions：moddle 元素树根（含 DI 图，rootElements 内 bpmndi:BPMNDiagram）
 * - semanticById：id → 元素（含 Any）
 * - references：已解析的引用记录（element/property/id）
 * - firstPoolHorizontal：首个显式 isHorizontal 参与者 DI 信号（朝向导入推断）
 * - warnings：非致命告警（未解析引用等）
 */
/// <reference path="../types/moddle-xml.d.ts" />
import { Reader } from 'moddle-xml';
import type { BpmnModdle } from '../meta/BpmnModdle';
import type { BpmnNamespaces } from './BpmnNamespaces';

export interface BpmnParseResult {
  definitions: any;
  semanticById: Map<string, any>;
  references: { element: any; property: string; id: string }[];
  warnings: string[];
  firstPoolHorizontal?: boolean;
  /** 主图 BPMNPlane 指向的根元素 id（collaboration 或 process） */
  planeTargetId: string;
}

/** isReference 属性值（引擎自动解析为元素对象；悬空时保留 id 字符串）统一取 id */
export function referenceId(ref: unknown): string {
  return typeof ref === 'string' ? ref : String((ref as any)?.id ?? '');
}

/**
 * 主图定位规则（导入/建图共享）：第一个有平面目标的 BPMNDiagram——返回其
 * plane 目标 id 与 plane 节点（树上的真 DI 节点）；无平面目标（退化文档）
 * 返回 null。
 */
export function mainPlaneTargetId(definitions: any): { planeTargetId: string; plane: any } | null {
  for (const diagram of definitions.diagrams ?? []) {
    const target = diagram.plane?.bpmnElement;
    if (target) {
      return { planeTargetId: referenceId(target), plane: diagram.plane };
    }
  }
  return null;
}

export class BpmnReader {
  static $inject = ['bpmnModdle', 'bpmnNamespaces'];

  constructor(
    private readonly bpmnModdle: BpmnModdle,
    // 命名空间注册表：构造期校验/声明宿主扩展前缀（moddle 描述合并的伴生侧）
    namespaces: BpmnNamespaces
  ) {}

  async parse(xml: string): Promise<BpmnParseResult> {
    const reader = new Reader({ model: this.bpmnModdle.moddle(), lax: true });
    const rootHandler = reader.handler('bpmn:Definitions');

    let parsed: {
      rootElement: any;
      references: { element: any; property: string; id: string }[];
      warnings: { message?: string }[];
      elementsById: Record<string, any>;
    };
    try {
      parsed = (await reader.fromXML(xml, rootHandler)) as never;
    } catch (error: any) {
      const detail = error?.warnings?.map((w: any) => w.message).join('; ') || error?.message || String(error);
      throw new Error(`XML 解析失败：${String(detail).slice(0, 300)}`);
    }

    const semanticById = new Map<string, any>(Object.entries(parsed.elementsById ?? {}));
    const warnings = (parsed.warnings ?? []).map((w) => String(w.message ?? w));

    // 引用兜底：moddle-xml 对可解析目标已自动挂元素对象；此处只处理仍为 id 字符串
    // 的悬空引用（目标不存在）——报告为告警，树上保留 id 原文
    for (const reference of parsed.references ?? []) {
      const target = semanticById.get(reference.id);
      if (target) {
        continue;
      }
      warnings.push(`引用目标不存在：${reference.element?.id}.${reference.property} → ${reference.id}`);
    }

    return {
      definitions: parsed.rootElement,
      semanticById,
      references: parsed.references ?? [],
      warnings,
      planeTargetId: mainPlaneTargetId(parsed.rootElement)?.planeTargetId ?? '',
      firstPoolHorizontal: this.firstPoolHorizontal(parsed.rootElement, semanticById)
    };
  }

  /**
   * 首个显式 isHorizontal 参与者 DI 信号：朝向导入推断（垂直图历史文件用
   * 池级 isHorizontal="false" 表达，标记缺省时据此推断初始朝向）
   */
  private firstPoolHorizontal(definitions: any, semanticById: Map<string, any>): boolean | undefined {
    for (const diagram of definitions.diagrams ?? []) {
      for (const element of diagram.plane?.planeElement ?? []) {
        if (element.$type !== 'bpmndi:BPMNShape' || element.isHorizontal === undefined) {
          continue;
        }
        const target = semanticById.get(referenceId(element.bpmnElement));
        if (target?.$type === 'bpmn:Participant') {
          return !!element.isHorizontal;
        }
      }
    }
    return undefined;
  }
}
