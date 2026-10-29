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
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * for more details (a copy is included in the licenses/ directory that
 * accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 语义同步器 · 挂接域（DmnUpdater 协作件）：shape/connection 的
 * created/reverted/removed 挂摘语义树（drgElement/artifact/需求连线宿主集合）。
 */
import type { DmnFactory } from '../../factory/DmnFactory';
import type { DmnDocumentState } from '../../xml/DocumentState';
import { isRequirementType } from '../../meta/ElementTypes';
import { removeFrom, DmnDiSync } from './DiSync';

/** 需求连线在 target 宿主上的集合属性 */
const REQUIREMENT_HOST_PROPERTY: Record<string, string> = {
  'dmn:InformationRequirement': 'informationRequirement',
  'dmn:KnowledgeRequirement': 'knowledgeRequirement',
  'dmn:AuthorityRequirement': 'authorityRequirement'
};

export class DmnAdoption {
  constructor(
    private readonly factory: DmnFactory,
    private readonly state: DmnDocumentState,
    private readonly diSync: DmnDiSync
  ) {}

  adoptShape(shape: any): void {
    const bo = shape.businessObject;
    if (!bo) {
      return;
    }
    if (bo.$type === 'dmn:TextAnnotation') {
      (this.state.definitions.artifact ??= []).push(bo);
    } else if (bo.$type !== 'dmn:Definitions') {
      (this.state.definitions.drgElement ??= []).push(bo);
    }
    this.diSync.ensureShapeDi(shape);
  }

  orphanShape(shape: any): void {
    const bo = shape.businessObject;
    if (!bo) {
      return;
    }
    this.diSync.detachDi(shape);
    removeFrom(this.state.definitions.drgElement, bo);
    removeFrom(this.state.definitions.artifact, bo);
  }

  wireConnection(context: any): void {
    const { connection, source, target } = context;
    const bo = connection.businessObject;
    if (!bo || !source?.businessObject || !target?.businessObject) {
      return;
    }
    if (isRequirementType(bo.$type)) {
      // target 持有：宿主属性数组 + 引用字段按源端裁决（规则层已拦截非法组合）。
      // 引用值形态=DMNElementReference 盒（href='#id'，描述符约定，见 DmnFactory.createReference）
      const property = REQUIREMENT_HOST_PROPERTY[bo.$type];
      const host = target.businessObject;
      (host.get(property) ?? host[property] ?? []).push(bo);
      host.set(property, host.get(property));
      bo.set(
        source.businessObject.$type === 'dmn:InputData'
          ? 'requiredInput'
          : bo.$type === 'dmn:KnowledgeRequirement'
            ? 'requiredKnowledge'
            : bo.$type === 'dmn:AuthorityRequirement'
              ? 'requiredAuthority'
              : 'requiredDecision',
        this.factory.createReference(source.businessObject)
      );
    } else if (bo.$type === 'dmn:Association') {
      bo.set('sourceRef', this.factory.createReference(source.businessObject));
      bo.set('targetRef', this.factory.createReference(target.businessObject));
      (this.state.definitions.artifact ??= []).push(bo);
    }
    this.diSync.ensureEdgeDi(connection);
  }

  unwireConnection(connection: any): void {
    const bo = connection.businessObject;
    if (!bo) {
      return;
    }
    if (isRequirementType(bo.$type)) {
      for (const host of this.state.definitions.drgElement ?? []) {
        removeFrom(host.get(REQUIREMENT_HOST_PROPERTY[bo.$type]), bo);
      }
    } else if (bo.$type === 'dmn:Association') {
      removeFrom(this.state.definitions.artifact, bo);
    }
    // 边 DI 随摘除（redo 经 wireConnection 的 ensureEdgeDi 重建）
    this.diSync.detachDi(connection);
  }

  /** 重接后的整体重挂：先全量摘除，再按现行端点挂回 */
  rewire(event: any): void {
    const context = event.context;
    this.unwireConnection(context.connection);
    this.wireConnection(context);
  }

  /**
   * 删除撤销后的连线回挂：bo 的引用字段未被摘除（unwire 只摘宿主集合与 DI），
   * 按现行端点回推宿主集合/artifact 并重建边 DI
   */
  rewireConnection(connection: any): void {
    const bo = connection.businessObject;
    if (!bo) {
      return;
    }
    if (isRequirementType(bo.$type)) {
      const host = connection.target?.businessObject;
      if (host) {
        const property = REQUIREMENT_HOST_PROPERTY[bo.$type];
        const list = host.get(property) ?? host[property] ?? [];
        list.push(bo);
        host.set(property, list);
      }
    } else if (bo.$type === 'dmn:Association') {
      (this.state.definitions.artifact ??= []).push(bo);
    }
    this.diSync.ensureEdgeDi(connection);
  }
}
