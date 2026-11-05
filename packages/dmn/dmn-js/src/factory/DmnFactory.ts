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
 * 语义对象工厂：经 DmnModdle（moddle 引擎）类型化创建 businessObject。
 *
 * 所有创建集中于此，保证：id 统一经 ids 分配（claim），集合属性显式
 * 初始化（引擎对 isMany 属性不建默认数组）。元素原型与属性校验由元模型
 * 描述驱动（未知类型即抛错，配置错误早暴露）。
 */
import { Ids } from 'ids';
import type { DmnModdle } from '../meta/DmnModdle';

export class DmnFactory {
  static $inject = ['dmnIds', 'dmnModdle'];

  private readonly ids: Ids;
  private readonly dmnModdle: DmnModdle;

  constructor(ids: Ids, dmnModdle: DmnModdle) {
    this.ids = ids;
    this.dmnModdle = dmnModdle;
  }

  /** 生成并登记新 id（前缀取类型局部名，单次前缀 + 7 位随机后缀，如 Decision_1a2b3c4） */
  nextId(prefixHint: string): string {
    const local = prefixHint.includes(':') ? prefixHint.split(':')[1] : prefixHint;
    return this.ids.nextPrefixed(`${local}_`);
  }

  /**
   * 类型化创建（moddle 实例：描述校验/继承缺省/引用管理由引擎负责）。
   * 传入既有 id（替换 morph 保 id 场景）不重新分配，claim 幂等。
   * 支持两种入参形态：对象（{ $type, ...attrs }，组件内部用法）与
   * (type, attrs) 两参（面板等插件的通用惯例）。
   * id 仅对描述符声明了 id 属性的类型分配（ExtensionElements 等容器类型不占号）。
   */
  create<T = any>(typeOrAttrs: string | (Partial<T> & { $type: string }), maybeAttrs?: Partial<T>): T {
    const attrs = (
      typeof typeOrAttrs === 'string' ? { ...(maybeAttrs as Record<string, unknown>), $type: typeOrAttrs } : typeOrAttrs
    ) as Partial<T> & { $type: string };
    const { $type, ...properties } = attrs as Record<string, unknown>;
    const bo = this.dmnModdle.create<T>($type as string, properties);
    const idDescribed = (bo as any).$descriptor?.properties?.some((p: any) => p.name === 'id');
    if (idDescribed && !(bo as any).id) {
      (bo as any).id = this.nextId($type as string);
    }
    if ((bo as any).id) {
      // claim 带持有者：assigned(id) 返回元素本体，面板查重区分自身与他人
      this.ids.claim((bo as any).id, bo);
    }
    return bo;
  }

  createDefinitions(targetNamespace: string): any {
    const dmnDI = this.create<any>({ $type: 'dmndi:DMNDI', diagrams: [] });
    return this.create<any>({
      $type: 'dmn:Definitions',
      targetNamespace: targetNamespace || 'http://anyilanxin.com/schema/dmn',
      drgElement: [],
      artifact: [],
      dmnDI
    });
  }

  /** DI 图（DMNDiagram 直挂 diagramElements——DMN 1.3 无 Plane 中间层；下钻平面图传 dmnElementRef） */
  createDiagram(attrs: Record<string, unknown> = {}): any {
    return this.create<any>({ $type: 'dmndi:DMNDiagram', diagramElements: [], ...attrs });
  }

  /**
   * 引用盒（dmn:DMNElementReference，href='#id'）：DMN 1.3 全部引用属性
   * （requiredXxx、sourceRef、targetRef、outputDecision、encapsulatedDecision）
   * 的值形态——描述符声明 type=DMNElementReference 且 href 是 String（引擎不
   * 做对象解析），直接塞业务对象会序列化出无 href 的空引用元素。
   */
  createReference(target: any): any {
    return this.create<any>({ $type: 'dmn:DMNElementReference', href: `#${target.id}` });
  }

  /**
   * 需求连线（target 侧持有、引用指 source，见 DmnUpdater 挂接不变量）。
   * 引用字段按连线类型与源端类型裁决（描述符属性全集）：
   * - InformationRequirement：requiredDecision | requiredInput
   * - KnowledgeRequirement：requiredKnowledge
   * - AuthorityRequirement：requiredAuthority（规则层约束源端为 KnowledgeSource/DS）
   */
  createRequirement(type: string, source: any): any {
    const ref = this.createReference(source);
    const attrs: Record<string, unknown> =
      type === 'dmn:InformationRequirement'
        ? source?.$type === 'dmn:InputData'
          ? { requiredInput: ref }
          : { requiredDecision: ref }
        : type === 'dmn:KnowledgeRequirement'
          ? { requiredKnowledge: ref }
          : { requiredAuthority: ref };
    return this.create<any>({ $type: type, ...attrs });
  }

  createTextAnnotation(attrs: Record<string, unknown> = {}): any {
    return this.create<any>({ $type: 'dmn:TextAnnotation', text: '', ...attrs });
  }

  /** 语义注销（删除元素时释放 id；树引用由 DmnUpdater 摘除） */
  destroy(bo: any): void {
    if (bo?.id) {
      this.ids.unclaim(bo.id);
    }
  }

  /** 删除撤销后重新登记既有 id（对象复用，幂等；带持有者与 create 路径同约定） */
  reclaim(bo: any): void {
    if (bo?.id) {
      this.ids.claim(bo.id, bo);
    }
  }
}
