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
import { isSubProcessFamily, metaId, subProcessExpandedOf } from '../meta/ElementTypes';
import type { BpmnFactory } from '../factory/BpmnFactory';
import { bpmnIconHtml, loopMarkerIconHtml } from '../icons/BpmnIcons';
import { loopKindOf, type LoopKind } from '../meta/LoopCharacteristics';
import { replaceTarget } from '../command/ReplaceElementHandler';
import { planeHasContent } from '../plane/PlaneService';
import { iconSetAsset } from '../icons/IconSet';
import { PopupMenuEntriesCache } from './BpmnElementMenuProvider';

export class BpmnReplaceMenuProvider {
  static $inject = ['popupMenu', 'eventBus', 'bpmnElementTypes', 'modeling', 'bpmnFactory', 'bpmnI18n'];

  static readonly MENU_ID = 'bpmn-replace';

  constructor(
    popupMenu: any,
    eventBus: any,
    private readonly elementTypes: BpmnElementTypes,
    private readonly modeling: any,
    private readonly bpmnFactory: BpmnFactory,
    private readonly i18n: any
  ) {
    this.cache = new PopupMenuEntriesCache(eventBus);
    popupMenu.registerProvider(BpmnReplaceMenuProvider.MENU_ID, this);
  }

  private readonly cache: PopupMenuEntriesCache;

  getPopupMenuEntries(target: any): Record<string, any> {
    const bo = target.businessObject;
    // 池/泳道：无 morph 族，唯一条目=清空内容（2026-11-18 用户参照定规；
    // 图标=icons/bpmn-icon-lane.svg）。内容收集在动作触发时进行，条目静态
    if (bo?.$type === 'bpmn:Participant' || bo?.$type === 'bpmn:Lane') {
      const isPool = bo.$type === 'bpmn:Participant';
      return {
        'clear-container': {
          label: this.i18n.t(isPool ? '清空池（删除内容）' : '清空泳道（删除内容）'),
          imageHtml: laneMenuIconHtml(),
          title: this.i18n.t(isPool ? '清空池（删除内容）' : '清空泳道（删除内容）'),
          action: () => {
            const contents = collectContents(target);
            if (contents.length) {
              this.modeling.removeElements(contents);
            }
          }
        }
      };
    }
    const meta = this.elementTypes.shapeMeta(bo?.$type);
    if (!meta?.replaceFamily) {
      return {};
    }
    // 族 id 在闭包外定格（闭包会丢失 optional narrowing）
    const familyId = meta.replaceFamily;
    // 带内容的子流程（下钻平面有元素/内联子元素）仅允许折叠形态间 morph：
    // 展开形态=子元素 DI 须迁回主平面（独立需求，见 design-docs 缓执行项），
    // 跨族=替换处理器不迁移容器子元素、平面内容会被孤儿化
    const contentLocked = isSubProcessFamily(bo.$type) && planeHasContent(bo);

    // 自身排除走注册表统一身份比较（matchesElement 四轴：类型/事件符号/非中断/折叠态）
    return this.cache.get(target, () => {
      const entries: Record<string, any> = {};
      for (const candidate of this.elementTypes.replaceTargets(familyId)) {
        if (this.elementTypes.matchesElement(candidate, target)) {
          continue;
        }
        if (contentLocked && !(isSubProcessFamily(candidate.type) && subProcessExpandedOf(candidate) === false)) {
          continue;
        }
        entries[`replace-${metaId(candidate)}`] = {
          label: this.i18n.t(candidate.label),
          imageHtml: bpmnIconHtml(candidate, 20, this.elementTypes.iconFillOf(candidate) ?? 'currentColor'),
          title: this.i18n.t(candidate.label),
          action: () => {
            this.modeling.replaceElement(target, {
              // replaceTarget 打包 type/eventSymbol/nonInterrupting/symbol——
              // symbol 必传：替换处理器按 subProcessEvent 落 triggeredByEvent；
              // 折叠位由注册表形态单一来源推导（SubProcess/AdHocSubProcess 折叠变体）
              ...replaceTarget(candidate),
              collapsed: subProcessExpandedOf(candidate) === false
            });
          }
        };
      }
      return entries;
    });
  }

  /**
   * 标题行循环特性切换钮（diagram-js PopupMenu 契约：getPopupMenuHeaderEntries）。
   * 动态读当前态；active 高亮当前标记。选中即关闭弹框（不重开）。
   */
  getPopupMenuHeaderEntries(target: any): Record<string, any> {
    // BPMN 2.0 §10.2.2：loopCharacteristics 仅活动类可有——事件/网关/数据/容器不出钮
    if (this.elementTypes.family(target.businessObject?.$type) !== 'activity') {
      return {};
    }
    const toggle = (kind: LoopKind) => () => {
      const current = loopKindOf(target.businessObject);
      const next = current === kind ? null : this.bpmnFactory.createLoopCharacteristics(kind);
      // 选中即关（2026-11-04 用户定规）：updateProperties 触发 commandStack.changed
      // → PopupMenu CLOSE_EVENTS 自动收起，此后保持关闭、不重开
      this.modeling.updateProperties(target, { loopCharacteristics: next });
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
}

/** 清空条目图标：icons/bpmn-icon-lane.svg（IconSet 'lane'，用户指认） */
function laneMenuIconHtml(): string {
  const a = iconSetAsset('lane');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.w} ${a.h}" width="20" height="20" fill="currentColor" aria-hidden="true">${a.body}</svg>`;
}

/**
 * 容器内容收集（清空池/泳道用）：流节点/数据/注记真实删除，泳道结构保留；
 * 标签/连线不取（随宿主级联删除）。归属按几何中心落带（与
 * recomputePoolMembership 同规则）——节点画布父级可能是池也可能是道
 * （领养先于建道的节点恒为池子），故一律从池后代全量扫描再按带过滤；
 * 跨带容器只收带内子节点（带外部分不动），入列节点整棵收（级联删）。
 */
function collectContents(container: any): any[] {
  const isLane = container.businessObject?.$type === 'bpmn:Lane';
  const pool = isLane ? container.parent : container;
  const inBand = (el: any): boolean =>
    el.x + el.width / 2 >= container.x && el.x + el.width / 2 <= container.x + container.width &&
    el.y + el.height / 2 >= container.y && el.y + el.height / 2 <= container.y + container.height;
  const out: any[] = [];
  const walk = (parent: any): void => {
    for (const child of parent.children ?? []) {
      if (child.labelTarget || child.waypoints) {
        continue;
      }
      if (child.businessObject?.$type === 'bpmn:Lane') {
        walk(child);
        continue;
      }
      if (isLane && !inBand(child)) {
        walk(child);
        continue;
      }
      out.push(child);
    }
  };
  walk(pool);
  return out;
}
