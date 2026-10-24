/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates this
 * particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file in the licenses/ directory that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 追加预览（context pad 悬停幽灵）：显示即将追加的元素图形与连线落点。
 *
 * 三条硬约束（旧线踩坑留档）：
 * 1. 落点经 `autoPlace` 事件求取——与真实追加同一事件源，预览位 = 落位天然成立；
 * 2. 幽灵连接**不设 source/target 引用**——diagram-js object-refs 会把挂了引用的
 *    连接自动推进 `source.outgoing`，污染真实追加的碰撞闭包（追加逐个阶梯错位）；
 *    端点只经布局 hints 传入，航点裁剪经 connectionDocking 参数式调用；
 * 3. 幽灵 bo 的 id 在工厂创建时已 claim（画布从未注册），清理必须显式 unclaim，
 *    否则悬停过的图 saveXML 出残影 / 烧 id。
 *
 * 绘制走 diagram-js ComplexPreview（预览图层 + dragger 样式，不进画布注册表）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Rules from 'diagram-js/lib/features/rules/Rules';
import type BaseLayouter from 'diagram-js/lib/layout/BaseLayouter';
import type { BpmnFactory } from '../factory/BpmnFactory';

export interface AppendPreviewHints {
  /** 与真实追加点击同形的连线提示（类型缺省走规则五级推断） */
  connection?: { type: string };
}

export class AppendPreview {
  static $inject = ['eventBus', 'bpmnFactory', 'rules', 'layouter', 'complexPreview'];

  /** 在册幽灵 bo（id 已 claim，hide 时统一释放） */
  private ghostBos: any[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly bpmnFactory: BpmnFactory,
    private readonly rules: Rules,
    private readonly layouter: BaseLayouter,
    private readonly complexPreview: any
  ) {
    // pad 关闭兜底：条目 DOM 被移除不一定派发 mouseout（悬停清理函数收不到）
    eventBus.on('contextPad.close', () => this.hide());
  }

  /** 显示预览：shape 为工厂新建的幽灵（调用方创建，与本服务清理配对） */
  show(source: any, shape: any, hints: AppendPreviewHints = {}): void {
    this.hide();
    // 落点 = autoPlace 事件（中心点，与 autoPlace.append 同源）
    const position = this.eventBus.fire('autoPlace', { source, shape });
    if (!position) {
      this.release(shape.businessObject);
      return;
    }
    shape.x = position.x - shape.width / 2;
    shape.y = position.y - shape.height / 2;
    this.ghostBos.push(shape.businessObject);

    const created: any[] = [shape];
    const connType = hints.connection?.type;
    if (connType && this.rules.allowed('connection.create', { source, target: shape })) {
      const connBo = this.bpmnFactory.create<any>({ $type: connType });
      this.ghostBos.push(connBo);
      // 鸭子类型幽灵连接：渲染器只读 businessObject/waypoints/colors，
      // 不设 source/target（见文件头约束 2）
      const ghost: any = {
        id: `${connBo.id}_preview`,
        type: connType,
        businessObject: connBo,
        waypoints: []
      };
      // 布线器输出即边界锚点航点（规范中点锚/沿边裁剪，见 BpmnLayouter）——
      // 不再经 CroppingConnectionDocking 二次裁剪：其取轮廓路径依赖画布注册的
      // gfx，幽灵元素不在注册表（正是预览的意义）
      ghost.waypoints = this.layouter.layoutConnection(ghost, { source, target: shape });
      created.push(ghost);
    }
    this.complexPreview.create({ created });
  }

  /** 撤预览：清预览图层并释放幽灵 id */
  hide(): void {
    this.complexPreview.cleanUp();
    for (const bo of this.ghostBos.splice(0)) {
      this.bpmnFactory.destroy(bo);
    }
  }

  private release(bo: any): void {
    if (bo) {
      this.bpmnFactory.destroy(bo);
    }
  }
}
