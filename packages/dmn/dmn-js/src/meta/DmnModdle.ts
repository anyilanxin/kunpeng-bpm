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
 * moddle 引擎接入（引擎=npm `moddle`+`moddle-xml`；标准描述=dmn-moddle@12
 * 内置资源（DMN 1.3 MODEL/DMNDI + DC/DI + biodi 遗留兼容包，MIT，即 OMG 规范
 * 的机械映射，不自行重写）；自有描述=kunpeng-dmn-moddle 资源（组件内置）+
 * 宿主 moddleExtensions）。
 *
 * 元模型层单一注册点：标准描述、kunpeng 扩展与宿主扩展描述合并为一个引擎
 * 实例——读写器与元素工厂共用；新元素接入只需补描述条目，解析/序列化/
 * 类型化全部引擎自动（与 bpmn-js 内核 BpmnModdle 同款契约）。
 */
/// <reference path="../types/dmn-moddle.d.ts" />
import { Moddle } from 'moddle';
// 入口为命名导出（dist：`export { simple as DmnModdle }`——simple 装配工厂）
import { DmnModdle as createDmnModdle } from 'dmn-moddle';
import kunpengDescriptor from '@kunpeng-io/kunpeng-dmn-moddle/resources/kunpeng.json';
import type { ModdleExtension } from '../Types';

export class DmnModdle {
  static $inject = ['config.moddleExtensions', 'dmnIds'];

  private readonly extensions: Record<string, unknown>;
  private instance: Moddle | null = null;

  constructor(extensions?: Record<string, ModdleExtension>, private readonly ids?: any) {
    this.extensions = extensions ?? {};
  }

  /**
   * 引擎实例（惰性单例）：npm dmn-moddle 的 simple 装配工厂（内置五包 +
   * additionalPackages 合并）。描述冲突在首次使用时暴露。
   */
  moddle(): Moddle {
    if (!this.instance) {
      const instance = createDmnModdle({ kunpeng: kunpengDescriptor, ...this.extensions });
      // id 注册表挂引擎实例：生态插件经 element.$model.ids 查重（npm moddle
      // 不带注册表；与 dmnIds 同一实例，单一事实来源）
      (instance as any).ids = this.ids;
      this.instance = instance;
    }
    return this.instance as Moddle;
  }

  /** 元素工厂：类型化创建（描述校验与继承缺省由引擎负责） */
  create<T = any>(type: string, attrs?: Record<string, unknown>): T {
    return this.moddle().create<T>(type as never, attrs as never);
  }
}
