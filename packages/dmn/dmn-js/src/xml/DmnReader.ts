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
 * XML 导入器：moddle-xml Reader（描述驱动，MIT）为内核。
 *
 * 元素/属性/类型化/引用全部由元模型描述（dmn-moddle@12 资源 + 宿主
 * moddleExtensions）驱动——新元素接入只需补描述条目，无需改本文件。lax
 * 模式下未知元素以 Any 形态保留在树上（往返不丢），引用（informationRequirement/
 * knowledgeRequirement/…）经 references 列表统一解析为元素对象。
 *
 * DMN 1.3 DI 结构（与 BPMN DI 的关键差异）：无 Plane 中间层——
 * dmn:Definitions.dmnDI? / dmndi:DMNDI.diagrams[] / DMNDiagram.diagramElements[]
 * 直挂 DMNShape/DMNEdge；DMNDiagram.dmnElementRef 指向该图所绘语义根
 * （空=主 DRD 图；指向决策=该决策的下钻表达式平面图，多平面语义）。
 */
/// <reference path="../types/moddle-xml.d.ts" />
import { Reader } from 'moddle-xml';
import type { DmnModdle } from '../meta/DmnModdle';
import type { DmnNamespaces } from './DmnNamespaces';

export interface DmnParseResult {
  definitions: any;
  semanticById: Map<string, any>;
  references: { element: any; property: string; id: string }[];
  warnings: string[];
  /** 主图（DRD）DMNDiagram 的平面目标 id（DMNDiagram 无 dmnElementRef 或指向非 DRG 叶时视为主图） */
  planeTargetId: string;
}

/** isReference 属性值（引擎自动解析为元素对象；悬空时保留 id 字符串）统一取 id */
export function referenceId(ref: unknown): string {
  // DMN 引用三形态：已解析对象（.id）/ DMNElementReference 盒（.href 字符串，
  // requiredInput/requiredDecision 等——描述符 href 是 String 不做解析）/
  // 裸字符串。href 与裸串都可能带 '#' 前缀，统一剥除
  if (typeof ref === 'string') {
    return ref.startsWith('#') ? ref.slice(1) : ref;
  }
  const anyRef = ref as any;
  const raw = typeof anyRef?.href === 'string' ? anyRef.href : String(anyRef?.id ?? '');
  return raw.startsWith('#') ? raw.slice(1) : raw;
}

/**
 * 主图定位规则（导入/建图共享）：dmnElementRef 为空的首图即主 DRD 图
 * （外部工具可能把决策下钻图排在前面，带 dmnElementRef 的图跳过）；
 * 全部图都带 dmnElementRef 时退回首图；无图（退化文档）返回 null。
 */
export function mainDiagram(definitions: any): { planeTargetId: string; diagram: any } | null {
  let fallback: { planeTargetId: string; diagram: any } | null = null;
  for (const diagram of definitions.dmnDI?.diagrams ?? []) {
    const hit = { planeTargetId: referenceId(diagram.dmnElementRef), diagram };
    if (!hit.planeTargetId) {
      return hit;
    }
    fallback ??= hit;
  }
  return fallback;
}

/** 语义元素 → 其专属下钻平面图（DMNDiagram 节点；无则 null）。引用已由引擎解析为元素对象，悬空 id 串兜底比对 */
export function diagramOfElement(definitions: any, bo: any): any | null {
  for (const diagram of definitions?.dmnDI?.diagrams ?? []) {
    const target = diagram.dmnElementRef;
    if (target === bo || (target && referenceId(target) === bo.id)) {
      return diagram;
    }
  }
  return null;
}

export class DmnReader {
  static $inject = ['dmnModdle', 'dmnNamespaces'];

  constructor(
    private readonly dmnModdle: DmnModdle,
    // 命名空间注册表：构造期校验/声明宿主扩展前缀（moddle 描述合并的伴生侧）
    namespaces: DmnNamespaces
  ) {}

  async parse(xml: string): Promise<DmnParseResult> {
    const reader = new Reader({ model: this.dmnModdle.moddle(), lax: true });
    const rootHandler = reader.handler('dmn:Definitions');

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
      planeTargetId: mainDiagram(parsed.rootElement)?.planeTargetId ?? ''
    };
  }
}
