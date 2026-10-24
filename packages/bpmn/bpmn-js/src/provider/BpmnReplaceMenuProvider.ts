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
 * 替换菜单 Provider（PopupMenu 组件 'bpmn-replace'）：
 * - 同族 morph 条目来自类型注册表；动作走 modeling.replaceElement（可撤销命令）；
 * - 标题行循环特性切换钮（活动族限定）：BPMN 2.0 §10.2.2 规定 loopCharacteristics
 *   仅活动（任务族/子流程/调用活动）可持有——并行多实例 ‖‖‖ / 顺序多实例 ≡ /
 *   标准循环 ↻，再点当前态即清除；动作走 modeling.updateProperties（可撤销）。
 */
import type { BpmnElementTypes } from '../meta/ElementTypes';
import { metaId } from '../meta/ElementTypes';
import type { BpmnFactory } from '../factory/BpmnFactory';
import { bpmnIconHtml, loopMarkerIconHtml } from '../icons/BpmnIcons';
import { loopKindOf, type LoopKind } from '../meta/LoopCharacteristics';
import { replaceTarget } from '../command/ReplaceElementHandler';
import { BpmnPopup } from './BpmnPopup';

export class BpmnReplaceMenuProvider {
  static $inject = ['popupMenu', 'bpmnElementTypes', 'modeling', 'bpmnFactory', 'bpmnPopup', 'bpmnI18n'];

  static readonly MENU_ID = 'bpmn-replace';

  constructor(
    popupMenu: any,
    private readonly elementTypes: BpmnElementTypes,
    private readonly modeling: any,
    private readonly bpmnFactory: BpmnFactory,
    private readonly bpmnPopup: BpmnPopup,
    private readonly i18n: any
  ) {
    popupMenu.registerProvider(BpmnReplaceMenuProvider.MENU_ID, this);
  }

  getPopupMenuEntries(target: any): Record<string, any> {
    const bo = target.businessObject;
    const meta = this.elementTypes.shapeMeta(bo?.$type);
    if (!meta?.replaceFamily) {
      return {};
    }

    const entries: Record<string, any> = {};
    // 自身排除走注册表统一身份比较（matchesElement 四轴：类型/事件符号/非中断/折叠态）
    for (const candidate of this.elementTypes.replaceTargets(meta.replaceFamily)) {
      if (this.elementTypes.matchesElement(candidate, target)) {
        continue;
      }
      entries[`replace-${metaId(candidate)}`] = {
        label: this.i18n.t(candidate.label),
        imageHtml: bpmnIconHtml(candidate),
        title: this.i18n.t(candidate.label),
        action: () => {
          this.modeling.replaceElement(target, {
            // replaceTarget 打包 type/eventSymbol/nonInterrupting/symbol——
            // symbol 必传：替换处理器按 subProcessEvent 落 triggeredByEvent
            ...replaceTarget(candidate),
            collapsed: candidate.symbol === 'subProcessCollapsed'
          });
        }
      };
    }
    return entries;
  }

  /**
   * 标题行循环特性切换钮（diagram-js PopupMenu 契约：getPopupMenuHeaderEntries）。
   * 动态读当前态；active 高亮当前标记。
   */
  getPopupMenuHeaderEntries(target: any): Record<string, any> {
    // BPMN 2.0 §10.2.2：loopCharacteristics 仅活动类可有——事件/网关/数据/容器不出钮
    if (this.elementTypes.family(target.businessObject?.$type) !== 'activity') {
      return {};
    }
    const toggle = (kind: LoopKind) => () => {
      const current = loopKindOf(target.businessObject);
      const next = current === kind ? null : this.bpmnFactory.createLoopCharacteristics(kind);
      this.modeling.updateProperties(target, { loopCharacteristics: next });
      this.reopen(target);
    };
    const entry = (kind: LoopKind, label: string) => ({
      group: 'loop',
      imageHtml: loopMarkerIconHtml(kind),
      title: this.i18n.t(label),
      active: loopKindOf(target.businessObject) === kind,
      action: { click: toggle(kind) }
    });
    return {
      'toggle-parallel-mi': entry('parallel', '并行多实例'),
      'toggle-sequential-mi': entry('sequential', '顺序多实例'),
      'toggle-loop': entry('loop', '标准循环')
    };
  }

  /**
   * 切换后重开弹框：引擎 CLOSE_EVENTS 含 commandStack.changed（PopupMenu
   * _bindAutoClose 契约），updateProperties 必然收起弹框；切换钮语义要求可
   * 连续切换/再选类型，故按同一 pad 锚定重开（BpmnPopup 统一参数与锚定）。
   */
  private reopen(target: any): void {
    this.bpmnPopup.open(target, BpmnReplaceMenuProvider.MENU_ID, { kind: 'pad', target }, this.i18n.t('更改元素类型'));
  }
}
