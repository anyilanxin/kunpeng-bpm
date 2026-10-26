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
 * 活动 loopCharacteristics（规范 BPMN 2.0 §10.2.2 / §13.3）：
 * 仅活动类（任务族 / 子流程 / 调用活动）可持有——标准循环（StandardLoop，
 * 循环标记 ↻）或多实例（MultiInstanceLoop，isSequential 区分并行 ‖‖‖ 与顺序 ≡）。
 * 渲染标记、替换弹框切换钮、记法图标三方共用此判定。
 */

export type LoopKind = 'loop' | 'parallel' | 'sequential';

/** 语义对象 → 循环特性种类；无循环特性返回 undefined */
export function loopKindOf(bo: any): LoopKind | undefined {
  const lc = bo?.loopCharacteristics;
  if (!lc) {
    return undefined;
  }
  if (lc.$type === 'bpmn:StandardLoopCharacteristics') {
    return 'loop';
  }
  if (lc.$type === 'bpmn:MultiInstanceLoopCharacteristics') {
    // XSD 缺省 isSequential=false（并行），只有显式 true 才是顺序
    return lc.isSequential === true ? 'sequential' : 'parallel';
  }
  return undefined;
}
