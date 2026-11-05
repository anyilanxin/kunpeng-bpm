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
/** moddle-xml（MIT，纯 JS 发布无类型）最小声明：本库消费面 */
declare module 'moddle-xml' {
  import type { Moddle } from 'moddle';

  export interface ModdleXmlReference {
    element: any;
    property: string;
    id: string;
  }

  export interface FromXmlResult {
    rootElement: any;
    references: ModdleXmlReference[];
    warnings: { message: string }[];
    elementsById: Record<string, any>;
  }

  export class Reader {
    constructor(options: { model: Moddle; lax?: boolean });
    handler(typeName: string): unknown;
    fromXML(xml: string, rootHandler: unknown): Promise<FromXmlResult>;
  }

  export class Writer {
    constructor(options?: { format?: boolean; preamble?: boolean });
    toXML(tree: any, writer?: unknown): string;
  }
}
