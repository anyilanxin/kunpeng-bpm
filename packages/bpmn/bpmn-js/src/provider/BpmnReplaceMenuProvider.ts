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
import { SIZES, isSubProcessFamily, metaId, subProcessExpandedOf } from '../meta/ElementTypes';
import type { BpmnFactory } from '../factory/BpmnFactory';
import { bpmnIconHtml, loopMarkerIconHtml } from '../icons/BpmnIcons';
import { loopKindOf, type LoopKind } from '../meta/LoopCharacteristics';
import { replaceTarget } from '../command/ReplaceElementHandler';
import { planeHasContent } from '../plane/PlaneService';
import { startEventHostContext } from '../util/ModelUtil';
import { iconSetAsset } from '../icons/IconSet';
import { PopupMenuEntriesCache } from './BpmnElementMenuProvider';

export class BpmnReplaceMenuProvider {
  static $inject = ['popupMenu', 'eventBus', 'bpmnElementTypes', 'modeling', 'bpmnFactory', 'bpmnI18n', 'bpmnDocumentState', 'orientationService'];

  static readonly MENU_ID = 'bpmn-replace';

  constructor(
    popupMenu: any,
    eventBus: any,
    private readonly elementTypes: BpmnElementTypes,
    private readonly modeling: any,
    private readonly bpmnFactory: BpmnFactory,
    private readonly i18n: any,
    private readonly documentState: any,
    private readonly orientationService: any
  ) {
    this.cache = new PopupMenuEntriesCache(eventBus);
    popupMenu.registerProvider(BpmnReplaceMenuProvider.MENU_ID, this);
  }

  private readonly cache: PopupMenuEntriesCache;

  getPopupMenuEntries(target: any): Record<string, any> {
    const bo = target.businessObject;
    // 池/泳道：无 morph 族——空/非空泳道状态机（2026-11-18 用户参照定规）：
    // 非空（有 processRef）→ 唯一条目"清空池/泳道（删除内容）"：内部元素真实
    // 删除 + 全部泳道移除 + 收缩为空泳道形态（600×60 纯框，无头带无标签，
    // context pad 不再出加道/分割钮）；空（无 processRef）→ 唯一条目
    // "切换为非空泳道"：复用既有空流程（或新建）挂 processRef + 恢复默认池形
    if (bo?.$type === 'bpmn:Participant' || bo?.$type === 'bpmn:Lane') {
      const participant = bo.$type === 'bpmn:Participant' ? target : target.parent;
      const pBo = participant?.businessObject;
      if (!pBo?.processRef) {
        return {
          'to-filled-pool': {
            label: this.i18n.t('Switch to non-empty lane'),
            imageHtml: participantMenuIconHtml(),
            title: this.i18n.t('Switch to non-empty lane'),
            action: () => {
              const definitions = this.documentState.definitions;
              const isEmptyProcess = (r: any): boolean =>
                r.$type === 'bpmn:Process' &&
                !(r.flowElements ?? []).length &&
                !(r.laneSets ?? []).some((ls: any) => (ls.lanes ?? []).length);
              const existing = (definitions.rootElements ?? []).find(isEmptyProcess);
              const process = existing
                ?? this.bpmnFactory.createProcess({
                  name: this.i18n.t('Process {n}', { n: String(this.documentState.processes().length + 1) })
                });
              if (!existing) {
                definitions.rootElements.push(process);
              }
              this.modeling.updateProperties(participant, { processRef: process });
              this.modeling.resizeShape(participant, defaultPoolRect(participant, this.orientationService.isHorizontal()));
            }
          }
        };
      }
      const isPool = bo.$type === 'bpmn:Participant';
      return {
        'clear-container': {
          label: this.i18n.t(isPool ? 'Empty pool (delete contents)' : 'Empty lane (delete contents)'),
          imageHtml: laneMenuIconHtml(),
          title: this.i18n.t(isPool ? 'Empty pool (delete contents)' : 'Empty lane (delete contents)'),
          action: () => {
            const contents = collectContents(participant);
            if (contents.length) {
              this.modeling.removeElements(contents);
            }
            const lanes = (participant.children ?? []).filter((c: any) => c.businessObject?.$type === 'bpmn:Lane');
            for (const lane of lanes) {
              this.modeling.removeLane(lane);
            }
            this.modeling.resizeShape(participant, emptyPoolRect(participant, this.orientationService.isHorizontal()));
            this.modeling.updateProperties(participant, { processRef: null });
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

    // 开始事件候选的宿主语境（三语境合法集见 START_EVENT_ALLOWED，规范
    // Table 10.84/85/86 矩阵）：startEvent 族全量候选 + 中间事件族 morph
    // 目标里的 StartEvent 一并受辖
    const startContext = familyId === 'startEvent' || familyId === 'intermediateCatch' || familyId === 'intermediateThrow'
      ? startEventHostContext(target)
      : undefined;
    // 自身排除走注册表统一身份比较（matchesElement 四轴：类型/事件符号/非中断/折叠态）
    return this.cache.get(target, () => {
      const entries: Record<string, any> = {};
      for (const candidate of this.elementTypes.replaceTargets(familyId)) {
        if (this.elementTypes.matchesElement(candidate, target)) {
          continue;
        }
        if (startContext !== undefined && !this.elementTypes.isStartEventFormAllowed(candidate, startContext)) {
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
      'toggle-parallel-mi': entry('parallel', 'Parallel multi-instance'),
      'toggle-sequential-mi': entry('sequential', 'Sequential multi-instance'),
      'toggle-loop': entry('loop', 'Standard loop')
    };
  }
}

/** 切换为非空泳道条目图标：icons/bpmn-icon-pool.svg（IconSet 'participant'） */
function participantMenuIconHtml(): string {
  const a = iconSetAsset('participant');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.w} ${a.h}" width="20" height="20" fill="currentColor" aria-hidden="true">${a.body}</svg>`;
}

/** 清空条目图标：icons/bpmn-icon-lane.svg（IconSet 'lane'，用户指认） */
function laneMenuIconHtml(): string {
  const a = iconSetAsset('lane');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.w} ${a.h}" width="20" height="20" fill="currentColor" aria-hidden="true">${a.body}</svg>`;
}

/**
 * 容器内容收集（清空池/泳道用）：整个参与者的流节点/数据/注记（含各泳道
 * 内与嵌套容器内，入列节点整棵收、标签/连线随宿主级联）；泳道结构不取
 * （清空动作另行逐条 lane.remove 后坍缩为空泳道）。节点画布父级池/道混存
 * （领养先于建道者恒为池子），故从池后代全量扫描。
 */
function collectContents(pool: any): any[] {
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
      out.push(child);
    }
  };
  walk(pool);
  return out;
}

/** 空泳道形态：流向长 POOL_EMPTY_SPAN、堆叠轴厚 POOL_EMPTY_BAND（锚=池现位前缘） */
function emptyPoolRect(pool: any, horizontal: boolean): { x: number; y: number; width: number; height: number } {
  return horizontal
    ? { x: pool.x, y: pool.y, width: SIZES.POOL_EMPTY_SPAN, height: SIZES.POOL_EMPTY_BAND }
    : { x: pool.x, y: pool.y, width: SIZES.POOL_EMPTY_BAND, height: SIZES.POOL_EMPTY_SPAN };
}

/** 默认池形（切回非空泳道）：POOL_W×POOL_H，垂直朝向转置 */
function defaultPoolRect(pool: any, horizontal: boolean): { x: number; y: number; width: number; height: number } {
  return horizontal
    ? { x: pool.x, y: pool.y, width: SIZES.POOL_W, height: SIZES.POOL_H }
    : { x: pool.x, y: pool.y, width: SIZES.POOL_H, height: SIZES.POOL_W };
}
