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
 * XML 导出器：moddle-xml Writer（描述驱动，MIT）为内核（与 bpmn-js 内核
 * BpmnWriter 同款同步路径；npm dmn-moddle 的 toXML 便捷方法是对同一 Writer
 * 的 Promise 包装，门面层已具异步契约，不必双层包装）。
 *
 * 语义树（含 definitions.dmnDI）由引擎按元模型描述序列化——元素顺序/属性
 * 形态/命名空间声明/引用 id 化全部描述驱动。画布几何与 DI 的一致性由更新器
 * 的 elements.changed 同步钩子维护（画布=编辑视图，树=序列化事实源）。
 */
/// <reference path="../types/moddle-xml.d.ts" />
import { Writer as ModdleXmlWriter } from 'moddle-xml';
import type { DmnDocumentState } from './DocumentState';

export class DmnWriter {
  static $inject = ['dmnDocumentState'];

  constructor(private readonly state: DmnDocumentState) {}

  serialize(): string {
    return new ModdleXmlWriter({ format: true }).toXML(this.state.definitions) as unknown as string;
  }
}
