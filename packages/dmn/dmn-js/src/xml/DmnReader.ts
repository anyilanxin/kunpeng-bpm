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
 * XML 导入器：npm dmn-moddle（moddle-xml 描述驱动 Reader，MIT）为内核。
 *
 * 元素/属性/类型化/引用全部由元模型描述驱动（标准描述内置 + 宿主
 * moddleExtensions）——lax 模式下未知元素以 Any 形态保留在树上（往返不丢）。
 * DMN 侧引用两形态：DI 的 dmnElementRef（isReference，引擎自动解析）与模型侧
 * DMNElementReference#href（普通属性，不自动解析——由建图侧按 '#id' 剖析）。
 *
 * 输出契约：
 * - definitions：moddle 元素树根（DI 在 definitions.dmnDI.diagrams）
 * - semanticById：id → 元素（含 Any）
 * - warnings：非致命告警
 */
import type { DmnModdle } from '../meta/DmnModdle';
import type { DmnNamespaces } from './DmnNamespaces';

export interface DmnParseResult {
  definitions: any;
  semanticById: Map<string, any>;
  warnings: string[];
}

export class DmnReader {
  static $inject = ['dmnModdle', 'dmnNamespaces'];

  constructor(
    private readonly dmnModdle: DmnModdle,
    // 命名空间注册表：构造期校验宿主扩展描述符（与 DmnModdle 合并装配伴生）
    namespaces: DmnNamespaces
  ) {}

  async parse(xml: string): Promise<DmnParseResult> {
    const moddle: any = this.dmnModdle.moddle();

    let parsed: {
      rootElement: any;
      references: { element: any; property: string; id: string }[];
      warnings: { message?: string }[];
      elementsById: Record<string, any>;
    };
    try {
      parsed = (await moddle.fromXML(xml)) as never;
    } catch (error: any) {
      const detail = error?.warnings?.map((w: any) => w.message).join('; ') || error?.message || String(error);
      throw new Error(`XML 解析失败：${String(detail).slice(0, 300)}`);
    }

    const semanticById = new Map<string, any>(Object.entries(parsed.elementsById ?? {}));
    const warnings = (parsed.warnings ?? []).map((w) => String(w.message ?? w));

    // 引用悬空（模型侧 href 指向不存在的 id）在建图侧表现为跳过，此处汇总告警
    for (const reference of parsed.references ?? []) {
      if (!semanticById.has(reference.id)) {
        warnings.push(`引用目标不存在：${reference.element?.id}.${reference.property} → ${reference.id}`);
      }
    }

    return {
      definitions: parsed.rootElement,
      semanticById,
      warnings
    };
  }
}
