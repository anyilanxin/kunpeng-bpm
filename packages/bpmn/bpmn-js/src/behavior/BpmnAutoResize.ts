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
 * 泳道化容器的自动扩框（diagram-js auto-resize 基座的 BPMN 定制）。
 *
 * 核心基座只做"元素逼近/越过容器边→拉伸容器"，对池/泳道有两处不合：
 * 1. 泳道带是池内容区的行政划分而非独立图形——元素跨内部带界时容器本身
 *    并不缺空间，不该有任何扩框；真正要判定的对象是池的outer边界。
 *    故泳道目标一律重定向到所属池再走核心判定。
 * 2. 池被拉伸后泳道带不会跟随——条带会出现底部缺口或跨轴悬空。故池扩
 *    完成后按 refitLaneBands 重铺：边缘带吸收堆叠轴增量、全部带铺满跨轴，
 *    内容不动、条带始终铺满内容区。
 *
 * 扩框落点全部经 modeling.resizeShape（命令栈），与触发命令同处一个
 * action 帧（postExecuted 在 _popAction 之前触发），undo 单步还原。
 */
import AutoResize from 'diagram-js/lib/features/auto-resize/AutoResize';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type Modeling from 'diagram-js/lib/features/modeling/Modeling';
import type Rules from 'diagram-js/lib/features/rules/Rules';
import type { Element, Shape } from 'diagram-js/lib/model/Types';
import type { Rect } from 'diagram-js/lib/util/Types';

import { is } from '../util/ModelUtil';
import { rectsEqual, refitLaneBands } from '../util/PoolGeometry';
import { SIZES, isSubProcessFamily } from '../meta/ElementTypes';
import type { OrientationService } from '../meta/Orientation';
import type { SubProcessMembershipBehavior } from './SubProcessMembershipBehavior';
import { fullyInside, rectsOverlap } from './SubProcessMembershipBehavior';

// 核心 _expand 未进公开类型（d.ts 只暴露 getOffset/getPadding/resize），
// 原型调用保持继承链上的 this 语义
const protoExpand = (AutoResize.prototype as unknown as {
  _expand: (elements: any[], target: any) => void;
})._expand;

export class BpmnAutoResize extends AutoResize {
  static $inject = ['eventBus', 'elementRegistry', 'modeling', 'rules', 'orientationService', 'subProcessMembershipBehavior'];

  constructor(
    eventBus: EventBus,
    private readonly elementRegistry: ElementRegistry,
    private readonly modeling: Modeling,
    rules: Rules,
    private readonly orientationService: OrientationService,
    private readonly membership: SubProcessMembershipBehavior
  ) {
    super(eventBus, elementRegistry, modeling, rules);
  }

  /**
   * 扩框入口（核心各 postExecute 钩子与递归都经此）：泳道目标重定向到
   * 所属池——元素跨内部带界不构成扩框条件，判定对象收敛到池边界；
   * 泳道挂泳道（嵌套道）等非常规结构不扩。
   */
  _expand(elements: any[], target: Shape | string | undefined): void {
    if (!target) {
      return;
    }
    // 泳道带自身不构成池扩框条件：带按定义铺满内容区（跨轴边缘=池边缘，
    // "逼近容器边"判定恒真），池在带轴上的伸缩由 LaneBandBehavior 的带界
    // 跟随语义独占——放行会造成每次带 resize 池跨轴 +offset 的持续蠕变
    if (elements.length && elements.every((e: any) => is(e, 'bpmn:Lane'))) {
      return;
    }
    const resolved = typeof target === 'string' ? this.elementRegistry.get(target) : target;
    if (!resolved) {
      return;
    }
    // 画布根（主平面 Process/Collaboration、子流程下钻平面根）无自有几何：
    // 子流程平面根按容器类型（bpmn:SubProcess）会被规则放行扩框，但 root
    // 无 x/y/width/height，resizeShape 收到缺字段 bounds 抛错并毒死命令栈
    // action 帧（此后 commandStack.changed/elements.changed 永久静默）——
    // root 一律不扩
    if (!resolved.parent || resolved.x === undefined) {
      return;
    }
    // 展开子流程族目标：本 action 帧内发生过成员脱离（SubProcessMembershipBehavior
    // detachedSubs）的子流程默认不因贴缘留守元素扩框——扩容会把刚脱离元素几何
    // 罩住，重导入按几何收养又挂回容器名下（往返自反）。例外：本帧存在骑跨
    // 边线的直属子元素（2026-11-04 二轮定规「拖到边线上触发边框外延」）——
    // 扩容是定规要求的显式结果，优先于防罩。帧收（commandStack.changed）即清
    // 标记，创建/普通内移的扩容路径（最小尺寸随内容增长）不受影响
    if (isSubProcessFamily((resolved as any).businessObject?.$type)
      && (resolved as any).isExpanded !== false
      && this.membership.detachedSubs.has(resolved)
      && !elements.some((e: any) => e.parent === resolved
        && rectsOverlap(e, resolved as any) && !fullyInside(e, resolved))) {
      return;
    }
    let container: any = resolved;
    if (is(container, 'bpmn:Lane')) {
      const pool = container.parent;
      if (!is(pool, 'bpmn:Participant')) {
        return;
      }
      container = pool;
    }
    protoExpand.call(this, elements, container);
  }

  /** 池扩框带泳道重铺；其余容器走基类 resizeShape 原生路径 */
  override resize(shape: Shape, newBounds: Rect, hints?: { autoResize?: string }): void {
    if (is(shape, 'bpmn:Participant')) {
      const lanes = (shape.children ?? []).filter((child: Element) => is(child, 'bpmn:Lane')) as Shape[];
      if (lanes.length) {
        const oldPool = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
        super.resize(shape, newBounds, hints);
        for (const { lane, bounds } of refitLaneBands(
          lanes, oldPool, newBounds, SIZES.POOL_HEADER, this.orientationService.isHorizontal()
        )) {
          if (boundsChanged(lane, bounds)) {
            // 重铺命令必须退出 auto-resize：否则 shape.resize 钩子把重铺的带
            // 又当作越界内容再扩池，扩池又触发重铺——60px 步进的正反馈循环
            this.modeling.resizeShape(lane, bounds, undefined, { autoResize: false });
          }
        }
        return;
      }
    }
    super.resize(shape, newBounds, hints);
  }
}

function boundsChanged(a: { x: number; y: number; width: number; height: number }, b: Rect): boolean {
  return !rectsEqual(a, b);
}
