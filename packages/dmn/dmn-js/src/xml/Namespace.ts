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
 * BPMN 2.0 与 DI 命名空间常量（规范 §8.2.1 / BPMN DI 章）。
 *
 * 组件只内置规范命名空间；业务扩展命名空间（kunpeng 等）一律经
 * Modeler 实例化选项 moddleExtensions 外部注入（见 BpmnNamespaces），
 * 未注入时按标准 BPMN 2.0 处理——未知命名空间原文保留往返。
 */
export const NS = {
  BPMN: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
  BPMNDI: 'http://www.omg.org/spec/BPMN/20100524/DI',
  OMGDC: 'http://www.omg.org/spec/DD/20100524/DC',
  OMGDI: 'http://www.omg.org/spec/DD/20100524/DI',
  XSI: 'http://www.w3.org/2001/XMLSchema-instance'
} as const;

/** 已知 BPMN/DI 命名空间集合（扩展属性识别用：不在此列的命名空间属性按扩展保留） */
export const KNOWN_NS = new Set<string>([NS.BPMN, NS.BPMNDI, NS.OMGDC, NS.OMGDI, NS.XSI]);

/** 标准前缀约定（对齐 kunpeng-modeler 产物：bpmn / bpmndi / dc / di / xsi；导入按命名空间 URI 解析，对源文件前缀无要求） */
export const STANDARD_PREFIXES: readonly { ns: string; prefix: string }[] = [
  { ns: NS.BPMN, prefix: 'bpmn' },
  { ns: NS.BPMNDI, prefix: 'bpmndi' },
  { ns: NS.OMGDC, prefix: 'dc' },
  { ns: NS.OMGDI, prefix: 'di' },
  { ns: NS.XSI, prefix: 'xsi' }
];

/** DOM 解析器把 xmlns 声明属性归入的命名空间（attr.namespaceURI === 此值 ⇔ 该属性是命名空间声明） */
export const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';
