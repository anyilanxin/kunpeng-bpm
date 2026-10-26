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
/** 门面公共类型（DMN 域） */

export type ModelerMode = 'edit' | 'preview';

export interface ModelerOptions {
  /** 画布容器（CSS 选择器或元素） */
  container: string | HTMLElement;
  width?: number | string;
  height?: number | string;
  /** 自拼模块集（覆盖默认装配：不传默认集+additionalModules 追加） */
  modules?: unknown[];
  additionalModules?: unknown[];
  /** 初始模式（缺省 edit） */
  mode?: ModelerMode;
  /** i18n 词条覆盖 */
  dmnI18n?: Record<string, string>;
  /** moddle 扩展描述符（业务命名空间注入） */
  moddleExtensions?: Record<string, unknown>;
  [pluginConfig: string]: unknown;
}

/** 导入文档（解析结果归一形态） */
export interface DmnDocument {
  definitions: any;
  planeTargetId: string;
}
