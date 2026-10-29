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
 * accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * moddle 扩展描述符（moddle 资源 JSON 的必备字段子集；types 等其余字段本层不消费）。
 * 元模型层的公共类型——DmnModdle（meta）与 DmnNamespaces（xml）共同消费，
 * 住 meta 层避免 meta→xml 的分层倒置（2026-10-29 T1 归位）。
 */
export interface ModdleExtension {
  /** 扩展名（惯例与 moddleExtensions 键一致，仅供诊断） */
  name?: string;
  /** 导出时该命名空间的规范前缀 */
  prefix: string;
  /** 扩展命名空间 URI */
  uri: string;
}
