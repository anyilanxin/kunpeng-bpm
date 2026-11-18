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
import { metaId } from '../meta/ElementTypes';
import { isEventSubProcess } from '../util/ModelUtil';
import type { AppendPreview } from '../behavior/AppendPreview';
import { BpmnAlignMenuProvider } from './BpmnAlignMenuProvider';
import { BpmnAppendMenuProvider, BpmnFlowTypeMenuProvider } from './BpmnElementMenuProvider';
import { bpmnEntryHtml } from '../icons/BpmnIcons';
import { toolEntryHtml } from '../icons/ToolIcons';
import { alignPadEntryHtml } from '@kunpeng-io/kernel-shared';
import { BpmnPopup, type BpmnPopupAnchor } from './BpmnPopup';
import type { BpmnMode } from '../mode/BpmnMode';

const APPENDABLE_BY_FAMILY: Record<string, string[]> = {
  // 快捷追加序：结束 → 网关 → 任务 → 中间事件——收束/分叉等常用元素靠前；
  // 各族只留一个普通网关（排他），子流程等其余类型走"追加更多元素"弹框
  event: ['bpmn:EndEvent', 'bpmn:ExclusiveGateway', 'bpmn:Task', 'bpmn:IntermediateThrowEvent'],
  activity: ['bpmn:EndEvent', 'bpmn:ExclusiveGateway', 'bpmn:Task', 'bpmn:IntermediateThrowEvent'],
  gateway: ['bpmn:EndEvent', 'bpmn:ExclusiveGateway', 'bpmn:Task', 'bpmn:IntermediateThrowEvent']
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
    'orientationService',
    'bpmnAppendPreview'
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
    private readonly orientationService: any,
    private readonly appendPreview: AppendPreview
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

    // ---- 泳道操作（池/泳道；朝向感知：水平池行带=上/下插，垂直池列带=左/右插。
    //      参照布局 2026-11-18：首组置顶，序=上插 → 分割（泳道限定）→ 下插，
    //      三组独立 data-group 与参照一一对应） ----
    // 空泳道（参与者无 processRef 的清空终态）不出加道/分割钮（2026-11-18
    // 用户定规：仅剩更改元素可切回非空泳道）
    if ((type === 'bpmn:Participant' && bo.processRef) || type === 'bpmn:Lane') {
      const beforeLabel = this.orientationService.isHorizontal() ? 'above' : 'left';
      const afterLabel = this.orientationService.isHorizontal() ? 'below' : 'right';
      entries['lane-add-before'] = {
        group: 'lane-insert-above',
        html: toolEntryHtml('lane-insert-above', 18, this.elementTypes.toolFillOf('lane-insert-above')),
        title: this.i18n.t('Add lane {direction}', { direction: this.i18n.t(beforeLabel) }),
        action: { click: () => this.modeling.addLane(element, 'top') }
      };
      // 分割钮仅初始无道池（2026-11-18 用户终定规：只在初始添加泳道时出现，
      // 初始池直接分割组合出泳道；其余情况只有向上/向下添加）
      const poolWithoutLanes = type === 'bpmn:Participant'
        && !(element.children ?? []).some((c: any) => c.businessObject?.$type === 'bpmn:Lane');
      if (poolWithoutLanes) {
        entries['lane-divide-two'] = {
          group: 'lane-divide',
          html: toolEntryHtml('lane-divide-two', 18, this.elementTypes.toolFillOf('lane-divide-two')),
          title: this.i18n.t('Divide lane into 2'),
          action: { click: () => this.modeling.addLane(element, 'divide', 2) }
        };
        entries['lane-divide-three'] = {
          group: 'lane-divide',
          html: toolEntryHtml('lane-divide-three', 18, this.elementTypes.toolFillOf('lane-divide-three')),
          title: this.i18n.t('Divide lane into 3'),
          action: { click: () => this.modeling.addLane(element, 'divide', 3) }
        };
      }
      entries['lane-add-after'] = {
        group: 'lane-insert-below',
        html: toolEntryHtml('lane-insert-below', 18, this.elementTypes.toolFillOf('lane-insert-below')),
        title: this.i18n.t('Add lane {direction}', { direction: this.i18n.t(afterLabel) }),
        action: { click: () => this.modeling.addLane(element, 'bottom') }
      };
    }

    // ---- 追加族（流节点；快捷追加序见 APPENDABLE_BY_FAMILY） ----
    // 事件子流程独立（规范 §13.5.4）：不作连线端点，追加/连线入口全无
    const appendableFlowNode = this.isFlowNode(element) && type !== 'bpmn:EndEvent' && type !== 'bpmn:BoundaryEvent'
      && !isEventSubProcess(element);
    if (appendableFlowNode) {
      const family = this.elementTypes.family(type);
      const appendTargets = APPENDABLE_BY_FAMILY[family ?? ''] ?? ['bpmn:Task'];
      for (const targetType of appendTargets) {
        const metas = this.elementTypes.paletteShapeEntries().filter((m) => m.type === targetType);
        // 中间事件取无符号的普通款（追加总是独立中间事件，符号变体走替换/弹框）
        const meta = metas.find((m) =>
          (m.paletteGroup === 'activities' || m.paletteGroup === 'gateways' || m.paletteGroup === 'endEvents'
            || m.paletteGroup === 'subProcesses' || m.paletteGroup === 'intermediateThrow')
          && (targetType !== 'bpmn:IntermediateThrowEvent' || !m.eventSymbol)
        ) ?? metas[0];
        if (!meta) continue;
        const appendTitle = targetType === 'bpmn:IntermediateThrowEvent'
          ? this.i18n.t('Append intermediate event')
          : `${this.i18n.t('Append')} ${this.i18n.t(meta.label)}`;
        entries[`append-${metaId(meta)}`] = {
          group: 'append',
          html: bpmnEntryHtml(meta, 18, this.elementTypes.iconFillOf(meta)),
          title: appendTitle,
          action: {
            click: () => {
              // 创建载荷统一走注册表 createAttrs（nonInterrupting/symbol 与弹框一致）
              const shape = this.elementFactory.createShape(this.elementTypes.createAttrs(meta));
              this.autoPlace.append(element, shape, {
                connection: { type: 'bpmn:SequenceFlow' }
              });
            },
            // 悬停幽灵预览（diagram-js 契约：300ms 延迟后触发，返回值作 mouseout 清理函数）
            hover: () => {
              const previewShape = this.elementFactory.createShape(this.elementTypes.createAttrs(meta));
              this.appendPreview.show(element, previewShape, {
                connection: { type: 'bpmn:SequenceFlow' }
              });
              return () => this.appendPreview.hide();
            }
          }
        };
      }
    }

    // ---- 文本注释（任意形状元素可注；注记放元素斜角位，经 Association 关联） ----
    if (!element.waypoints && !element.labelTarget && type !== 'bpmn:TextAnnotation') {
      const annotationMeta = this.elementTypes.shapeMeta('bpmn:TextAnnotation')!;
      entries['annotate'] = {
        group: 'append',
        html: bpmnEntryHtml(annotationMeta, 18, this.elementTypes.iconFillOf(annotationMeta)),
        title: this.i18n.t('Add text annotation'),
        action: {
          click: () => {
            const shape = this.elementFactory.createShape({ type: 'bpmn:TextAnnotation' });
            this.autoPlace.append(element, shape, { connection: { type: 'bpmn:Association' } });
          },
          hover: () => {
            const previewShape = this.elementFactory.createShape({ type: 'bpmn:TextAnnotation' });
            this.appendPreview.show(element, previewShape, { connection: { type: 'bpmn:Association' } });
            return () => this.appendPreview.hide();
          }
        }
      };
    }

    // ---- "…"：全量追加弹框（快捷追加之外的全部可追加类型）——三点取类型色
    // 兜底（'*'，2026-10-29 用户定规：与 palette 三点同源同表） ----
    if (appendableFlowNode && !this.popupMenu.isEmpty(element, BpmnAppendMenuProvider.MENU_ID)) {
      entries['append-more'] = {
        group: 'append',
        html: toolEntryHtml('more', 18, this.elementTypes.toolFillOf('more', true)),
        title: this.i18n.t('Append more elements'),
        action: {
          click: (event: MouseEvent) => this.openElementMenu(element, BpmnAppendMenuProvider.MENU_ID, 'Append element', event)
        }
      };
    }

    // ---- 容器内创建「+」钮：整体移除（2026-11-18 用户定规——「…」追加/创建
    //      弹框已覆盖添加元素功能，pad 不重复设入口；池/泳道此前已同批移除）。
    //      创建菜单本体（'bpmn-create'）保留，palette 底部「…」仍是宿主入口 ----

    // ---- 文本注释（任意形状元素可注；注记放元素上方，经 Association 关联） ----
    // （已随快捷追加序上移至追加族之后，见上方 annotate 块）

    // ---- 替换（可替换族）：pad 锚定（与追加/创建弹框同锚；切换钮重开亦用此锚） ----
    // SubProcess 折叠/展开替换（同族同型不同尺寸）——可替换族直接查注册表
    const laneLike = type === 'bpmn:Participant' || type === 'bpmn:Lane';
    if (this.elementTypes.shapeMeta(type)?.replaceFamily || laneLike) {
      entries['replace'] = {
        group: 'edit',
        html: toolEntryHtml('wrench', 18, this.elementTypes.toolFillOf('wrench')),
        title: this.i18n.t(laneLike ? 'Change element' : 'Replace type'),
        action: {
          click: (event: MouseEvent) => this.openElementMenu(element, 'bpmn-replace', 'Change element type', event)
        }
      };
    }

    // ---- 连线类型切换（规则见 BpmnFlowTypeMenuProvider：事件源出线无选项
    //      即 isEmpty 判空不出钮；网关源二态/活动源三态） ----
    if (type === 'bpmn:SequenceFlow' && !this.popupMenu.isEmpty(element, BpmnFlowTypeMenuProvider.MENU_ID)) {
      entries['switch-flow-type'] = {
        group: 'edit',
        html: toolEntryHtml('wrench', 18, this.elementTypes.toolFillOf('wrench')),
        title: this.i18n.t('Switch flow type'),
        action: {
          click: (event: MouseEvent) => this.openElementMenu(element, BpmnFlowTypeMenuProvider.MENU_ID, 'Switch flow type', event)
        }
      };
    }

    // ---- 删除 ----
    entries['delete'] = {
      group: 'edit',
      html: toolEntryHtml('trash', 18, this.elementTypes.toolFillOf('trash')),
      title: this.i18n.t('Delete (Delete)'),
      action: {
        click: () => this.modeling.removeElements([element])
      }
    };

    // ---- 连线（流节点/池；收尾位——手动连线是低频兜底入口，靠后不抢焦点） ----
    // 事件子流程不参与连线（规范 §13.5.4，规则层同步双向拒连）
    if ((this.isFlowNode(element) && !isEventSubProcess(element)) || type === 'bpmn:Participant') {
      entries['connect'] = {
        group: 'connect',
        html: toolEntryHtml('connect', 18, this.elementTypes.toolFillOf('connect')),
        title: this.i18n.t('Connect'),
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
        title: this.i18n.t('Align / distribute'),
        html: alignPadEntryHtml(),
        action: {
          click: (event: MouseEvent) => this.openAlignMenu(elements, event)
        }
      };
    }
    entries['delete'] = {
      group: 'edit',
      html: toolEntryHtml('trash', 18, this.elementTypes.toolFillOf('trash')),
      title: this.i18n.t('Delete selected (Delete)'),
      action: {
        click: () => this.modeling.removeElements(elements)
      }
    };
    return entries;
  }

  /** 对齐菜单：二级弹框贴触发钮（左侧飞出/顶对齐，钮卸载回落选区锚定）；
   * 无搜索 + 无标题 + 紧凑图标栅格每行 3 个（2026-10-25 定规；2026-11-04
   * 用户复调=基于按钮计算 + 内容紧凑 max-content + 定格条目 + 去标题行） */
  private openAlignMenu(elements: any[], event?: MouseEvent): void {
    const trigger = (event?.target as HTMLElement | undefined)?.closest?.('.entry') as HTMLElement | null ?? null;
    const anchor: BpmnPopupAnchor = trigger
      ? { kind: 'padEntry', trigger, target: elements }
      : { kind: 'pad', target: elements };
    this.bpmnPopup.open(elements, BpmnAlignMenuProvider.MENU_ID, anchor, undefined, {
      search: false,
      className: 'bpmn-align-popup',
      width: 'max-content'
    });
  }

  /**
   * 元素弹框（替换/追加/创建）：贴触发钮（padEntry——钮下边左对齐，2026-11-18
   * 用户定规；大池/泳道按元素 gfx 锚定会甩到池体远端）；无触发事件
   * （键盘/重开路径）回落元素锚定。对齐菜单同款取钮方式。
   */
  private openElementMenu(element: any, menuId: string, title: string, event?: MouseEvent): void {
    const trigger = (event?.target as HTMLElement | undefined)?.closest?.('.entry') as HTMLElement | null ?? null;
    const anchor: BpmnPopupAnchor = trigger
      ? { kind: 'padEntry', trigger, target: element }
      : { kind: 'pad', target: element };
    this.bpmnPopup.open(element, menuId, anchor, this.i18n.t(title));
  }

  private isFlowNode(element: any): boolean {
    const t = element.businessObject?.$type;
    return !!t && (this.elementTypes.family(t) === 'event' || this.elementTypes.family(t) === 'activity' || this.elementTypes.family(t) === 'gateway');
  }
}
