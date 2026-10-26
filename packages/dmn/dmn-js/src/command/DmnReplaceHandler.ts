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
 * DRG 类型替换命令（同族 morph，DRG 四类互换）。
 *
 * moddle 元素 $type 是元模型类型标识不可变——替换以目标类型重建
 * businessObject（id 保留：需求引用 href="#id" 与 DI dmnElementRef 不因
 * 替换漂移），名称随迁；尺寸中心锚定切换到注册表默认。
 *
 * 连线语义收敛（DMN 特有，连线类型=端点函数）：
 * - 本元素持有的需求（作 target/宿主）：矩阵复核 source→新类型仍合法才迁移
 *   到新 bo 的同属性数组，否则连语义带画布连线一并消亡（如 Decision→InputData
 *   后其持有的信息需求 InputData→InputData 不存在）；
 * - 本元素供给的需求（作 source）：矩阵复核 新类型→宿主仍合法才保留（引用
 *   href 不变，必要时改写引用字段——AR 分析派生向 target=KS 时字段随 source
 *   类型变化），否则消亡；
 * - 关联（Association）端点无类型约束，全部保留。
 * revert 换回原对象并复活消亡的连线（画布重挂 + 语义回挂），天然对称。
 */
import type CommandHandler from 'diagram-js/lib/command/CommandHandler';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { DmnElementTypes } from '../meta/ElementTypes';
import { requirementBetween } from '../meta/ElementTypes';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnDocumentState } from '../xml/DocumentState';
import { requirementFieldFor, requirementHostProperty, requirementSourceId } from '../util/Requirements';

/** 需求连线在持有方（宿主）bo 上的三个数组属性（dmn13 描述符） */
const HOST_PROPERTIES = ['informationRequirement', 'knowledgeRequirement', 'authorityRequirement'] as const;

/** 引用字段族（重写前统一清空，防跨字段残留双引用） */
const REFERENCE_FIELDS = ['requiredInput', 'requiredDecision', 'requiredKnowledge', 'requiredAuthority'] as const;

export class DmnReplaceHandler implements CommandHandler {
  static $inject = ['dmnElementTypes', 'dmnFactory', 'eventBus', 'dmnDocumentState', 'canvas'];

  constructor(
    private readonly elementTypes: DmnElementTypes,
    private readonly dmnFactory: DmnFactory,
    private readonly eventBus: any,
    private readonly state: DmnDocumentState,
    private readonly canvas: Canvas
  ) {}

  execute(context: any): any[] {
    const { element, target } = context;
    // 目标类型已在 modeling.replaceElement 前置校验（execute 内抛错毒 action 帧）
    const meta = this.elementTypes.shapeMeta(target.type)!;

    const oldBo = element.businessObject;
    context.oldSize = { width: element.width, height: element.height, x: element.x, y: element.y };
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;

    // 消亡/存留裁决（语义树为准，画布连线按 bo 对应）
    const doomed: any[] = [];
    const hostSurvivors: any[] = [];
    const sourceSurvivors: any[] = [];

    for (const property of HOST_PROPERTIES) {
      for (const requirement of oldBo.get(property) ?? []) {
        if (requirementBetween(this.sourceTypeOf(requirement), target.type) === requirement.$type) {
          hostSurvivors.push(requirement);
        } else {
          doomed.push(requirement);
        }
      }
    }
    // 本元素作 source 的需求连线（object-refs：source↔outgoing、target↔incoming，
    // 供给侧取 outgoing）：矩阵复核 新类型→宿主，合法才存留
    for (const connection of [...(element.outgoing ?? [])]) {
      const bo = connection.businessObject;
      if (!this.elementTypes.isRequirementType(bo?.$type)) {
        continue; // 关联：端点无类型约束，保留
      }
      if (requirementBetween(target.type, connection.target.businessObject?.$type) === bo.$type) {
        sourceSurvivors.push(connection);
      } else {
        doomed.push(bo);
      }
    }

    // 消亡连线的画布侧摘除（语义侧随宿主数组丢弃/引用清空）
    context.doomedConnections = doomed
      .map((bo) => this.connectionOf(bo))
      .filter((connection): connection is any => !!connection);
    for (const connection of context.doomedConnections) {
      this.canvas.removeConnection(connection);
    }

    // 目标类型重建（id/name 保留；claim 幂等）
    const newBo = this.dmnFactory.create<any>({ $type: target.type, id: oldBo.id, name: oldBo.name });
    // 语义文本随迁（注记 text）
    if (oldBo.$type === 'dmn:TextAnnotation' && target.type === 'dmn:TextAnnotation' && oldBo.text) {
      newBo.text = oldBo.text;
    }

    // 存留的宿主侧需求迁到新 bo（引用字段按 source×新 target 复核，防跨字段残留）
    for (const requirement of hostSurvivors) {
      const property = requirementHostProperty(requirement.$type);
      const list = newBo.get(property) ?? [];
      newBo.set(property, list);
      list.push(requirement);
      const sourceType = this.sourceTypeOf(requirement);
      const field = requirementFieldFor(requirement.$type, sourceType, target.type);
      for (const f of REFERENCE_FIELDS) {
        if (f !== field) requirement.set(f, undefined);
      }
      requirement.set(field, this.dmnFactory.createReference(requirementSourceId(requirement) ?? ''));
    }
    // 存留的供给侧需求：引用 href 不变（id 保留），字段按 新source×宿主 复核
    for (const connection of sourceSurvivors) {
      const bo = connection.businessObject;
      const hostType = connection.target.businessObject?.$type;
      const field = requirementFieldFor(bo.$type, target.type, hostType);
      for (const f of REFERENCE_FIELDS) {
        if (f !== field) bo.set(f, undefined);
      }
      bo.set(field, this.dmnFactory.createReference(oldBo.id));
    }

    // 全树引用置换（drgElement 列表/DI dmnElementRef 上出现的旧对象→新对象）
    swapReferences(this.state.definitions, oldBo, newBo);
    element.businessObject = newBo;
    element.di?.set('dmnElementRef', newBo);
    element.type = target.type;

    // 尺寸中心锚定
    element.width = meta.width;
    element.height = meta.height;
    element.x = cx - meta.width / 2;
    element.y = cy - meta.height / 2;

    context.oldBo = oldBo;
    this.eventBus.fire('dmn.replace', { element, oldType: oldBo.$type, newType: target.type });
    return [element, ...sourceSurvivors];
  }

  revert(context: any): any[] {
    const { element } = context;
    const oldBo = context.oldBo;
    const size = context.oldSize;

    swapReferences(this.state.definitions, element.businessObject, oldBo);
    element.businessObject = oldBo;
    element.di?.set('dmnElementRef', oldBo);
    element.type = oldBo.$type;
    element.width = size.width;
    element.height = size.height;
    element.x = size.x;
    element.y = size.y;

    // 消亡连线复活：画布重挂（语义挂接由 DmnUpdater 的 elements.delete
    // reverted 钩子不适用——此处手工回挂：宿主数组在 oldBo 上从未被摘除，
    // 引用字段在 execute 已被改写/清空——重写回原字段）
    const revived: any[] = [];
    for (const connection of context.doomedConnections ?? []) {
      this.canvas.addConnection(connection, this.canvas.getRootElement());
      this.restoreConnectionSemantics(connection);
      revived.push(connection);
    }
    // 供给侧存留连线在 execute 被改写引用字段：撤销恢复原 bo 字段无从快照
    // 逐字段回写（moddle 引用是单值对象）——统一按 oldBo 类型重算（对称逆运算）；
    // 供给侧取 outgoing（object-refs：source↔outgoing）
    for (const connection of [...(element.outgoing ?? [])]) {
      const bo = connection.businessObject;
      if (this.elementTypes.isRequirementType(bo?.$type)) {
        const hostType = connection.target.businessObject?.$type;
        const field = requirementFieldFor(bo.$type, oldBo.$type, hostType);
        for (const f of REFERENCE_FIELDS) {
          if (f !== field) bo.set(f, undefined);
        }
        bo.set(field, this.dmnFactory.createReference(oldBo.id));
      }
    }
    return [element, ...revived, ...(element.incoming ?? [])];
  }

  /** 需求 bo 的 source 端类型（引用经 id 在语义树内解析；悬空引用返回占位空串→矩阵判非法） */
  private sourceTypeOf(requirement: any): string {
    const id = requirementSourceId(requirement);
    if (!id) {
      return '';
    }
    const sourceBo = (this.state.definitions.drgElement ?? []).find((e: any) => e.id === id);
    return sourceBo?.$type ?? '';
  }

  /** 语义 bo → 画布连线（按各形状入线的 bo 身份匹配；无画布对应返回 null） */
  private connectionOf(requirementBo: any): any | null {
    for (const shape of this.rootShapes()) {
      for (const connection of shape.incoming ?? []) {
        if (connection.businessObject === requirementBo) {
          return connection;
        }
      }
    }
    return null;
  }

  /** 根层形状迭代（DRD 扁平平面） */
  private rootShapes(): any[] {
    return (this.canvas.getRootElement().children ?? []).filter((child: any) => !child.waypoints);
  }

  /** 消亡连线复活后的语义回挂：画布端点未变（source/target 引用同 id），引用字段按端点重写 */
  private restoreConnectionSemantics(connection: any): void {
    const bo = connection.businessObject;
    if (!this.elementTypes.isRequirementType(bo?.$type)) {
      return;
    }
    const sourceType = connection.source.businessObject?.$type;
    const hostType = connection.target.businessObject?.$type;
    const field = requirementFieldFor(bo.$type, sourceType, hostType);
    for (const f of REFERENCE_FIELDS) {
      if (f !== field) bo.set(f, undefined);
    }
    bo.set(field, this.dmnFactory.createReference(connection.source.businessObject.id));
  }
}

/**
 * 全树引用置换（from → to）：drgElement/artifact 列表成员与 DI dmnElementRef
 * 上出现的旧对象一律替换。id 保持不变，序列化输出无差；运行时引用一致性由
 * 本遍历保证（href 字符串引用不经对象置换——id 不变天然有效）。
 */
function swapReferences(definitions: any, from: any, to: any): void {
  if (!definitions) {
    return;
  }
  const LIST_KEYS = ['drgElement', 'artifact', 'diagramElements'];
  const SINGLE_KEYS = ['dmnElementRef'];
  const visited = new Set<unknown>();

  const visit = (node: any): void => {
    if (!node || typeof node !== 'object' || visited.has(node)) {
      return;
    }
    visited.add(node);
    for (const key of LIST_KEYS) {
      const list = node[key];
      if (!Array.isArray(list)) {
        continue;
      }
      for (let i = 0; i < list.length; i++) {
        if (list[i] === from) {
          list[i] = to;
        }
      }
    }
    for (const key of SINGLE_KEYS) {
      if (node[key] === from) {
        node[key] = to;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === '$attrs') {
        continue;
      }
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    }
  };

  visit(definitions);
}

/** 供菜单构建替换目标描述（DMN 形状无变体轴，type 即全部） */
export function replaceTarget(meta: { type: string }): { type: string } {
  return { type: meta.type };
}
