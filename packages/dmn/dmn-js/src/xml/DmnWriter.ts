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
 * XML 导出器：moddle-xml Writer（描述驱动，MIT）为内核。
 *
 * 语义树（含 DI 图）由引擎按元模型描述序列化——元素顺序/属性形态/命名空间
 * 声明/引用 id 化全部描述驱动，新元素接入无需改本文件。画布几何与 DI 的
 * 一致性由 DmnUpdater 的 elements.changed 同步钩子维护（画布=编辑视图，
 * 树=序列化事实源），导出侧无文档级前处理（DMN 无朝向语义）。
 */
/// <reference path="../types/moddle-xml.d.ts" />
import { Writer as ModdleXmlWriter } from 'moddle-xml';
import type { DmnDocumentState } from './DocumentState';

export class DmnWriter {
  static $inject = ['dmnDocumentState'];

  constructor(private readonly state: DmnDocumentState) {}

  serialize(): string {
    return new ModdleXmlWriter({ format: true }).toXML(this.state.definitions);
  }
}
