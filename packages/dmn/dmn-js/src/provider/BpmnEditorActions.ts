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
 * BPMN 编辑动作：
 * 在 diagram-js 缺省动作（undo/redo/removeSelection/zoom/复制粘贴）之上注册
 * activateDirectEditing —— 选中单元素时激活直接编辑，宿主可经
 * editorActions.trigger('activateDirectEditing') 或自定义键绑调用。
 */
export class BpmnEditorActions {
  static $inject = ['editorActions', 'selection', 'directEditing'];

  constructor(editorActions: any, selection: any, directEditing: any) {
    editorActions.register({
      activateDirectEditing: () => {
        const selected = selection.get();
        if (selected.length === 1) {
          directEditing.activate(selected[0]);
        }
      }
    });
  }
}
