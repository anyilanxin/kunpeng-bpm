/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 */
/**
 * @kunpeng-io/dmn-js-toolbar：悬浮工具栏插件（相对画布水平居中，对齐 bpmn 线
 * bpmn-js-toolbar；无布局/转置钮——dmn 无朝向模型）。
 *
 * 接入（三种实例形态通用；撤销重做组在只读底座缺编辑服务时整组不建，
 * 缩放组与宿主动作照常——宿主动作声明 showInPreview 才在只读态保留）：
 * ```ts
 * import { DmnToolbarModule } from '@kunpeng-io/dmn-js-toolbar';
 * import '@kunpeng-io/dmn-js-toolbar/styles';
 *
 * new Modeler({
 *   additionalModules: [DmnToolbarModule],
 *   dmnToolbar: { actions: [{ id: 'export', title: '导出', svg, onClick, showInPreview: true }] }
 * });
 * ```
 */
import { DmnToolbar } from './Toolbar';

export type { ToolbarActionSpec, ToolbarConfig } from './Toolbar';

/** DI 模块声明（急切初始化：服务不实例化不渲染） */
export const DmnToolbarModule = {
  __init__: ['dmnToolbar'],
  dmnToolbar: ['type', DmnToolbar]
};
