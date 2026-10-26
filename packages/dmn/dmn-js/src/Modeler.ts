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
 * 建模器门面（U2：fork bpmn-js 内核骨架，DMN 域装配）。
 * 构造项除装配键（modules/additionalModules/canvas）外整体透传为
 * diagram config；dmnjs 为宿主访问门面的约定服务名。
 */
import Diagram from 'diagram-js/lib/Diagram';
import type { ModuleDeclaration } from 'didi';
import { DmnModules } from './modules';
import type { DmnParseResult } from './xml/DmnReader';
import type { ModelerMode, ModelerOptions } from './Types';

export type { ModelerMode, ModelerOptions };

export class Modeler {
  private readonly diagram: Diagram;

  constructor(options: ModelerOptions) {
    const { container, width, height, modules, additionalModules, ...pluginConfig } = options;

    // 插件化契约：除装配键外的任意选项键整体透传为 diagram config——插件
    // 自带的 config 键无需组件逐键白名单，接入即生效。dmnjs 为宿主访问
    // 门面的约定服务名（插件经 injector.get('dmnjs') 取门面）
    const hostAccess: ModuleDeclaration = { _parent: ['value', this], dmnjs: ['value', this] };
    const effectiveModules: ModuleDeclaration[] = modules
      ? [...(modules as ModuleDeclaration[]), hostAccess]
      : [...this.resolveModules(options), ...((additionalModules ?? []) as ModuleDeclaration[]), hostAccess];

    this.diagram = new Diagram({
      ...pluginConfig,
      // 键盘通道缺省绑 document；宿主传了 keyboard 配置则以宿主为准
      keyboard: pluginConfig.keyboard ?? { bindTo: document },
      canvas: { container, width, height },
      modules: effectiveModules
    });

    this.get<any>('dmnMode').setMode(options.mode ?? 'edit');
    this.initEmpty();
  }

  protected resolveModules(_options: ModelerOptions): ModuleDeclaration[] {
    return [...DmnModules];
  }

  // ---------- 服务访问 / 事件 ----------

  get<T = any>(name: string, strict: boolean = true): T {
    return this.diagram.get<T>(name, strict) as T;
  }

  on(event: string, priority: number | ((...args: any[]) => any), callback?: (...args: any[]) => any): void {
    if (typeof priority === 'function') {
      this.get<any>('eventBus').on(event, priority);
    } else {
      this.get<any>('eventBus').on(event, priority, callback!);
    }
  }

  destroy(): void {
    this.get<any>('eventBus').fire('dmn.destroy');
    this.diagram.destroy();
  }

  /** 模式切换（edit/preview：规则层全禁 + 只读容器标记） */
  setMode(mode: ModelerMode): void {
    this.get<any>('dmnMode').setMode(mode);
  }

  // ---------- 导入导出 ----------

  async importXML(xml: string): Promise<{ warnings: string[] }> {
    const eventBus = this.get<any>('eventBus');
    eventBus.fire('import.start');
    try {
      const reader = this.get<any>('dmnReader');
      const builder = this.get<any>('diagramBuilder');
      const state = this.get<any>('dmnDocumentState');

      this.diagram.clear();
      const result: DmnParseResult = await reader.parse(xml);
      state.adopt({ definitions: result.definitions, planeTargetId: result.planeTargetId });
      builder.build(result);

      eventBus.fire('canvas.resized');
      this.fitViewport();
      eventBus.fire('import.done', { warnings: result.warnings });
      return { warnings: result.warnings };
    } catch (error: any) {
      eventBus.fire('import.error', { error });
      throw error;
    }
  }

  async saveXML(): Promise<{ xml: string }> {
    return { xml: this.get<any>('dmnWriter').serialize() };
  }

  /** 空文档初始化（无导入时的可编辑起点） */
  protected initEmpty(): void {
    const state = this.get<any>('dmnDocumentState');
    const canvas = this.get<any>('canvas');
    state.createEmpty();
    const root = this.get<any>('elementFactory').createRoot({
      type: 'dmn:Definitions',
      businessObject: state.definitions,
      di: state.diagram
    });
    canvas.setRootElement(root);
    this.fitViewport();
  }

  /**
   * 视口适配：容器无尺寸（宿主面板未布局）时跳过——0 尺寸下 fit-viewport
   * 缩放系数非有限，SVGMatrix.scale(NaN) 会炸掉整条构造/导入链
   */
  private fitViewport(): void {
    const canvas = this.get<any>('canvas');
    const box = (canvas._container as HTMLElement | undefined)?.getBoundingClientRect();
    if (box && box.width > 0 && box.height > 0) {
      canvas.zoom('fit-viewport');
    }
  }
}
