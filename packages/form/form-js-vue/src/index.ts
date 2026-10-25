/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and directories/ that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */

/**
 * @kunpeng-io/form-js-vue 出口：FormRenderer + 字段注册表，并同源透传
 * 协议包全部导出（宿主单包接入即可拿到类型与引擎）。
 *
 * 宿主接入要点：
 * - element-plus 及其样式由宿主提供（渲染包 peer 依赖，产物不内联 UI 库）；
 * - 校验单一事实源是 FormEngine——不要另接 el-form 的 rules 校验。
 */
export { default as FormRenderer } from './FormRenderer.vue';
export { getFieldComponent, registerField, type FieldComponent } from './registry';
export * from '@kunpeng-io/form-js';
