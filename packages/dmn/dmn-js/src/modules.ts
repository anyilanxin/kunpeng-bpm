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
 * version 2 for more details (a copy is included in the licenses/ directory that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 模块装配（U2：fork bpmn-js 内核布局/交互框架 + DMN 域层）——每功能点一个
 * 具名服务，宿主经 additionalModules 同名覆盖即替换（didi 后注册者胜出）。
 */
import type { ModuleDeclaration } from 'didi';
import { Ids } from 'ids';
import TextUtil from 'diagram-js/lib/util/Text';

// diagram-js 平台特性
import InteractionEventsModule from 'diagram-js/lib/features/interaction-events';
import OverlaysModule from 'diagram-js/lib/features/overlays';
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
import HandToolModule from 'diagram-js/lib/features/hand-tool';
import AutoPlaceModule from 'diagram-js/lib/features/auto-place';
import AutoScrollModule from 'diagram-js/lib/features/auto-scroll';
import PopupMenuModule from 'diagram-js/lib/features/popup-menu';
import OutlineModule from 'diagram-js/lib/features/outline';
import BendpointsModule from 'diagram-js/lib/features/bendpoints';
import SnappingModule from 'diagram-js/lib/features/snapping';
import MouseModule from 'diagram-js/lib/features/mouse';
import SchedulerModule from 'diagram-js/lib/features/scheduler';
import HoverFixModule from 'diagram-js/lib/features/hover-fix';
import GridSnappingModule from 'diagram-js/lib/features/grid-snapping';
import KeyboardModule from 'diagram-js/lib/features/keyboard';
import KeyboardMoveSelectionModule from 'diagram-js/lib/features/keyboard-move-selection';
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';
import EditorActionsModule from 'diagram-js/lib/features/editor-actions';

// DMN 层
import { DmnElementTypes, DmnElementTypes as ElementTypesClass } from './meta/ElementTypes';
import { DmnModdle } from './meta/DmnModdle';
import { DmnFactory } from './factory/DmnFactory';
import { DmnElementFactory } from './factory/DmnElementFactory';
import { DmnRenderer } from './render/DmnRenderer';
import { DmnMode } from './mode/DmnMode';
import { DmnI18n } from './i18n/DmnI18n';
import { DmnRules } from './rules/DmnRules';
import { DmnLayouter } from './layout/DmnLayouter';
import CroppingConnectionDocking from 'diagram-js/lib/layout/CroppingConnectionDocking';
import { DmnDocumentState } from './xml/DocumentState';
import { DmnNamespaces } from './xml/DmnNamespaces';
import { DmnReader } from './xml/DmnReader';
import { DmnWriter } from './xml/DmnWriter';
import { DiagramBuilder } from './xml/DiagramBuilder';
import { DmnModeling } from './command/DmnModeling';
import { DmnUpdater } from './behavior/DmnUpdater';
import { DmnPaletteProvider } from './provider/DmnPaletteProvider';
import { DmnContextPadProvider } from './provider/DmnContextPadProvider';
import { DmnExpressionMenuProvider } from './provider/DmnExpressionMenuProvider';
import { DrillBadgeBehavior } from './drill/DrillBadge';
import { DmnViews } from './views/DmnViews';
import { DmnDecisionTableModule, DmnLiteralViewModule, DmnBoxedViewModule } from './views/DmnViewModules';

/** 只读查看平台特性（Viewer 底座） */
export const ViewerPlatformModules: ModuleDeclaration[] = [
  InteractionEventsModule,
  OverlaysModule,
  MouseModule,
  SchedulerModule,
  HoverFixModule
];

/** 画布导航（NavigatedViewer 增量） */
export const NavigationModules: ModuleDeclaration[] = [ZoomScrollModule];

/** 编辑平台特性（Modeler 增量） */
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
  HandToolModule,
  AutoPlaceModule,
  AutoScrollModule,
  PopupMenuModule,
  OutlineModule,
  BendpointsModule,
  SnappingModule,
  GridSnappingModule,
  KeyboardModule,
  KeyboardMoveSelectionModule,
  EditorActionsModule
];

/** diagram-js 平台特性集（Modeler 全量） */
export const PlatformModules: ModuleDeclaration[] = [
  ...ViewerPlatformModules,
  ZoomScrollModule,
  ...EditorPlatformModules
];

/** DMN 核心：类型表/工厂/渲染/词典/模式/下钻（三形态恒装）+ 下钻视图三模块
 * （2026-10-27 用户裁定恒装：决策表/字面/boxed 各为内部插件模块，经
 * __depends__ 装配，DmnViews 注册表承接分派） */
export const DmnCoreModule: ModuleDeclaration = {
  __depends__: [DmnDecisionTableModule, DmnLiteralViewModule, DmnBoxedViewModule],
  // dmnRenderer 必须急切构造：BaseRenderer 仅在构造时向 eventBus 注册，
  // 懒构造会落到 diagram-js 的 fuchsia 兜底渲染；dmnMode 同理（首帧容器标记）；
  // drillBadge 急切（监听导入/创建时机挂角标）
  __init__: ['dmnRenderer', 'dmnMode', 'drillBadge', 'dmnViews'],
  'dmnIds': ['factory', () => new Ids([36, 36, 1])],
  'dmnElementTypes': ['type', ElementTypesClass],
  'dmnFactory': ['type', DmnFactory],
  'elementFactory': ['type', DmnElementFactory],
  'dmnMode': ['type', DmnMode],
  'textRenderer': ['factory', () => new TextUtil({
    style: { fontFamily: 'system-ui, "PingFang SC", sans-serif', fontSize: 12 },
    size: { width: 100, height: 40 }
  })],
  'dmnRenderer': ['type', DmnRenderer],
  'dmnI18n': ['type', DmnI18n],
  'translate': ['factory', (dmnI18n: { t(s: string): string }) => (text: string) => dmnI18n.t(text)],
  'dmnViews': ['type', DmnViews],
  'drillBadge': ['type', DrillBadgeBehavior]
};

/** IO：读写器/命名空间/文档状态/建图器 */
export const DmnIOModule: ModuleDeclaration = {
  'dmnNamespaces': ['type', DmnNamespaces],
  'dmnModdle': ['type', DmnModdle],
  'dmnReader': ['type', DmnReader],
  'dmnWriter': ['type', DmnWriter],
  'dmnDocumentState': ['type', DmnDocumentState],
  'diagramBuilder': ['type', DiagramBuilder]
};

/** 规则与布线 */
export const DmnRulesModule: ModuleDeclaration = {
  __depends__: [RulesModule],
  __init__: ['dmnRules'],
  'dmnRules': ['type', DmnRules],
  'layouter': ['type', DmnLayouter],
  'connectionDocking': ['type', CroppingConnectionDocking]
};

/** 建模命令与语义同步 */
export const DmnModelingModule: ModuleDeclaration = {
  __depends__: [ModelingModule],
  __init__: ['dmnUpdater'],
  'modeling': ['type', DmnModeling],
  'dmnUpdater': ['type', DmnUpdater]
};

/** palette / context pad / 弹框（DMN 元数据）；抓手/套索工具基座自包含（palette 工具钮） */
export const DmnPaletteModule: ModuleDeclaration = {
  __depends__: [PaletteModule, ContextPadModule, PopupMenuModule, CreateModule, ConnectModule, DmnModelingModule, HandToolModule, LassoToolModule],
  __init__: ['dmnPaletteProvider', 'dmnContextPadProvider', 'dmnExpressionMenuProvider'],
  'dmnPaletteProvider': ['type', DmnPaletteProvider],
  'dmnContextPadProvider': ['type', DmnContextPadProvider],
  'dmnExpressionMenuProvider': ['type', DmnExpressionMenuProvider]
};

/** 只读查看器模块集（Viewer） */
export const ViewerModules: ModuleDeclaration[] = [
  ...ViewerPlatformModules,
  DmnCoreModule,
  DmnIOModule
];

/** 可导航查看器模块集（NavigatedViewer） */
export const NavigatedViewerModules: ModuleDeclaration[] = [...ViewerModules, ...NavigationModules];

/** 建模器模块集（Modeler） */
export const DmnModules: ModuleDeclaration[] = [
  ...PlatformModules,
  DmnCoreModule,
  DmnIOModule,
  DmnRulesModule,
  DmnModelingModule,
  DmnPaletteModule
];

export { DmnElementTypes };
