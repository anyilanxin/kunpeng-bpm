/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
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
 * moddle 列表属性通用增删命令（决策表的子句/规则等）：对宿主元素的数组
 * 属性做可撤销 splice。canvasElement 仅作命令归属与画布刷新载体（表格结构
 * 不影响 DRD 记法，返回 [] 不触发画布重绘；编辑器自行监听命令栈重渲）。
 */
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';

interface ListContext {
  canvasElement: any;
  container: any;
  property: string;
  item: any;
  index?: number;
}

export class ListAddHandler implements CommandHandler {
  execute(context: ListContext): any[] {
    const { container, property, item } = context;
    const list = container[property] ?? (container[property] = []);
    list.splice(context.index ?? list.length, 0, item);
    return [];
  }

  revert(context: ListContext): any[] {
    const { container, property, item } = context;
    const list = container[property];
    const at = list.indexOf(item);
    if (at < 0) {
      throw new Error('撤销增项失败：列表中找不到该项（结构已被外部改动）');
    }
    list.splice(at, 1);
    return [];
  }
}

export class ListRemoveHandler implements CommandHandler {
  execute(context: ListContext): any[] {
    const { container, property, item } = context;
    const list = container[property];
    const at = list.indexOf(item);
    if (at < 0) {
      throw new Error('删项失败：列表中找不到该项');
    }
    context.index = at;
    list.splice(at, 1);
    return [];
  }

  revert(context: ListContext): any[] {
    const { container, property, item, index } = context;
    container[property].splice(index!, 0, item);
    return [];
  }
}
