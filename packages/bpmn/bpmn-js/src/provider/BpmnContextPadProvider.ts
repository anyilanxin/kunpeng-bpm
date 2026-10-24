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
 * 上下文面板 Provider：追加族 / 连线 / 替换 / 删除 / 泳道操作 / 多选对齐弹框入口。
 * 图标为 icons/ 自绘 SVG（记法缩样 + 工具图标，经 entry.html 注入）。
 * 可整体替换（didi 组件 `contextPadProvider`）。
 */
import type { BpmnElementTypes } from '../meta/ElementTypes';
import { isContainerType, metaId } from '../meta/ElementTypes';
import { BpmnAlignMenuProvider } from './BpmnAlignMenuProvider';
import { BpmnAppendMenuProvider, BpmnCreateMenuProvider } from './BpmnElementMenuProvider';
import { bpmnEntryHtml } from '../icons/BpmnIcons';
import { toolEntryHtml } from '../icons/ToolIcons';
import { alignPadEntryHtml } from '../icons/AlignIcons';
import { BpmnPopup } from './BpmnPopup';
import type { BpmnMode } from '../mode/BpmnMode';

const APPENDABLE_BY_FAMILY: Record<string, string[]> = {
  event: ['bpmn:Task', 'bpmn:ExclusiveGateway', 'bpmn:EndEvent'],
  activity: ['bpmn:Task', 'bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:EndEvent', 'bpmn:SubProcess'],
  gateway: ['bpmn:Task', 'bpmn:EndEvent']
};

export class BpmnContextPadProvider {
  static $inject = [
    'contextPad',
    'bpmnElementTypes',
    'elementFactory',
    'autoPlace',
    'connect',
    'modeling',
    'popupMenu',
    'bpmnPopup',
    'bpmnI18n',
    'bpmnMode',
    'orientationService'
  ];

  constructor(
    contextPad: any,
    private readonly elementTypes: BpmnElementTypes,
    private readonly elementFactory: any,
    private readonly autoPlace: any,
    private readonly connect: any,
    private readonly modeling: any,
    private readonly popupMenu: any,
    private readonly bpmnPopup: BpmnPopup,
    private readonly i18n: any,
    private readonly bpmnMode: BpmnMode,
    private readonly orientationService: any
  ) {
    contextPad.registerProvider(this);
  }

  getContextPadEntries(element: any): Record<string, any> {
    // 预览模式无编辑入口（选择保留——供属性面板等宿主读取当前元素）
    if (!this.bpmnMode.isEditable()) {
      return {};
    }
    // 标签元素不出操作钮（编辑走双击直编，移动走拖拽）
    if (element.labelTarget) {
      return {};
    }
    const bo = element.businessObject;
    if (!bo?.$type?.startsWith('bpmn:')) {
      return {};
    }
    const type = bo.$type;
    const entries: Record<string, any> = {};

    // ---- 追加族（流节点） ----
    if (this.isFlowNode(element) && type !== 'bpmn:EndEvent' && type !== 'bpmn:BoundaryEvent') {
      const family = this.elementTypes.family(type);
      const appendTargets = APPENDABLE_BY_FAMILY[family ?? ''] ?? ['bpmn:Task'];
      for (const targetType of appendTargets) {
        const metas = this.elementTypes.paletteShapeEntries().filter((m) => m.type === targetType);
        const meta = metas.find((m) => m.paletteGroup === 'activities' || m.paletteGroup === 'gateways' || m.paletteGroup === 'endEvents' || m.paletteGroup === 'subProcesses')
          ?? metas[0];
        if (!meta) continue;
        entries[`append-${metaId(meta)}`] = {
          group: 'append',
          html: bpmnEntryHtml(meta),
          title: `${this.i18n.t('追加')} ${this.i18n.t(meta.label)}`,
          action: {
            click: () => {
              // 创建载荷统一走注册表 createAttrs（nonInterrupting/symbol 与弹框一致）
              const shape = this.elementFactory.createShape(this.elementTypes.createAttrs(meta));
              this.autoPlace.append(element, shape, {
                connection: { type: 'bpmn:SequenceFlow' }
              });
            }
          }
        };
      }
      // ---- "…"：全量追加弹框（快捷追加之外的全部可追加类型） ----
      if (!this.popupMenu.isEmpty(element, BpmnAppendMenuProvider.MENU_ID)) {
        entries['append-more'] = {
          group: 'append',
          html: toolEntryHtml('more'),
          title: this.i18n.t('追加更多元素'),
          action: {
            click: () => this.openElementMenu(element, BpmnAppendMenuProvider.MENU_ID, '追加元素')
          }
        };
      }
    }

    // ---- "+"：容器内创建弹框（池/泳道/展开子流程） ----
    if (isContainerType(type, element.isExpanded) && !this.popupMenu.isEmpty(element, BpmnCreateMenuProvider.MENU_ID)) {
      entries['create-inside'] = {
        group: 'edit',
        html: toolEntryHtml('plus'),
        title: this.i18n.t('创建元素'),
        action: {
          click: () => this.openElementMenu(element, BpmnCreateMenuProvider.MENU_ID, '创建元素')
        }
      };
    }

    // ---- 连线（流节点/池） ----
    if (this.isFlowNode(element) || type === 'bpmn:Participant') {
      entries['connect'] = {
        group: 'connect',
        html: toolEntryHtml('connect'),
        title: this.i18n.t('连线'),
        action: {
          click: (event: any) => {
            const mid = {
              x: element.x + element.width / 2,
              y: element.y + element.height / 2
            };
            this.connect.start(event, element, mid, true);
          }
        }
      };
    }

    // ---- 文本注释（任意形状元素可注；注记放元素上方，经 Association 关联） ----
    if (!element.waypoints && !element.labelTarget && type !== 'bpmn:TextAnnotation') {
      const annotationMeta = this.elementTypes.shapeMeta('bpmn:TextAnnotation')!;
      entries['annotate'] = {
        group: 'connect',
        html: bpmnEntryHtml(annotationMeta),
        title: this.i18n.t('添加文本注释'),
        action: {
          click: () => {
            const shape = this.elementFactory.createShape({ type: 'bpmn:TextAnnotation' });
            this.autoPlace.append(element, shape, { connection: { type: 'bpmn:Association' } });
          }
        }
      };
    }

    // ---- 替换（可替换族）：pad 锚定（与追加/创建弹框同锚；切换钮重开亦用此锚） ----
    // SubProcess 折叠/展开替换（同族同型不同尺寸）——可替换族直接查注册表
    if (this.elementTypes.shapeMeta(type)?.replaceFamily) {
      entries['replace'] = {
        group: 'edit',
        html: toolEntryHtml('wrench'),
        title: this.i18n.t('替换类型'),
        action: {
          click: () => this.openElementMenu(element, 'bpmn-replace', '更改元素类型')
        }
      };
    }

    // ---- 泳道操作（朝向感知：水平池行带=上/下插，垂直池列带=左/右插） ----
    if (type === 'bpmn:Participant' || type === 'bpmn:Lane') {
      const beforeLabel = this.orientationService.isHorizontal() ? '向上' : '向左';
      const afterLabel = this.orientationService.isHorizontal() ? '向下' : '向右';
      entries['lane-add-before'] = {
        group: 'lanes',
        html: toolEntryHtml('lane-insert-above'),
        title: this.i18n.t(`${beforeLabel}添加泳道`),
        action: { click: () => this.modeling.addLane(element, 'top') }
      };
      entries['lane-add-after'] = {
        group: 'lanes',
        html: toolEntryHtml('lane-insert-below'),
        title: this.i18n.t(`${afterLabel}添加泳道`),
        action: { click: () => this.modeling.addLane(element, 'bottom') }
      };
      if (type === 'bpmn:Lane') {
        entries['lane-divide-two'] = {
          group: 'lanes',
          html: toolEntryHtml('lane-divide-two'),
          title: this.i18n.t('分割泳道为 2 段'),
          action: { click: () => this.modeling.addLane(element, 'divide', 2) }
        };
        entries['lane-divide-three'] = {
          group: 'lanes',
          html: toolEntryHtml('lane-divide-three'),
          title: this.i18n.t('分割泳道为 3 段'),
          action: { click: () => this.modeling.addLane(element, 'divide', 3) }
        };
        entries['lane-remove'] = {
          group: 'lanes',
          html: toolEntryHtml('lane'),
          title: this.i18n.t('删除泳道'),
          action: { click: () => this.modeling.removeLane(element) }
        };
      }
    }

    // ---- 折叠/展开子流程 ----
    if (type === 'bpmn:SubProcess') {
      const collapsed = element.isExpanded === false;
      entries[collapsed ? 'sp-expand' : 'sp-collapse'] = {
        group: 'edit',
        html: toolEntryHtml(collapsed ? 'subprocess-expand' : 'subprocess-collapse'),
        title: collapsed ? this.i18n.t('展开子流程') : this.i18n.t('折叠子流程'),
        action: {
          click: () =>
            this.modeling.replaceElement(element, { type: 'bpmn:SubProcess', collapsed: !collapsed })
        }
      };
    }

    // ---- 删除 ----
    entries['delete'] = {
      group: 'edit',
      html: toolEntryHtml('trash'),
      title: this.i18n.t('删除（Delete）'),
      action: {
        click: () => this.modeling.removeElements([element])
      }
    };

    return entries;
  }

  getMultiElementContextPadEntries(elements: any[]): Record<string, any> {
    if (elements.length < 2 || !this.bpmnMode.isEditable()) {
      return {};
    }
    const entries: Record<string, any> = {};
    // ---- 对齐 / 分布：单图标入口，点击在 pad 正下方弹出菜单（2 个=仅对齐，3+=对齐+分布） ----
    if (!this.popupMenu.isEmpty(elements, BpmnAlignMenuProvider.MENU_ID)) {
      entries['align-elements'] = {
        group: 'align',
        title: this.i18n.t('对齐 / 分布'),
        html: alignPadEntryHtml(),
        action: {
          click: () => this.openAlignMenu(elements)
        }
      };
    }
    entries['delete'] = {
      group: 'edit',
      html: toolEntryHtml('trash'),
      title: this.i18n.t('删除所选（Delete）'),
      action: {
        click: () => this.modeling.removeElements(elements)
      }
    };
    return entries;
  }

  /** 对齐菜单：pad 左缘正下方展开（BpmnPopup 统一参数与锚定） */
  private openAlignMenu(elements: any[]): void {
    this.bpmnPopup.open(elements, BpmnAlignMenuProvider.MENU_ID, { kind: 'pad', target: elements }, this.i18n.t('对齐 / 分布'));
  }

  /** 元素弹框（替换/追加/创建）：同款 pad 锚定与家族样式 */
  private openElementMenu(element: any, menuId: string, title: string): void {
    this.bpmnPopup.open(element, menuId, { kind: 'pad', target: element }, this.i18n.t(title));
  }

  private isFlowNode(element: any): boolean {
    const t = element.businessObject?.$type;
    return !!t && (this.elementTypes.family(t) === 'event' || this.elementTypes.family(t) === 'activity' || this.elementTypes.family(t) === 'gateway');
  }
}
