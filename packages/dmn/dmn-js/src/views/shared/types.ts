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
 * 下钻视图共享类型：编辑器上下文（视图提供者 open 的统一入参，由 DmnViews
 * 注册表在 openView 时组装——DrillBadge 等入口不再自行拼装）。
 */
import type { DmnViews } from '../DmnViews';
import type { DmnFactory } from '../../factory/DmnFactory';
import type { DmnModeling } from '../../command/DmnModeling';

export interface EditorDeps {
  views: DmnViews;
  factory: DmnFactory;
  modeling: DmnModeling;
  /** 图侧事件总线（table-js 视图监听 commandStack.changed 重建） */
  eventBus: any;
}
