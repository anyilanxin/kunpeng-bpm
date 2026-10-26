/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
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
 * 模块装配 —— 插件替换点（与 bpmn-js 内核同款契约：每功能点一个具名服务，
 * 宿主经 additionalModules 同名覆盖即替换，didi 后注册者胜出）。
 *
 * P1 装配面：查看底座 + Core（类型/工厂/渲染/词典/模式）+ IO（读写器/建图器）。
 * P2 增量（规则/布线/建模命令/行为/palette/contextPad/弹框/直编）在
 * DmnRulesModule 等落位后并入 DmnModules 与 Modeler 默认集。
 */
import type { ModuleDeclaration } from 'didi';
import { Ids } from 'ids';
import TextUtil from 'diagram-js/lib/util/Text';

// diagram-js 特性模块（公开依赖面）
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
import SpaceToolModule from 'diagram-js/lib/features/space-tool';
import HandToolModule from 'diagram-js/lib/features/hand-tool';
import AutoPlaceModule from 'diagram-js/lib/features/auto-place';
import AutoResizeModule from 'diagram-js/lib/features/auto-resize';
import AutoScrollModule from 'diagram-js/lib/features/auto-scroll';
import PopupMenuModule from 'diagram-js/lib/features/popup-menu';
import OutlineModule from 'diagram-js/lib/features/outline';
import BendpointsModule from 'diagram-js/lib/features/bendpoints';
import AlignElementsModule from 'diagram-js/lib/features/align-elements';
import DistributeElementsModule from 'diagram-js/lib/features/distribute-elements';
import SnappingModule from 'diagram-js/lib/features/snapping';
import MouseModule from 'diagram-js/lib/features/mouse';
import SchedulerModule from 'diagram-js/lib/features/scheduler';
import HoverFixModule from 'diagram-js/lib/features/hover-fix';
import GridSnappingModule from 'diagram-js/lib/features/grid-snapping';
import ComplexPreviewModule from 'diagram-js/lib/features/complex-preview';
import KeyboardModule from 'diagram-js/lib/features/keyboard';
import KeyboardMoveSelectionModule from 'diagram-js/lib/features/keyboard-move-selection';
// 画布导航
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
import KeyboardMoveModule from 'diagram-js/lib/navigation/keyboard-move';
import EditorActionsModule from 'diagram-js/lib/features/editor-actions';

// DMN 层
import { DmnElementTypes } from './meta/ElementTypes';
import { DmnFactory } from './factory/DmnFactory';
import { DmnElementFactory } from './factory/DmnElementFactory';
import { DmnRenderer } from './render/DmnRenderer';
import { DmnMode } from './mode/DmnMode';
import { DmnDocumentState } from './xml/DocumentState';
import { DmnNamespaces } from './xml/DmnNamespaces';
import { DmnModdle } from './meta/DmnModdle';
import { DmnReader } from './xml/DmnReader';
import { DmnWriter } from './xml/DmnWriter';
import { DiagramBuilder } from './xml/DiagramBuilder';
import { DmnI18n } from './i18n/DmnI18n';

/** 只读查看平台特性（Viewer 底座）：元素事件 / 鼠标 / 调度 / 悬停修正 / overlays——无选择与编辑 */
export const ViewerPlatformModules: ModuleDeclaration[] = [
  InteractionEventsModule,
  OverlaysModule,
  MouseModule,
  SchedulerModule,
  HoverFixModule
];

/** 画布导航特性（Viewer → NavigatedViewer 增量） */
export const NavigationModules: ModuleDeclaration[] = [
  ZoomScrollModule,
  MoveCanvasModule,
  KeyboardMoveModule
];

/** 编辑平台特性（P2 交互建模的地基：选择/拖放/建连/面板/菜单/对齐分布/键盘） */
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
  OutlineModule,
  BendpointsModule,
  AlignElementsModule,
  DistributeElementsModule,
  SnappingModule,
  GridSnappingModule,
  ComplexPreviewModule,
  KeyboardModule,
  KeyboardMoveSelectionModule,
  EditorActionsModule
];

/** DMN 核心：类型表 / 工厂 / 渲染 / 词典 / 模式（三形态恒装） */
export const DmnCoreModule: ModuleDeclaration = {
  // dmnRenderer/dmnMode 急切构造：BaseRenderer 仅构造时注册 eventBus（懒构造
  // 落 fuchsia 兜底）；初始 preview 的容器标记类须在首帧前挂上
  __init__: ['dmnElementTypes', 'dmnRenderer', 'dmnMode'],
  'dmnIds': ['factory', () => new Ids([36, 36, 1])],
  'dmnElementTypes': ['type', DmnElementTypes],
  'dmnFactory': ['type', DmnFactory],
  'dmnMode': ['type', DmnMode],
  'elementFactory': ['type', DmnElementFactory],
  'textRenderer': ['factory', () => new TextUtil({
    style: { fontFamily: 'system-ui, "PingFang SC", sans-serif', fontSize: 12 },
    size: { width: 100, height: 40 }
  })],
  'dmnRenderer': ['type', DmnRenderer],
  'dmnI18n': ['type', DmnI18n],
  // translate：面板等插件的通用文案服务（词条查 dmnI18n 词典，未命中透传原文）
  'translate': ['factory', (dmnI18n: DmnI18n) => (text: string, replace?: Record<string, string>) => {
    let translated = dmnI18n.t(text);
    if (replace) {
      translated = translated.replace(/\{(\w+)\}/g, (match, key) => replace[key] ?? match);
    }
    return translated;
  }]
};

/** 导入导出 */
export const DmnIOModule: ModuleDeclaration = {
  // dmnNamespaces 急切初始化：moddleExtensions 描述符非法在实例化即报错
  __init__: ['dmnDocumentState', 'dmnNamespaces'],
  'dmnDocumentState': ['type', DmnDocumentState],
  'dmnNamespaces': ['type', DmnNamespaces],
  'dmnModdle': ['type', DmnModdle],
  // moddle：引擎实例别名服务（生态插件按 moddle 通用名取引擎）
  'moddle': ['factory', (dmnModdle: DmnModdle) => dmnModdle.moddle()],
  'dmnReader': ['type', DmnReader],
  'dmnWriter': ['type', DmnWriter],
  'diagramBuilder': ['type', DiagramBuilder]
};

/** 只读查看器模块集（Viewer：渲染 + 导入导出 + 元素事件） */
export const ViewerModules: ModuleDeclaration[] = [
  ...ViewerPlatformModules,
  DmnCoreModule,
  DmnIOModule
];

/** 可导航查看器模块集（NavigatedViewer：Viewer + 画布导航） */
export const NavigatedViewerModules: ModuleDeclaration[] = [
  ...ViewerModules,
  ...NavigationModules
];

/**
 * P1 全量集（= NavigatedViewer：P1 验证域为导入渲染/导出往返，编辑交互模块
 * 待 P2 DmnRules/DmnModeling/Provider 落位后并入——届时拆 EditorPlatformModules
 * 进 Modeler 默认集）
 */
export const DmnModules: ModuleDeclaration[] = [...NavigatedViewerModules];
