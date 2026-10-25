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
 * Modeler 门面：组装模块、提供导入/导出/清空/销毁与事件透传。
 *
 * 生命周期事件（FR-9）：import.start / import.done / import.error /
 * saveXML.start / saveXML.done / saveSVG.done / bpmn.*（命令与行为层）。
 */
import Diagram from 'diagram-js';
import type { ModuleDeclaration } from 'didi';
import { BpmnModules, PlatformModules } from './modules';
import type { BpmnDocumentState } from './xml/DocumentState';
import type { ModdleExtension } from './xml/BpmnNamespaces';
import type { BpmnMode, ModelerMode } from './mode/BpmnMode';

export interface ModelerOptions {
  container: string | HTMLElement;
  width?: number;
  height?: number;
  /**
   * 整替模块集（宿主自拼装配）：传入则忽略组件默认集（PlatformModules +
   * BpmnModules 与只读变体），additionalModules 同时失效——用于能力裁剪
   * （只要渲染 + 自己的交互集）与整体替换实验。
   */
  modules?: ModuleDeclaration[];
  additionalModules?: ModuleDeclaration[];
  /**
   * 扩展命名空间描述符（插件位之一）：组件只内置标准 BPMN/DI 命名空间，
   * 业务扩展（如 kunpeng）在此以 moddle 资源形式外部提供；未提供时按
   * 标准 BPMN 2.0 兜底——未知命名空间属性/声明原文保留往返，不解析语义。
   */
  moddleExtensions?: Record<string, ModdleExtension>;
  /**
   * 初始模式：'edit'（默认，完整编辑）/ 'preview'（只读预览：隐藏 palette 与
   * context pad，规则层禁止全部编辑动作；选择与导航保留）。运行期可经 setMode 切换。
   */
  mode?: ModelerMode;
  /**
   * palette 快捷集覆盖（插件位之一）：metaId 数组整体替换面板直列条目
   * （默认 10 个见 BpmnElementTypes.PALETTE_QUICK_IDS；[] 合法=仅工具与 "…"）。
   * 未知 metaId 构造即 throw（宿主配置错误不静默吞掉）。
   */
  paletteQuickIds?: string[];
  /** 实例缺省布局朝向（水平/垂直池；模型标记优先，见 meta/Orientation） */
  orientation?: 'horizontal' | 'vertical';
  /** 渲染主题覆盖（插件位之一） */
  bpmnRenderer?: Record<string, string>;
  /** 词典覆盖（插件位之一） */
  bpmnI18n?: Record<string, string>;
  /**
   * 插件 config 透传位：未列出的任意键（如属性面板的 propertiesPanel:
   * { parent }、diagram-js 原生 keyboard 等）原样落入 diagram config，
   * 由对应插件模块自行读取——组件不做逐键白名单。
   */
  [pluginConfig: string]: unknown;
}

export class Modeler {
  private readonly diagram: Diagram;

  constructor(options: ModelerOptions) {
    const { container, width, height, modules, additionalModules, ...pluginConfig } = options;

    // 插件化契约：除组件自有装配键（modules/additionalModules/canvas）外的
    // 任意选项键整体透传为 diagram config——插件自带的 config 键（如属性面板
    // 的 propertiesPanel.parent）无需组件逐键白名单，接入即生效。
    // bpmnjs 为宿主实例的约定服务名（插件经 injector.get('bpmnjs') 取门面）。
    const hostAccess: ModuleDeclaration = { bpmnjs: ['value', this] };
    const effectiveModules = modules
      ? [...modules, hostAccess]
      : [...this.resolveModules(options), ...(additionalModules ?? []), hostAccess];

    this.diagram = new Diagram({
      ...pluginConfig,
      // 键盘通道缺省绑 document（Ctrl+A 全选/Delete/方向键移动选区）；
      // 宿主传了 keyboard 配置则以宿主为准
      keyboard: pluginConfig.keyboard ?? { bindTo: document },
      canvas: { container, width, height },
      modules: effectiveModules
    });

    this.initEmpty();
  }

  /**
   * 模块集装配点（Viewer/NavigatedViewer 覆写为只读底座——编辑类服务
   * 不进注入器，程序化路径亦不可用，而不只是 UI 隐藏）。
   */
  protected resolveModules(options: ModelerOptions): ModuleDeclaration[] {
    return [...PlatformModules, ...BpmnModules];
  }

  // ---------- 服务访问 / 事件 ----------

  /** 服务访问；strict=false 非严格（缺失得 null 而非抛错）——自拼/裁剪装配下宿主与插件探测可选服务用 */
  get<T = any>(name: string, strict: boolean = true): T {
    // strict=false 时 diagram 类型标注 T|null，语义上调用方自担缺失（与 didi 惯用法一致）
    return this.diagram.get<T>(name, strict) as T;
  }

  on(event: string, priority: number | ((...args: any[]) => any), callback?: (...args: any[]) => any): void {
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

  /** 模式切换：'edit'=完整编辑；'preview'=只读预览（palette/context pad 隐藏 + 编辑动作全禁） */
  setMode(mode: ModelerMode): void {
    this.get<BpmnMode>('bpmnMode').set(mode);
  }

  getMode(): ModelerMode {
    return this.get<BpmnMode>('bpmnMode').get();
  }

  // ---------- 文档 ----------

  /** 空图初始化：definitions + 单 Process，画布根承载该语义根 */
  initEmpty(): void {
    const state = this.get<BpmnDocumentState>('bpmnDocumentState');
    const canvas = this.get<any>('canvas');
    const elementFactory = this.get<any>('elementFactory');

    state.createEmpty();
    const process = state.processes()[0];
    // 根元素承载平面指向的语义根（Process/Collaboration，真 moddle 实例——
    // 面板等插件依赖 bo.get()/$instanceOf），主图平面只作 di 附着：
    // 空白点击的属性面板编辑流程语义并落 XML，序列化事实源仍在语义树
    const root = elementFactory.createRoot({
      type: process.$type,
      businessObject: process,
      di: state.plane
    });
    canvas.setRootElement(root);
    // 文档更替：下钻平面栈归零（PlaneService 也负责导入路径）；自拼装配不含
    // BpmnPlaneModule 时服务缺席，非严格跳过
    this.diagram.get<any>('planeService', false)?.reset();
    this.fitViewport();
  }

  /**
   * 视口适配（空图初始化 / 导入完成后）：容器尚无可用尺寸（宿主面板未布局，
   * 如挂载即隐藏的标签页）时跳过——0 尺寸下 fit-viewport 的缩放系数为非有限
   * 值，SVGMatrix.scale(NaN) 会炸掉整条构造/导入链。容器布局完成后下一次
   * 导入或缩放调用自然收敛。
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
      const reader = this.get<any>('bpmnReader');
      const builder = this.get<any>('diagramBuilder');
      const state = this.get<BpmnDocumentState>('bpmnDocumentState');

      // Canvas 无公开 clear（v15 只监听 diagram.clear 事件），经 Diagram 门面清理
      this.diagram.clear();
      const result = await reader.parse(xml);
      state.adopt({ definitions: result.definitions, plane: { bpmnElement: result.planeTargetId } });
      // 朝向解析（标记优先，其次首池 DI 信号；垂直推断写回标记）
      this.get<any>('orientationService').applyImport(state.definitions, result.firstPoolHorizontal);
      builder.build(result);
      // 文档更替：下钻平面栈归零、平面根缓存清空（旧根随 diagram.clear 销毁）；
      // 自拼装配不含 BpmnPlaneModule 时非严格跳过
      this.diagram.get<any>('planeService', false)?.reset();

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
    // 序列化失败经 Promise 拒绝抛出（与 importXML 的 try/catch + rethrow 对称；
    // saveXML.done 仅成功路径触发——失败时没有可交付的 xml）
    try {
      const xml = this.get<any>('bpmnWriter').serialize();
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
    this.diagram.destroy();
  }
}
