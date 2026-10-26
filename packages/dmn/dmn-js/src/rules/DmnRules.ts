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
 * DMN 规则（规范语义约束，DRD 平面模型）。
 *
 * 连线类型推断：需求连线类型由端点类型唯一决定（规范 §6.2.3 "the type of
 * the requirement is uniquely determined by the types of the two elements
 * connected"）——裁决单一来源 requirementBetween 端点矩阵；制品关联
 * （Association）= 注记 ↔ 非注记。`connection.create` 返回对象（含 type）
 * 作为连线属性 —— diagram-js Connect/Create 的公开契约。
 *
 * 平面语义（与 BPMN 容器树的关键差异）：DRD 是扁平图——全部形状落画布根
 * （DecisionService 容器 P8 开放），无跨容器移动/装下判定。
 *
 * 重叠规定（镜像 bpmn 线产品规则③）：DRG 形状两两互斥（含同类型，贴边共
 * 边不算相交）；注记=说明制品常压边摆放，不参与重叠判定；连线不参与。
 * 程序化 modeling 直调不经命令栈规则（autoPlace 自带避让），不受此约束。
 */
import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { DmnMode } from '../mode/DmnMode';
import type { DmnElementTypes } from '../meta/ElementTypes';
import { requirementBetween } from '../meta/ElementTypes';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ANNOTATION = 'dmn:TextAnnotation';
const ASSOCIATION = 'dmn:Association';

export class DmnRules extends RuleProvider {
  static $inject = ['eventBus', 'canvas', 'dmnMode', 'dmnElementTypes'];

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly dmnMode: DmnMode,
    private readonly elementTypes: DmnElementTypes
  ) {
    super(eventBus);
  }

  override init(): void {
    this.addRule('connection.create', (context: any) => this.canCreateConnection(context));
    this.addRule('connection.reconnect', (context: any) => this.canReconnect(context));
    this.addRule('connection.reconnectStart', (context: any) => this.canReconnect(context));
    this.addRule('connection.reconnectEnd', (context: any) => this.canReconnect(context));
    this.addRule('shape.create', (context: any) => this.canCreateShape(context));
    this.addRule('shape.resize', (context: any) => this.canResize(context));
    this.addRule('elements.move', (context: any) => this.canMove(context));
    this.addRule('elements.delete', (context: any) => this.canDelete(context));
  }

  // ---------- 连线 ----------

  /** 类型推断：需求矩阵优先（唯一决定），其次注记关联；不可连返回 null */
  private inferConnectionType(source: any, target: any): string | null {
    const st = source.businessObject?.$type;
    const tt = target.businessObject?.$type;
    if (!st || !tt) {
      return null;
    }
    const requirement = requirementBetween(st, tt);
    if (requirement) {
      return requirement;
    }
    // 关联：注记 ↔ 非注记形状（注记↔注记无语义；需求端点不可能是注记）
    const sourceIsAnnotation = st === ANNOTATION;
    const targetIsAnnotation = tt === ANNOTATION;
    if (sourceIsAnnotation !== targetIsAnnotation && !source.waypoints && !target.waypoints) {
      return ASSOCIATION;
    }
    return null;
  }

  private canCreateConnection(context: any): boolean | Record<string, unknown> {
    if (!this.dmnMode.isEditable()) return false;
    const { source, target } = context;
    if (!source || !target || source === target) {
      return false;
    }
    const type = context.type ?? this.inferConnectionType(source, target);
    if (!type) {
      return false;
    }
    return this.validateConnection(type, source, target) ? { type } : false;
  }

  private canReconnect(context: any): boolean {
    if (!this.dmnMode.isEditable()) return false;
    const source = context.connection?.source ?? context.source;
    const target = context.target ?? context.connection?.target;
    const type = context.connection?.businessObject?.$type;
    if (!source || !target || source === target || !type) {
      return false;
    }
    return this.validateConnection(type, source, target);
  }

  /** 端点类型校验：类型是端点的函数——重接两侧端点按同一矩阵复核 */
  private validateConnection(type: string, source: any, target: any): boolean {
    if (this.elementTypes.isRequirementType(type)) {
      return requirementBetween(source.businessObject?.$type, target.businessObject?.$type) === type;
    }
    if (type === ASSOCIATION) {
      const st = source.businessObject?.$type;
      const tt = target.businessObject?.$type;
      return (st === ANNOTATION) !== (tt === ANNOTATION);
    }
    return false;
  }

  // ---------- 形状 ----------

  private canCreateShape(context: any): boolean {
    if (!this.dmnMode.isEditable()) return false;
    const { shape, target } = context;
    if (!shape || !target) {
      return false;
    }
    const type = shape.businessObject?.$type ?? shape.type;
    if (!type?.startsWith('dmn:')) {
      return true; // 非 dmn 元素（插件自定义）放行
    }
    // DRD 扁平平面：形状只落画布根（DecisionService 容器 P8 开放）
    if (!this.isRootElement(target)) {
      return false;
    }
    const meta = this.elementTypes.shapeMeta(type);
    if (!meta) {
      return false;
    }
    // 注记不参与重叠判定（说明制品常压边摆放）；追加路径（context.source）
    // 由 autoPlace 避让，不再叠加校验
    const rect = this.createRect(context.position, shape);
    if (!rect || context.source || type === ANNOTATION) {
      return true;
    }
    return !this.placementConflicts(rect, [shape]);
  }

  /** 缩放白名单：注册表 resizable（注记手调；DRG 形状记法定尺寸不开放） */
  private canResize(context: any): boolean {
    if (!this.dmnMode.isEditable()) return false;
    const shape = context.shape;
    const type = shape?.businessObject?.$type;
    if (!type) {
      return true;
    }
    return this.elementTypes.shapeMeta(type)?.resizable === true;
  }

  private canMove(context: any): boolean {
    if (!this.dmnMode.isEditable()) return false;
    const shapes: any[] = context.shapes;
    if (!shapes || shapes.length === 0) {
      return true;
    }
    // 扁平平面：落点必须仍是画布根（无容器树）
    if (context.target && !this.isRootElement(context.target)) {
      return false;
    }
    // 激活探测（shape.move.start 不带 delta）只问可否启动，不裁当前位
    if (context.delta === undefined) {
      return true;
    }
    return !this.moveOverlaps(shapes, context.delta);
  }

  private canDelete(context: any): boolean {
    if (!this.dmnMode.isEditable()) return false;
    const elements: any[] = context.elements ?? (context.element ? [context.element] : []);
    return elements.length > 0 && !elements.some((e) => this.isRootElement(e));
  }

  // ---------- 重叠（产品规定：DRG 形状两两互斥；注记/连线不参与） ----------

  private createRect(position: any, shape: any): Rect | null {
    if (!position || shape.width == null || shape.height == null) {
      return null;
    }
    return { x: position.x - shape.width / 2, y: position.y - shape.height / 2, width: shape.width, height: shape.height };
  }

  /** 严格相交（贴边不算——元素贴边摆放合法） */
  private rectsIntersect(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private placementConflicts(rect: Rect, moved: any[]): boolean {
    const exempt = new Set<any>(moved);
    return (this.canvas.getRootElement().children ?? []).some(
      (child: any) =>
        !child.waypoints &&
        child.businessObject?.$type !== ANNOTATION &&
        !exempt.has(child) &&
        this.rectsIntersect(rect, child)
    );
  }

  private moveOverlaps(shapes: any[], delta: any): boolean {
    const movable = shapes.filter((s: any) => s.businessObject?.$type !== ANNOTATION);
    for (const shape of movable) {
      const rect = {
        x: shape.x + (delta?.x ?? 0),
        y: shape.y + (delta?.y ?? 0),
        width: shape.width,
        height: shape.height
      };
      if (this.placementConflicts(rect, movable)) {
        return true;
      }
    }
    return false;
  }

  private isRootElement(element: any): boolean {
    return !element.parent && !!element.children;
  }
}
