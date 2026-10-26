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
 * moddle 引擎接入（引擎=npm `moddle`+`moddle-xml`；标准描述=bpmn-moddle@10
 * 官方资源（BPMN/BPMNDI/DC/DI/BIOC，MIT，即 OMG 规范的机械映射，不自行
 * 重写）；自有描述=kunpeng-bpmn-moddle 资源 + 宿主 moddleExtensions）。
 *
 * 元模型层单一注册点：标准描述、自有业务协议与宿主扩展描述合并为一个
 * Moddle 实例——读写器（BpmnReader/BpmnWriter，基于 moddle-xml 的描述驱动
 * Reader/Writer）与元素工厂（BpmnFactory→moddle.create）共用，新元素接入
 * 只需补描述条目（标准类型走上游资源，业务扩展走 kunpeng/宿主包），解析/
 * 序列化/类型化/引用管理全部引擎自动。
 */
import { Moddle } from 'moddle';
import bpmnDescriptor from 'bpmn-moddle/resources/bpmn/json/bpmn.json';
import bpmndiDescriptor from 'bpmn-moddle/resources/bpmn/json/bpmndi.json';
import dcDescriptor from 'bpmn-moddle/resources/bpmn/json/dc.json';
import diDescriptor from 'bpmn-moddle/resources/bpmn/json/di.json';
import biocDescriptor from 'bpmn-moddle/resources/bpmn-io/json/bioc.json';
import kunpengDescriptor from '@kunpeng-io/kunpeng-bpmn-moddle/resources/kunpeng.json';
import type { ModdleExtension } from '../xml/BpmnNamespaces';

export class BpmnModdle {
  static $inject = ['config.moddleExtensions', 'bpmnIds'];

  private readonly extensions: Record<string, unknown>;
  private instance: Moddle | null = null;

  constructor(extensions?: Record<string, ModdleExtension>, private readonly ids?: any) {
    this.extensions = extensions ?? {};
  }

  /** 引擎实例（惰性单例；内置+宿主描述合并，描述冲突在首次使用时暴露） */
  moddle(): Moddle {
    if (!this.instance) {
      const packages: unknown[] = [
        bpmnDescriptor,
        bpmndiDescriptor,
        dcDescriptor,
        diDescriptor,
        biocDescriptor,
        kunpengDescriptor,
        ...Object.values(this.extensions)
      ];
      const instance = new Moddle(packages as never);
      // id 注册表挂到引擎实例：生态插件经 element.$model.ids.assigned 做查重
      // （npm moddle 不带注册表；与 bpmnIds 同一实例，单一事实来源）
      (instance as any).ids = this.ids;
      this.instance = instance;
    }
    return this.instance;
  }

  /** 元素工厂：类型化创建（含描述校验与默认值应用） */
  create<T = any>(type: string, attrs?: Record<string, unknown>): T {
    return this.moddle().create<T>(type as never, attrs as never);
  }
}
