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
 * Modeler 门面：组装模块、提供导入/导出/清空/销毁与事件透传（与 bpmn-js
 * 内核同款契约）。
 *
 * 面板契约：注册 `_parent`（= 门面实例，属性面板 $inject 消费并挂 detach
 * 监听）与 `dmnjs` 别名；构造项除装配键外整体透传 diagram config。
 *
 * 生命周期事件：import.start / import.done / import.error / saveXML.start /
 * saveXML.done / saveSVG.done / dmn.*（P2 命令与行为层）。
 */
import Diagram from 'diagram-js';
import type { ModuleDeclaration } from 'didi';
import { DmnModules } from './modules';
import type { DmnDocumentState } from './xml/DocumentState';
import type { ModdleExtension } from './Types';
import type { DmnMode, ModelerMode } from './mode/DmnMode';

export interface ModelerOptions {
  container: string | HTMLElement;
  width?: number;
  height?: number;
  /** 整替模块集（宿主自拼装配）：传入则忽略组件默认集与 additionalModules */
  modules?: ModuleDeclaration[];
  additionalModules?: ModuleDeclaration[];
  /**
   * 扩展命名空间描述符：组件内置 dmn/dmndi/dc/di 标准 + kunpeng 扩展，
   * 业务扩展在此以 moddle 资源形式外部提供（构造期校验，非法即抛）。
   */
  moddleExtensions?: Record<string, ModdleExtension>;
  /** 初始模式：'edit'（默认）/ 'preview'（只读预览）；运行期可经 setMode 切换 */
  mode?: ModelerMode;
  /** 渲染主题覆盖（插件位之一） */
  dmnRenderer?: Record<string, string>;
  /** 词典覆盖（插件位之一） */
  dmnI18n?: Record<string, string>;
  /** 插件 config 透传位（未列出的任意键原样落入 diagram config，不逐键白名单） */
  [pluginConfig: string]: unknown;
}

export class Modeler {
  private readonly diagram: Diagram;

  /**
   * 装配期事件订阅挂起队列：didi 在 Diagram 构造内实例化 `_parent` 消费者
   * （如属性面板渲染器构造即 `dmnjs.on('detach')`），此刻 `this.diagram` 尚未
   * 赋值——先记账，Diagram 就绪后统一补订 eventBus。
   */
  private readonly pendingEventBindings: Array<{
    event: string;
    priority?: number;
    callback: (...args: any[]) => any;
  }> = [];

  constructor(options: ModelerOptions) {
    const { container, width, height, modules, additionalModules, ...pluginConfig } = options;

    // _parent=门面实例（属性面板契约）；dmnjs 为宿主访问别名（与 bpmnjs 同款）
    const hostAccess: ModuleDeclaration = { _parent: ['value', this], dmnjs: ['value', this] };
    const effectiveModules = modules
      ? [...modules, hostAccess]
      : [...this.resolveModules(options), ...(additionalModules ?? []), hostAccess];

    this.diagram = new Diagram({
      ...pluginConfig,
      keyboard: pluginConfig.keyboard ?? { bindTo: document },
      canvas: { container, width, height },
      modules: effectiveModules
    });

    for (const { event, priority, callback } of this.pendingEventBindings.splice(0)) {
      if (priority === undefined) {
        this.get<any>('eventBus').on(event, callback);
      } else {
        this.get<any>('eventBus').on(event, priority, callback);
      }
    }

    this.initEmpty();
  }

  /**
   * 模块集装配点（Viewer/NavigatedViewer 覆写为只读底座）。P1 验证域为
   * 导入渲染/导出往返——编辑平台特性待 P2 规则/建模层落位后并入。
   */
  protected resolveModules(_options: ModelerOptions): ModuleDeclaration[] {
    return [...DmnModules];
  }

  // ---------- 服务访问 / 事件 ----------

  /** 服务访问；strict=false 非严格（缺失得 null）——自拼装配下探测可选服务用 */
  get<T = any>(name: string, strict: boolean = true): T {
    return this.diagram.get<T>(name, strict) as T;
  }

  on(event: string, priority: number | ((...args: any[]) => any), callback?: (...args: any[]) => any): void {
    // 装配期（diagram 未就绪）订阅挂起，构造收尾统一补订（见 pendingEventBindings 注释）
    if (!this.diagram) {
      if (typeof priority === 'function') {
        this.pendingEventBindings.push({ event, callback: priority });
      } else {
        this.pendingEventBindings.push({ event, priority, callback: callback! });
      }
      return;
    }
    const eventBus = this.get('eventBus');
    if (typeof priority === 'function') {
      eventBus.on(event, priority);
    } else {
      eventBus.on(event, priority, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => any): void {
    this.get('eventBus').off(event, callback);
  }

  invoke<T>(fn: any): T {
    return this.diagram.invoke(fn);
  }

  // ---------- 模式 ----------

  setMode(mode: ModelerMode): void {
    this.get<DmnMode>('dmnMode').set(mode);
  }

  getMode(): ModelerMode {
    return this.get<DmnMode>('dmnMode').get();
  }

  // ---------- 文档 ----------

  /** 空图初始化：Definitions + DMNDI 单图骨架，画布根承载 Definitions 本体 */
  initEmpty(): void {
    const state = this.get<DmnDocumentState>('dmnDocumentState');
    const canvas = this.get<any>('canvas');
    const elementFactory = this.get<any>('elementFactory');

    state.createEmpty();
    const root = elementFactory.createRoot({
      type: 'dmn:Definitions',
      businessObject: state.definitions,
      di: state.diagram
    });
    canvas.setRootElement(root);
    this.fitViewport();
  }

  /**
   * 视口适配（空图初始化/导入完成后）：容器无尺寸（宿主面板未布局）时跳过
   * ——0 尺寸下 fit-viewport 缩放系数非有限，SVGMatrix.scale(NaN) 会炸掉整条
   * 构造/导入链（bpmn 线已立契约）。
   */
  private fitViewport(): void {
    const canvas = this.get<any>('canvas');
    const box = (canvas._container as HTMLElement | undefined)?.getBoundingClientRect();
    if (box && box.width > 0 && box.height > 0) {
      canvas.zoom('fit-viewport');
    }
  }

  async importXML(xml: string): Promise<{ warnings: string[] }> {
    const eventBus = this.get<any>('eventBus');
    eventBus.fire('import.start');

    try {
      const reader = this.get<any>('dmnReader');
      const builder = this.get<any>('diagramBuilder');
      const state = this.get<DmnDocumentState>('dmnDocumentState');

      this.diagram.clear();
      const result = await reader.parse(xml);
      state.adopt(result.definitions);
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

  saveXML(): Promise<{ xml: string }> {
    const eventBus = this.get<any>('eventBus');
    eventBus.fire('saveXML.start');
    try {
      const xml = this.get<any>('dmnWriter').serialize();
      eventBus.fire('saveXML.done', { xml });
      return Promise.resolve({ xml });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /** SVG 导出：克隆画布 + 内联字体与基础描边样式 */
  saveSVG(): Promise<{ svg: string }> {
    const canvas = this.get<any>('canvas');
    const svg = canvas._svg.cloneNode(true) as SVGSVGElement;
    svg.setAttribute('width', String(canvas.getSize().width));
    svg.setAttribute('height', String(canvas.getSize().height));

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `text{font-family:system-ui,"PingFang SC",sans-serif}`;
    svg.insertBefore(style, svg.firstChild);

    const serialized = new XMLSerializer().serializeToString(svg);
    this.get<any>('eventBus').fire('saveSVG.done', { svg: serialized });
    return Promise.resolve({ svg: serialized });
  }

  clear(): void {
    this.diagram.clear();
    this.initEmpty();
  }

  destroy(): void {
    // 属性面板契约：销毁前发 detach（面板 $parent.on('detach') 监听摘除自身 DOM）
    this.get<any>('eventBus').fire('detach');
    this.diagram.destroy();
  }
}
