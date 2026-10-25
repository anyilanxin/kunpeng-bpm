/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
import type { InjectionKey, Ref } from 'vue';
import type { DesignerModel } from './model/DesignerModel';

/** 设计器上下文：根组件 provide，面板/画布/块/属性面板 inject 直达命令层 */
export interface DesignerContext {
  model: DesignerModel;
  /** 命令统一入口（成功 bump 视图 / 失败提示且模型不动） */
  run(command: () => void): void;
  select(id: string | null): void;
  selectedId: Ref<string | null>;
  /** 属性面板编辑提交：模型 updateField + id 改名时选中随迁（否则面板跳空态） */
  updateField(id: string, patch: Record<string, unknown>): void;
}

export const DESIGNER_CONTEXT: InjectionKey<DesignerContext> = Symbol('form-js-designer');
