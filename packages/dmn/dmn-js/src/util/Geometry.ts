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
 * 命令域几何快照工具：命令 execute 侧对画布几何做可撤销快照（revert 按
 * 快照整体回写），拷贝/回写的逐字段样板收敛于此。
 */

/** 连线航点深拷贝快照（入命令上下文存储，revert 原样恢复） */
export function snapshotWaypoints(connection: any): { x: number; y: number }[] {
  return connection.waypoints.map((p: any) => ({ x: p.x, y: p.y }));
}

/** 矩形四字段整体回写（快照恢复/重铺落形共用） */
export function applyRect(target: any, rect: { x: number; y: number; width: number; height: number }): void {
  target.x = rect.x;
  target.y = rect.y;
  target.width = rect.width;
  target.height = rect.height;
}
