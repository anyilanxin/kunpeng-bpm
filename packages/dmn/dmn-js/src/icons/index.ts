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
 * 图标统一目录 —— 全库图标的管理与绘制（全自绘 SVG，不依赖字体图标库）。
 *
 * - ToolIcons：工具与动作图标（currentColor 18 网格）；
 * - AlignIcons：对齐 / 分布图标（context pad 触发钮 + 弹框菜单条目）。
 *
 * 边界：画布图形渲染（DmnRenderer / render/DmnSymbols 的记法形状）属于
 * 画布绘制域，不是图标资产，仍归 render。
 */
export * from './ToolIcons';
export * from './AlignIcons';
