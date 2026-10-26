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
 * 宿主扩展命名空间注册表：构造期校验/声明（moddle 描述合并的伴生侧）。
 * 组件内置 dmn/dmndi/dc/di（标准）与 kunpeng（自有扩展）——宿主描述符不得
 * 撞占这五个前缀。
 */
import type { ModdleExtension } from '../Types';

const RESERVED_PREFIXES = ['dmn', 'dmndi', 'dc', 'di', 'kunpeng'];

export class DmnNamespaces {
  static $inject = ['config.moddleExtensions'];

  constructor(extensions?: Record<string, ModdleExtension>) {
    for (const [key, descriptor] of Object.entries(extensions ?? {})) {
      const desc = descriptor as Partial<ModdleExtension> | undefined;
      if (!desc || !desc.prefix || !desc.uri || !Array.isArray(desc.types)) {
        throw new Error(
          `moddleExtensions.${key} 描述符非法：需含 prefix/uri/types（moddle 包形态）`
        );
      }
      if (RESERVED_PREFIXES.includes(desc.prefix)) {
        throw new Error(
          `moddleExtensions.${key} 前缀 "${desc.prefix}" 撞占组件内置命名空间（${RESERVED_PREFIXES.join('/')}）`
        );
      }
    }
  }
}
