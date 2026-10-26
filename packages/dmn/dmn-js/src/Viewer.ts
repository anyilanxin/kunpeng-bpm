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
 * 只读查看器三件套之二（与 Modeler 相对，bpmn-js/chor-js 生态同款产品形态）：
 * - Viewer：纯查看——渲染 + 导入导出 + 元素事件，编辑类服务不进注入器；
 * - NavigatedViewer：Viewer + 画布导航（滚轮缩放 / 拖拽平移 / 方向键平移）。
 */
import type { ModuleDeclaration } from 'didi';
import { Modeler, type ModelerOptions } from './Modeler';
import { ViewerModules, NavigatedViewerModules } from './modules';

/** Viewer 构造项（与 ModelerOptions 同形；mode 固定 preview） */
export type ViewerOptions = Omit<ModelerOptions, 'mode'> & {
  /** 插件 config 透传位（Omit 会丢索引签名，这里补回） */
  [pluginConfig: string]: unknown;
};

export class Viewer extends Modeler {
  constructor(options: ViewerOptions) {
    // mode 固定 preview（覆盖宿主入参）：规则层全禁 + 只读容器标记
    // （as 归位：ViewerOptions 的索引签名会让展开丢失必填键的静态类型）
    super({ ...options, mode: 'preview' } as ModelerOptions);
  }

  protected override resolveModules(): ModuleDeclaration[] {
    return [...ViewerModules];
  }

  /** 只读查看器无模式切换语义（切编辑=换 Modeler 实例） */
  override setMode(): void {
    throw new Error('Viewer 为只读查看器，不支持模式切换——需要编辑请使用 Modeler');
  }
}

export class NavigatedViewer extends Viewer {
  protected override resolveModules(): ModuleDeclaration[] {
    return [...NavigatedViewerModules];
  }
}
