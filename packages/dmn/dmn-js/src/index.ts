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
 * DMN 决策建模器 · 公共导出
 */
export { Modeler } from './Modeler';
export type { ModelerOptions } from './Modeler';
export { Viewer, NavigatedViewer } from './Viewer';
export type { ViewerOptions } from './Viewer';
export type { ModdleExtension, DefinitionsSemantic, RequirementSemantic, AssociationSemantic } from './Types';
export type { ModelerMode } from './mode/DmnMode';
export {
  ViewerPlatformModules,
  NavigationModules,
  EditorPlatformModules,
  ViewerModules,
  NavigatedViewerModules,
  DmnModules,
  DmnCoreModule,
  DmnIOModule,
  DmnRulesModule,
  DmnModelingModule,
  DmnBehaviorModule,
  DmnPopupMenuModule,
  DmnPaletteModule,
  DmnContextPadModule
} from './modules';
export { DmnElementTypes, SIZES, requirementBetween, metaId } from './meta/ElementTypes';
export { DmnI18n } from './i18n/DmnI18n';
export * from './util/ModelUtil';
export {
  refIdFromHref,
  requirementSourceId,
  requirementSourceField,
  requirementFieldFor,
  requirementHostProperty,
  associationEndpointIds
} from './util/Requirements';
export { DEFAULT_NAMESPACE } from './factory/DmnFactory';
