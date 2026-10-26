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
 * DMN 布线器：DRD 需求连线一律**直线**（规范 §6.2.2 图例为直线连接，无 BPMN
 * 式正交折线语义）；端点经裁剪锚定服务贴源/目标形边（不吃进形状描边内）。
 *
 * 与 bpmn 线肘形布线器的分工差异：DMN 无锚点方位语义（形状语义边界即锚域），
 * 中点连线 + 形边裁剪即为规范形态；手动弯点（Bendpoints）拖出的多点路径由
 * diagram-js 航点命令维护，不经本布线器（layoutConnection 只在无既有航点的
 * 创建/移动重排路径被调用）。
 */
import { getMid } from 'diagram-js/lib/layout/LayoutUtil';

export class DmnLayouter {
  static $inject = ['connectionDocking'];

  constructor(private readonly docking: any) {}

  /**
   * 直线布线：两端中点连线 → 裁剪到源/目标形边。hints.connectionStart/End
   * （移动侧局部修复语义）优先于中点——拖动侧锚到悬停光标位，对侧不动。
   */
  layoutConnection(connection: any, hints: any = {}): any[] {
    const source = hints.source || connection.source;
    const target = hints.target || connection.target;
    const raw = [
      hints.connectionStart || getMid(source),
      hints.connectionEnd || getMid(target)
    ];
    return this.docking.getCroppedWaypoints({ waypoints: raw, source, target }, source, target);
  }
}
