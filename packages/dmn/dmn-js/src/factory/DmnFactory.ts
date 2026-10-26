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
 * 语义对象工厂：经 DmnModdle（moddle 引擎）类型化创建 businessObject。
 * 所有创建集中于此：id 统一经 ids 分配（claim 带持有者）；需求连线的引用
 * 包装（DMNElementReference#href）与 DI 节点在此一次成型。
 */
import { Ids } from 'ids';
import type { DmnModdle } from '../meta/DmnModdle';
import type { DefinitionsSemantic } from '../Types';
import { requirementFieldFor } from '../util/Requirements';

/** 空图缺省命名空间（自有取值：与 kunpeng 扩展同域，区别于示例域） */
export const DEFAULT_NAMESPACE = 'http://anyilanxin.com/schema/dmn';

export class DmnFactory {
  static $inject = ['dmnIds', 'dmnModdle'];

  constructor(private readonly ids: Ids, private readonly dmnModdle: DmnModdle) {}

  /** 生成并登记新 id（前缀取类型局部名，如 Decision_1a2b3c4） */
  nextId(prefixHint: string): string {
    const local = prefixHint.includes(':') ? prefixHint.split(':')[1] : prefixHint;
    return this.ids.nextPrefixed(`${local}_`);
  }

  /**
   * 类型化创建。传入既有 id（替换保 id 场景）不重新分配，claim 幂等；
   * 支持对象（{ $type, ...attrs }）与 (type, attrs) 两种入参形态。
   * id 仅对描述符声明了 id 属性的类型分配（DMNElementReference 等不占号）。
   */
  create<T = any>(typeOrAttrs: string | (Record<string, unknown> & { $type: string }), maybeAttrs?: Record<string, unknown>): T {
    const attrs = (
      typeof typeOrAttrs === 'string' ? { ...(maybeAttrs ?? {}), $type: typeOrAttrs } : typeOrAttrs
    ) as Record<string, unknown> & { $type: string };
    const { $type, ...properties } = attrs;
    const bo = this.dmnModdle.create<T>($type, properties);
    const idDescribed = (bo as any)?.$descriptor?.properties?.some((p: any) => p.name === 'id');
    if (idDescribed && !(bo as any).id) {
      (bo as any).id = this.nextId($type);
    }
    if ((bo as any).id) {
      // claim 带持有者：assigned(id) 返回元素本体，面板查重区分自身与他人
      this.ids.claim((bo as any).id, bo);
    }
    return bo;
  }

  /** 空文档：Definitions + DMNDI 单图骨架（diagramElements 为新 DI 节点挂接点） */
  createDefinitions(namespace: string): DefinitionsSemantic {
    const diagram = this.create<any>({ $type: 'dmndi:DMNDiagram', diagramElements: [] });
    const dmnDI = this.create<any>({ $type: 'dmndi:DMNDI', diagrams: [diagram] });
    return this.create<DefinitionsSemantic>({
      $type: 'dmn:Definitions',
      namespace: namespace || DEFAULT_NAMESPACE,
      drgElement: [],
      artifact: [],
      dmnDI
    });
  }

  /** DMNElementReference 包装（模型侧引用形态：href 带 '#'） */
  createReference(targetId: string): any {
    return this.create<any>({ $type: 'dmn:DMNElementReference', href: `#${targetId}` });
  }

  /**
   * 需求连线语义（统一不变量：target 持有、引用指 source）。引用字段按端点
   * 类型裁决（见 util/Requirements.requirementFieldFor），不合法组合由规则层
   * 前置拦截（工厂信任入参）。
   */
  createRequirement(requirementType: string, sourceBo: any, targetBo: any): any {
    const field = requirementFieldFor(requirementType, sourceBo.$type, targetBo.$type);
    return this.create<any>({
      $type: requirementType,
      [field]: this.createReference(sourceBo.id)
    });
  }

  /** 关联（Artifact；sourceRef/targetRef 为引用子元素） */
  createAssociation(sourceBo: any, targetBo: any): any {
    return this.create<any>({
      $type: 'dmn:Association',
      sourceRef: this.createReference(sourceBo.id),
      targetRef: this.createReference(targetBo.id)
    });
  }

  /** DI 形状节点（挂 diagram.diagramElements；引用经引擎序列化为 dmnElementRef 属性） */
  createDiShape(bo: any, bounds: { x: number; y: number; width: number; height: number }): any {
    return this.create<any>({
      $type: 'dmndi:DMNShape',
      dmnElementRef: bo,
      bounds: this.create<any>({ $type: 'dc:Bounds', ...bounds })
    });
  }

  /** DI 连线节点（waypoint 逐点独立 moddle 实例） */
  createDiEdge(bo: any, waypoints: { x: number; y: number }[]): any {
    return this.create<any>({
      $type: 'dmndi:DMNEdge',
      dmnElementRef: bo,
      waypoint: waypoints.map((p) => this.create<any>({ $type: 'dc:Point', x: p.x, y: p.y }))
    });
  }

  /** 语义注销（删除元素时释放 id；树引用由更新器摘除） */
  destroy(bo: any): void {
    this.ids.unclaim(bo.id);
  }

  /** 删除撤销后重新登记既有 id（对象复用，幂等） */
  reclaim(bo: any): void {
    if (bo.id) {
      this.ids.claim(bo.id, bo);
    }
  }
}
