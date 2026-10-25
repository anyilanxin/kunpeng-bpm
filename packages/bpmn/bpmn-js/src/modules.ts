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
 * 模块装配 —— 插件替换点总表（需求规格 §4）。
 *
 * 每个功能点一个具名服务；宿主/插件经 `new Modeler({ additionalModules })`
 * 用同名服务覆盖即完成替换（didi 依赖注入，后者胜出）。
 */
import type { ModuleDeclaration } from 'didi';
import { Ids } from 'ids';
import TextUtil from 'diagram-js/lib/util/Text';

// diagram-js 特性模块（公开依赖面）
import InteractionEventsModule from 'diagram-js/lib/features/interaction-events';
import SelectionModule from 'diagram-js/lib/features/selection';
import DraggingModule from 'diagram-js/lib/features/dragging';
import RulesModule from 'diagram-js/lib/features/rules';
import ModelingModule from 'diagram-js/lib/features/modeling';
import CreateModule from 'diagram-js/lib/features/create';
import MoveModule from 'diagram-js/lib/features/move';
import ResizeModule from 'diagram-js/lib/features/resize';
import ConnectModule from 'diagram-js/lib/features/connect';
import ConnectionPreviewModule from 'diagram-js/lib/features/connection-preview';
import GlobalConnectModule from 'diagram-js/lib/features/global-connect';
import ContextPadModule from 'diagram-js/lib/features/context-pad';
import PaletteModule from 'diagram-js/lib/features/palette';
import ToolManagerModule from 'diagram-js/lib/features/tool-manager';
import LassoToolModule from 'diagram-js/lib/features/lasso-tool';
import SpaceToolModule from 'diagram-js/lib/features/space-tool';
import HandToolModule from 'diagram-js/lib/features/hand-tool';
import AutoPlaceModule from 'diagram-js/lib/features/auto-place';
import AutoResizeModule from 'diagram-js/lib/features/auto-resize';
import AutoScrollModule from 'diagram-js/lib/features/auto-scroll';
import PopupMenuModule from 'diagram-js/lib/features/popup-menu';
import SearchModule from 'diagram-js/lib/features/search';
import OutlineModule from 'diagram-js/lib/features/outline';
import BendpointsModule from 'diagram-js/lib/features/bendpoints';
import AttachSupportModule from 'diagram-js/lib/features/attach-support';
import AlignElementsModule from 'diagram-js/lib/features/align-elements';
import DistributeElementsModule from 'diagram-js/lib/features/distribute-elements';
import SnappingModule from 'diagram-js/lib/features/snapping';
import MouseModule from 'diagram-js/lib/features/mouse';
import SchedulerModule from 'diagram-js/lib/features/scheduler';
import HoverFixModule from 'diagram-js/lib/features/hover-fix';
import GridSnappingModule from 'diagram-js/lib/features/grid-snapping';
import ComplexPreviewModule from 'diagram-js/lib/features/complex-preview';
import DirectEditingModule from 'diagram-js-direct-editing';
// 画布导航（seata Editor.js 同款三件套：滚轮缩放 / 拖拽平移 / 方向键平移）
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
import KeyboardMoveModule from 'diagram-js/lib/navigation/keyboard-move';
import EditorActionsModule from 'diagram-js/lib/features/editor-actions';

// BPMN 层
import { BpmnElementTypes } from './meta/ElementTypes';
import { BpmnFactory } from './factory/BpmnFactory';
import { BpmnElementFactory } from './factory/BpmnElementFactory';
import { BpmnRenderer } from './render/BpmnRenderer';
import { BpmnMode } from './mode/BpmnMode';
import { BpmnRules } from './rules/BpmnRules';
import { BpmnLayouter } from './layout/BpmnLayouter';
import CroppingConnectionDocking from 'diagram-js/lib/layout/CroppingConnectionDocking';
import { BpmnDocumentState } from './xml/DocumentState';
import { BpmnNamespaces } from './xml/BpmnNamespaces';
import { BpmnModdle } from './meta/BpmnModdle';
import { BpmnReader } from './xml/BpmnReader';
import { BpmnWriter } from './xml/BpmnWriter';
import { DiagramBuilder } from './xml/DiagramBuilder';
import { BpmnModeling } from './command/BpmnModeling';
import { BpmnUpdater } from './behavior/BpmnUpdater';
import { BpmnAutoResize } from './behavior/BpmnAutoResize';
import { LaneBandBehavior } from './behavior/LaneBandBehavior';
import { LabelBehavior } from './behavior/LabelBehavior';
import { AutoPlacementBehavior } from './behavior/AutoPlacementBehavior';
import { CollaborationBehavior } from './behavior/CollaborationBehavior';
import { TextAnnotationBehavior } from './behavior/TextAnnotationBehavior';
import { DropTargetBehavior } from './behavior/DropTargetBehavior';
import { ExternalLabelBehavior } from './behavior/ExternalLabelBehavior';
import LabelSupport from 'diagram-js/lib/features/label-support/LabelSupport';
import { BpmnLabelEditingProvider } from './label/LabelEditingProvider';
import { BpmnPaletteProvider } from './provider/BpmnPaletteProvider';
import { BpmnContextPadProvider } from './provider/BpmnContextPadProvider';
import { BpmnPopup } from './provider/BpmnPopup';
import { BpmnPaletteLayout } from './provider/BpmnPaletteLayout';
import { BpmnReplaceMenuProvider } from './provider/BpmnReplaceMenuProvider';
import { BpmnAlignMenuProvider } from './provider/BpmnAlignMenuProvider';
import { BpmnAppendMenuProvider, BpmnCreateMenuProvider } from './provider/BpmnElementMenuProvider';
import { AppendPreview } from './behavior/AppendPreview';
import { LinkCatchBehavior } from './behavior/LinkCatchBehavior';
import { BpmnOutlineProvider } from './provider/BpmnOutlineProvider';
import { BpmnI18n } from './i18n/BpmnI18n';
import { OrientationService } from './meta/Orientation';
import { BpmnEditorActions } from './provider/BpmnEditorActions';

/** 只读查看平台特性（Viewer 底座）：元素事件 / 鼠标 / 调度 / 悬停修正——无选择与编辑 */
export const ViewerPlatformModules: ModuleDeclaration[] = [
  InteractionEventsModule,
  MouseModule,
  SchedulerModule,
  HoverFixModule
];

/** 画布导航特性（Viewer → NavigatedViewer 增量）：滚轮缩放 / 拖拽平移 / 方向键平移 */
export const NavigationModules: ModuleDeclaration[] = [
  ZoomScrollModule,
  MoveCanvasModule,
  KeyboardMoveModule
];

/** 编辑平台特性（Viewer → Modeler 增量）：选择 / 拖放 / 建连 / 面板 / 菜单 / 对齐分布 / 直编等 */
export const EditorPlatformModules: ModuleDeclaration[] = [
  SelectionModule,
  DraggingModule,
  RulesModule,
  ModelingModule,
  CreateModule,
  MoveModule,
  ResizeModule,
  ConnectModule,
  ConnectionPreviewModule,
  GlobalConnectModule,
  ContextPadModule,
  PaletteModule,
  ToolManagerModule,
  LassoToolModule,
  SpaceToolModule,
  HandToolModule,
  AutoPlaceModule,
  AutoResizeModule,
  AutoScrollModule,
  PopupMenuModule,
  SearchModule,
  OutlineModule,
  BendpointsModule,
  AttachSupportModule,
  AlignElementsModule,
  DistributeElementsModule,
  SnappingModule,
  GridSnappingModule,
  ComplexPreviewModule,
  DirectEditingModule,
  EditorActionsModule
];

/** diagram-js 平台特性集（Modeler 全量=查看底座+导航+编辑增量；可被宿主裁剪：不传我们的默认集、自拼 modules） */
export const PlatformModules: ModuleDeclaration[] = [
  ...ViewerPlatformModules,
  ...NavigationModules,
  ...EditorPlatformModules
];

/** BPMN 核心：类型表 / 工厂 / 渲染 / 词典 */
export const BpmnCoreModule: ModuleDeclaration = {
  // bpmnRenderer 必须急切构造：BaseRenderer 仅在构造时向 eventBus 注册，
  // 懒构造会导致画布落到 diagram-js 的 fuchsia 兜底渲染（seata 同款 __init__ 模式）。
  // bpmnMode 同理急切：初始 preview 模式的容器标记类须在首帧前挂上。
  __init__: ['bpmnElementTypes', 'bpmnRenderer', 'bpmnMode'],
  'bpmnIds': ['factory', () => new Ids([36, 36, 1])], // 7 位后缀（自有取值：36bit base36 ≈ 7 位，与示例模板统一，可读性）
  'bpmnElementTypes': ['type', BpmnElementTypes],
  'bpmnFactory': ['type', BpmnFactory],
  'bpmnMode': ['type', BpmnMode],
  'elementFactory': ['type', BpmnElementFactory],
  'textRenderer': ['factory', () => new TextUtil({
    style: { fontFamily: 'system-ui, "PingFang SC", sans-serif', fontSize: 12 },
    size: { width: 100, height: 40 }
  })],
  'bpmnRenderer': ['type', BpmnRenderer],
  'bpmnI18n': ['type', BpmnI18n],
  // translate：面板等插件的通用文案服务（词条查 bpmnI18n 词典，未命中透传原文；
  // {token} 占位按第二参替换）。工厂注入 bpmnI18n，保持与词典服务同源单实例。
  'translate': ['factory', (bpmnI18n: BpmnI18n) => (text: string, replace?: Record<string, string>) => {
    let translated = bpmnI18n.t(text);
    if (replace) {
      translated = translated.replace(/\{(\w+)\}/g, (match, key) => replace[key] ?? match);
    }
    return translated;
  }],
  'orientationService': ['type', OrientationService]
};

/** 规则与布线 */
export const BpmnRulesModule: ModuleDeclaration = {
  __init__: ['bpmnRules'],
  'bpmnRules': ['type', BpmnRules],
  'layouter': ['type', BpmnLayouter],
  // 拖拽连线预览（ConnectionPreview）与航点拖动（BendpointMove）的端点贴边裁剪
  // （diagram-js 按可选服务注入 injector.get('connectionDocking', false)，须宿主注册）；
  // 布线器自身端点走规范锚点吸附（见 BpmnLayouter），不用此服务
  'connectionDocking': ['type', CroppingConnectionDocking]
};

/** 建模命令与语义同步 */
export const BpmnModelingModule: ModuleDeclaration = {
  __init__: ['bpmnUpdater', 'collaborationBehavior', 'laneBandBehavior'],
  'modeling': ['type', BpmnModeling],
  'bpmnUpdater': ['type', BpmnUpdater],
  'collaborationBehavior': ['type', CollaborationBehavior],
  // 泳道带几何：带 resize=移带界（邻带/池沿跟随）、池直改后带重铺、带最小尺寸下限
  'laneBandBehavior': ['type', LaneBandBehavior],
  // 覆盖基座 auto-resize 服务（didi 后注册者胜）：泳道目标重定向到池 + 扩池后泳道带重铺
  'autoResize': ['type', BpmnAutoResize]
};

/** 交互行为：直编 / 自动摆放 / 注记自适应 / 外部标签元素生命周期 */
export const BpmnBehaviorModule: ModuleDeclaration = {
  __init__: ['bpmnLabelEditingProvider', 'labelBehavior', 'externalLabelBehavior', 'labelSupport', 'autoPlacementBehavior', 'textAnnotationBehavior', 'dropTargetBehavior', 'linkCatchBehavior', 'bpmnEditorActions'],
  'bpmnLabelEditingProvider': ['type', BpmnLabelEditingProvider],
  'labelBehavior': ['type', LabelBehavior],
  'externalLabelBehavior': ['type', ExternalLabelBehavior],
  'autoPlacementBehavior': ['type', AutoPlacementBehavior],
  'textAnnotationBehavior': ['type', TextAnnotationBehavior],
  'dropTargetBehavior': ['type', DropTargetBehavior],
  'linkCatchBehavior': ['type', LinkCatchBehavior],
  'bpmnEditorActions': ['type', BpmnEditorActions],
  // 基座标签随动语义：宿主拖动闭包含标签、删除级联删标签、撤销对称恢复
  'labelSupport': ['type', LabelSupport]
};

/** 面板与菜单 Provider */
export const BpmnInteractionModule: ModuleDeclaration = {
  __init__: ['paletteProvider', 'contextPadProvider', 'popupMenuProvider', 'bpmnAlignMenuProvider', 'bpmnAppendMenuProvider', 'bpmnCreateMenuProvider', 'bpmnOutlineProvider', 'bpmnPaletteLayout'],
  'bpmnPopup': ['type', BpmnPopup],
  // 追加预览（context pad 悬停幽灵；懒构造——首个消费者注入时成型）
  'bpmnAppendPreview': ['type', AppendPreview],
  'bpmnPaletteLayout': ['type', BpmnPaletteLayout],
  'paletteProvider': ['type', BpmnPaletteProvider],
  'contextPadProvider': ['type', BpmnContextPadProvider],
  'popupMenuProvider': ['type', BpmnReplaceMenuProvider],
  'bpmnAlignMenuProvider': ['type', BpmnAlignMenuProvider],
  'bpmnAppendMenuProvider': ['type', BpmnAppendMenuProvider],
  'bpmnCreateMenuProvider': ['type', BpmnCreateMenuProvider],
  'bpmnOutlineProvider': ['type', BpmnOutlineProvider]
};

/** 导入导出 */
export const BpmnIOModule: ModuleDeclaration = {
  // bpmnNamespaces 急切初始化：moddleExtensions 描述符非法（缺 prefix/uri、撞标准命名空间）在实例化即报错
  __init__: ['bpmnDocumentState', 'bpmnNamespaces'],
  'bpmnDocumentState': ['type', BpmnDocumentState],
  'bpmnNamespaces': ['type', BpmnNamespaces],
  'bpmnModdle': ['type', BpmnModdle],
  // moddle：引擎实例别名服务（生态插件按 moddle 通用名取 moddle 引擎——
  // getTypeDescriptor/create 等实例方法；工厂回注同一惰性单例，不产生第二份元模型状态）
  'moddle': ['factory', (bpmnModdle: BpmnModdle) => bpmnModdle.moddle()],
  'bpmnReader': ['type', BpmnReader],
  'bpmnWriter': ['type', BpmnWriter],
  'diagramBuilder': ['type', DiagramBuilder]
};

export const BpmnModules: ModuleDeclaration[] = [
  BpmnCoreModule,
  BpmnRulesModule,
  BpmnModelingModule,
  BpmnBehaviorModule,
  BpmnInteractionModule,
  BpmnIOModule
];

/** 只读查看器模块集（Viewer：渲染 + 导入导出 + 元素事件，无任何编辑模块） */
export const ViewerModules: ModuleDeclaration[] = [
  ...ViewerPlatformModules,
  BpmnCoreModule,
  BpmnIOModule
];

/** 可导航查看器模块集（NavigatedViewer：Viewer + 画布导航） */
export const NavigatedViewerModules: ModuleDeclaration[] = [
  ...ViewerModules,
  ...NavigationModules
];
