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
 * 只读查看器（Viewer/NavigatedViewer）：编辑类服务不进注入器。
 */
import type { ModuleDeclaration } from 'didi';
import { Modeler, type ModelerOptions } from './Modeler';
import { ViewerModules, NavigatedViewerModules } from './modules';

export type ViewerOptions = Omit<ModelerOptions, 'mode'> & {
  [pluginConfig: string]: unknown;
};

export class Viewer extends Modeler {
  constructor(options: ViewerOptions) {
    // mode 固定 preview：规则层全禁 + 只读容器标记
    super({ ...options, mode: 'preview' } as ModelerOptions);
  }

  protected override resolveModules(): ModuleDeclaration[] {
    return [...ViewerModules];
  }

  override setMode(): void {
    throw new Error('Viewer 为只读查看器，不支持模式切换——需要编辑请使用 Modeler');
  }
}

export class NavigatedViewer extends Viewer {
  protected override resolveModules(): ModuleDeclaration[] {
    return [...NavigatedViewerModules];
  }
}
