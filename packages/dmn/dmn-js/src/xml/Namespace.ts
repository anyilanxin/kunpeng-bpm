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
 * DMN 1.3 与 DMNDI 命名空间常量（规范 §11.3 交换语法；URI 与 dmn-moddle@12
 * 描述符一致，前缀约定对齐官方示例 dmn / dmndi / dc / di / xsi）。
 *
 * 组件只内置规范命名空间；业务扩展命名空间（kunpeng 等）一律经
 * Modeler 实例化选项 moddleExtensions 外部注入（见 DmnNamespaces），
 * 未注入时按标准 DMN 1.3 处理——未知命名空间原文保留往返。
 */
export const NS = {
  DMN: 'https://www.omg.org/spec/DMN/20191111/MODEL/',
  DMNDI: 'https://www.omg.org/spec/DMN/20191111/DMNDI/',
  DC: 'http://www.omg.org/spec/DMN/20180521/DC/',
  DI: 'http://www.omg.org/spec/DMN/20180521/DI/',
  XSI: 'http://www.w3.org/2001/XMLSchema-instance'
} as const;

/** 已知 DMN/DI 命名空间集合（扩展属性识别用：不在此列的命名空间属性按扩展保留） */
export const KNOWN_NS = new Set<string>([NS.DMN, NS.DMNDI, NS.DC, NS.DI, NS.XSI]);

/** 标准前缀约定（对齐 dmn-moddle 官方示例产物：dmn / dmndi / dc / di / xsi；导入按命名空间 URI 解析，对源文件前缀无要求） */
export const STANDARD_PREFIXES: readonly { ns: string; prefix: string }[] = [
  { ns: NS.DMN, prefix: 'dmn' },
  { ns: NS.DMNDI, prefix: 'dmndi' },
  { ns: NS.DC, prefix: 'dc' },
  { ns: NS.DI, prefix: 'di' },
  { ns: NS.XSI, prefix: 'xsi' }
];

/** DOM 解析器把 xmlns 声明属性归入的命名空间（attr.namespaceURI === 此值 ⇔ 该属性是命名空间声明） */
export const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';
