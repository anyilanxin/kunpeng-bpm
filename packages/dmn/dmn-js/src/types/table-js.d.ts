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
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * inferno@5 / inferno-create-element@5 最小类型垫片（组件层 createElement 手写
 * vdom，宽 any）；npm table-js@9.4.0 不带类型声明，最小 any 垫片同置于此
 * （Sheet/Components/EventBus 语义见上游源码快照 design-docs/code/table-js/）。
 */
declare module 'inferno' {
  export class Component<P = any, S = any> {
    constructor(props?: P, context?: any);
    props: P;
    state: S;
  }
}
declare module 'inferno-create-element' {
  export function createElement(tag: any, props: any, ...children: any[]): any;
}
declare module 'table-js' {
  const Table: any;
  export default Table;
}
declare module 'table-js/lib/features/selection' {
  const selectionModule: any;
  export default selectionModule;
}
declare module 'table-js/lib/features/interaction-events' {
  const interactionEventsModule: any;
  export default interactionEventsModule;
}
