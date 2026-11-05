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
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * for more details (a copy is included in the licenses/ directory that
 * accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 工具与动作图标构建器（两内核共享的机制层）。
 *
 * 图标体（bodies）由各内核本地定义——其中图标集（IconSet 资产）剪影条目
 * 依赖各内核的本地资产表；本模块只收敛外壳/包装机制与类型保真入口，
 * 使两内核的 toolIconHtml/toolEntryHtml 行为恒同源。
 */
import { svgShell, entryShell } from './shell';

/**
 * 由图标体记录构造工具图标入口（18 网格）。
 * 泛型保留字面量键——toolIconHtml/toolEntryHtml 的入参类型即 bodies 的键集合。
 * 可选 color：图标体统一以 currentColor 着色，包一层 `<g color=…>` 令其解析
 * 到指定色（SVG color 是合法 presentation attribute，currentColor 继承之）；
 * 不传维持宿主 CSS color 继承（悬停变色等仍由外层 CSS 接管）。
 */
export function createToolIcons<B extends Record<string, string>>(bodies: B) {
  const toolIconHtml = (name: keyof B & string, size = 18, color?: string): string =>
    svgShell(color ? `<g color="${color}">${bodies[name]}</g>` : bodies[name], 18, size);
  const toolEntryHtml = (name: keyof B & string, size = 18, color?: string): string =>
    entryShell(toolIconHtml(name, size, color));
  return { toolIconHtml, toolEntryHtml };
}
