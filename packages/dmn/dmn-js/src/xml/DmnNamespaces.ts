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
 * 命名空间注册表：标准 DMN 1.3/DMNDI 前缀 + 实例化时外部提供的 moddle 扩展。
 *
 * 组件包只内置规范命名空间（Namespace.STANDARD_PREFIXES）；业务扩展
 * （kunpeng 等）经 Modeler 的 moddleExtensions 选项以 moddle 资源
 * 描述符形式注入。未注入时按标准 DMN 1.3 兜底——扩展命名空间的
 * 属性与 xmlns 声明按原文保留往返（DmnReader/DmnWriter 通用路径），
 * 不解析语义。
 */
import { STANDARD_PREFIXES } from './Namespace';
import type { ModdleExtension } from '../meta/ModdleExtension';

export class DmnNamespaces {
  static $inject = ['config.moddleExtensions'];

  private readonly extensionPrefixes: readonly { ns: string; prefix: string }[];
  private readonly declared: Set<string>;

  constructor(extensions?: Record<string, ModdleExtension>) {
    const reserved = new Set<string>([
      ...STANDARD_PREFIXES.map((p) => p.prefix),
      ...STANDARD_PREFIXES.map((p) => p.ns)
    ]);
    const collected: { ns: string; prefix: string }[] = [];
    for (const [key, descriptor] of Object.entries(extensions ?? {})) {
      const { prefix, uri } = descriptor ?? ({} as ModdleExtension);
      if (!prefix || !uri) {
        throw new Error(`moddleExtensions.${key} 缺少 prefix / uri（需传入 moddle 资源描述符）`);
      }
      if (reserved.has(prefix) || reserved.has(uri)) {
        throw new Error(`moddleExtensions.${key} 的 prefix/uri 与标准命名空间冲突：${prefix} / ${uri}`);
      }
      reserved.add(prefix);
      reserved.add(uri);
      collected.push({ ns: uri, prefix });
    }
    this.extensionPrefixes = collected;
    this.declared = new Set<string>([
      ...STANDARD_PREFIXES.map((p) => p.ns),
      ...collected.map((p) => p.ns)
    ]);
  }

  /** 导出声明块（有序）：标准 + 外部注入扩展 */
  prefixes(): readonly { ns: string; prefix: string }[] {
    return [...STANDARD_PREFIXES, ...this.extensionPrefixes];
  }

  /** 导出会规范补写声明的命名空间集合（导入侧据此跳过声明捕获，防重复声明） */
  declaredNs(): Set<string> {
    return this.declared;
  }
}
