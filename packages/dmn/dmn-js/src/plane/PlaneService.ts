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
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 平面导航服务：折叠子流程下钻/回跳（BPMN 多图语义——子流程内容挂其专属
 * BPMNPlane，规范 §12.2）。
 *
 * 基座机制：diagram-js Canvas 原生多根多平面——addRootElement 建隐藏图层，
 * setRootElement 切换显隐，各平面画布元素一次建好长期留存（首次下钻时按
 * 语义树 + 该平面 DI 建）。切换是纯视图操作：不进命令栈、不 diagram.clear
 * （命令栈在 diagram.clear 会整体清空），跨平面撤销/重做因此天然成立。
 *
 * 事件契约：`plane.changed` { stack }——DrillBadges/PlaneBreadcrumb/palette
 * 刷新消费。Modeler.initEmpty/importXML 收尾调 reset()（文档更替平面栈归零）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { Injector } from 'didi';
import { isSubProcessFamily } from '../meta/ElementTypes';
import type { BpmnDocumentState } from '../xml/DocumentState';
import type { DiagramBuilder } from '../xml/DiagramBuilder';
import { planeOfElement } from '../xml/BpmnReader';

/** 平面栈帧：画布根 + 平面承载的语义元素（主平面=Process/Collaboration，其余=折叠子流程） */
export interface PlaneFrame {
  root: any;
  bo: any;
}

export class PlaneService {
  static $inject = ['eventBus', 'canvas', 'injector', 'bpmnDocumentState'];

  private stack: PlaneFrame[] = [];
  /** 折叠子流程 id → 平面画布根（一次建好复用；文档更替/删除时清除） */
  private readonly roots = new Map<string, any>();

  constructor(
    private readonly eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly injector: Injector,
    private readonly state: BpmnDocumentState
  ) {
    // morph 重建 bo（id 保留）：平面根与栈帧的 bo 引用跟到新对象
    this.eventBus.on('commandStack.bpmnReplace.executed', (event: any) => {
      this.syncBoReferences(event.context.element);
    });
    this.eventBus.on('commandStack.bpmnReplace.reverted', (event: any) => {
      this.syncBoReferences(event.context.element);
    });
    // 删除带平面子流程：摘 diagrams（含嵌套平面，记原序）+ 摘画布平面根；
    // 撤销按原序插回，平面视图下次下钻按树重建
    this.eventBus.on('commandStack.elements.delete.postExecuted', (event: any) => {
      this.discardPlanes(event.context);
    });
    this.eventBus.on('commandStack.elements.delete.reverted', (event: any) => {
      this.restorePlanes(event.context);
    });
    // 撤销创建子流程：其专属平面图（曾下钻建过内容才有）随 bo 一并从语义树
    // 摘除——悬空 plane.bpmnElement 不残留 XML；重做（executed 重放）按原序
    // 插回。画布平面根与 roots 缓存保留复用（bo 引用不变，redo 后可再下钻）
    this.eventBus.on('commandStack.shape.create.reverted', (event: any) => {
      this.discardCreatedPlane(event.context);
    });
    this.eventBus.on('commandStack.shape.create.executed', (event: any) => {
      this.restoreCreatedPlane(event.context);
    });
  }

  /** 文档更替（导入/新建/清空）后归零：平面栈=主平面，平面根缓存全清（旧根已随画布销毁） */
  reset(): void {
    const root = this.canvas.getRootElement();
    this.stack = [{ root, bo: root.businessObject }];
    this.roots.clear();
    this.emitChanged();
  }

  /** 当前平面栈（0=主平面）；面包屑/徽标消费 */
  getStack(): PlaneFrame[] {
    return [...this.stack];
  }

  /** 当前深度（1=主平面） */
  get depth(): number {
    return this.stack.length;
  }

  /** 下钻进入折叠子流程平面（徽标/面包屑入口；空平面即空视图，首个元素落平面时懒建 DI 图） */
  drillDown(element: any): void {
    const bo = element?.businessObject;
    if (!bo || !isSubProcessFamily(bo.$type) || element.isExpanded !== false) {
      throw new Error('下钻仅适用于折叠形态的子流程');
    }
    const root = this.ensureRoot(bo);
    // 选中态清理：被下钻元素随旧平面隐藏，残留选中会让 context pad 锚到隐藏图层
    this.injector.get<any>('selection', false)?.select(null);
    this.injector.get<any>('popupMenu', false)?.close?.();
    const existing = this.stack.findIndex((frame) => frame.bo === bo);
    if (existing >= 0) {
      this.stack = this.stack.slice(0, existing + 1);
    } else {
      this.stack.push({ root, bo });
    }
    this.canvas.setRootElement(root);
    this.fitViewport();
    this.emitChanged();
  }

  /** 回跳到栈上指定层（0=主平面）；栈截断至该层 */
  upTo(index: number): void {
    if (index < 0 || index >= this.stack.length) {
      throw new Error(`平面栈越界：${index}（当前深度 ${this.stack.length}）`);
    }
    this.injector.get<any>('selection', false)?.select(null);
    this.injector.get<any>('popupMenu', false)?.close?.();
    this.stack = this.stack.slice(0, index + 1);
    this.canvas.setRootElement(this.stack[index].root);
    this.fitViewport();
    this.emitChanged();
  }

  /** 平面画布根（缺则按语义树+平面 DI 建；建好注册隐藏图层） */
  private ensureRoot(bo: any): any {
    const existing = this.roots.get(bo.id);
    if (existing && existing.businessObject === bo) {
      return existing;
    }
    const builder = this.injector.get<DiagramBuilder>('diagramBuilder');
    const root = builder.buildSubProcessPlane(bo);
    this.roots.set(bo.id, root);
    return root;
  }

  /** 视口适配（切换平面后内容居中）；容器 0 尺寸跳过（挂载即隐藏的宿主标签页，同 Modeler.fitViewport 契约） */
  private fitViewport(): void {
    const box = (this.canvas as any)._container?.getBoundingClientRect();
    if (box && box.width > 0 && box.height > 0) {
      this.canvas.zoom('fit-viewport');
    }
  }

  private emitChanged(): void {
    this.eventBus.fire('plane.changed', { stack: [...this.stack] });
    // palette 条目随平面变化（子流程平面内不提供池）；基座无公开刷新口，
    // _rebuild 与 i18n.changed 触发同路（无 palette 服务的装配静默跳过）
    this.injector.get<any>('palette', false)?._rebuild?.();
  }

  /** morph 后 bo 引用同步：替换命令保 id 重建 bo，平面根缓存按 id 命中后指向新对象 */
  private syncBoReferences(element: any): void {
    const root = this.roots.get(element.id);
    if (root) {
      root.businessObject = element.businessObject;
    }
    for (const frame of this.stack) {
      if (frame.root === root && root) {
        frame.bo = element.businessObject;
      }
    }
  }

  /**
   * 删除带平面子流程：把其 diagrams（含子树内全部嵌套平面）从定义树摘除并
   * 记原序（同一命令上下文，撤销对称），画布平面根连内容整体摘除——语义子树
   * 随根 bo 不可达不再序列化，悬空 plane bpmnElement 不残留 XML。
   */
  private discardPlanes(context: any): void {
    const removed: { diagram: any; index: number }[] = (context.planeDiagramsRemoved ??= []);
    for (const element of context.elements ?? []) {
      const bo = element?.businessObject;
      if (!bo || element.waypoints || element.labelTarget || !isSubProcessFamily(bo.$type)) {
        continue;
      }
      // 子树内全部子流程平面（含自身）一并摘除
      const diagrams = (this.state.definitions.diagrams ??= []);
      collectSubProcessSubtree(bo).forEach((subBo) => {
        for (let i = 0; i < diagrams.length; i++) {
          const diagram = diagrams[i];
          if (diagram.plane?.bpmnElement === subBo) {
            diagrams.splice(i, 1);
            removed.push({ diagram, index: i });
          }
        }
        const root = this.roots.get(subBo.id);
        if (root) {
          this.removePlaneRoot(root);
          this.roots.delete(subBo.id);
        }
      });
    }
  }

  /** 撤销删除：diagrams 按原序插回（序列化顺序稳定=字节级往返稳定）；平面视图懒重建 */
  private restorePlanes(context: any): void {
    const removed: { diagram: any; index: number }[] = context.planeDiagramsRemoved ?? [];
    const diagrams = (this.state.definitions.diagrams ??= []);
    for (const { diagram, index } of [...removed].sort((a, b) => a.index - b.index)) {
      diagrams.splice(Math.min(index, diagrams.length), 0, diagram);
    }
    context.planeDiagramsRemoved = [];
  }

  /** 撤销创建子流程：摘其专属平面图并记原序（无图=纯浏览未落元素，无操作） */
  private discardCreatedPlane(context: any): void {
    const bo = context.shape?.businessObject;
    if (!bo || !isSubProcessFamily(bo.$type) || context.planeDiagramRemoved) {
      return;
    }
    const diagrams = (this.state.definitions.diagrams ??= []);
    for (let i = 0; i < diagrams.length; i++) {
      if (diagrams[i].plane?.bpmnElement === bo) {
        context.planeDiagramRemoved = { diagram: diagrams[i], index: i };
        diagrams.splice(i, 1);
        return;
      }
    }
  }

  /** 重做创建：按原序插回平面图（首次 executed 无记账，无操作） */
  private restoreCreatedPlane(context: any): void {
    const rec = context.planeDiagramRemoved;
    if (!rec) {
      return;
    }
    const diagrams = (this.state.definitions.diagrams ??= []);
    diagrams.splice(Math.min(rec.index, diagrams.length), 0, rec.diagram);
    context.planeDiagramRemoved = undefined;
  }

  /** 画布平面根连内容整体摘除（根从注册表移除后子元素会悬空，须先逐个摘除） */
  private removePlaneRoot(root: any): void {
    const purge = (element: any): void => {
      for (const child of [...(element.children ?? [])]) {
        purge(child);
      }
      if (element !== root) {
        if (element.waypoints) {
          this.canvas.removeConnection(element);
        } else {
          this.canvas.removeShape(element);
        }
      }
    };
    purge(root);
    this.canvas.removeRootElement(root);
  }
}

/** 语义子树内的全部子流程 bo（含根；flowElements 递归） */
function collectSubProcessSubtree(bo: any): any[] {
  const result: any[] = [];
  const walk = (container: any): void => {
    for (const child of container.flowElements ?? []) {
      if (isSubProcessFamily(child.$type)) {
        result.push(child);
        walk(child);
      }
    }
  };
  if (isSubProcessFamily(bo.$type)) {
    result.push(bo);
    walk(bo);
  }
  return result;
}

/** 平面是否承载内容（徽标"非空"判定用语义子元素，与懒建平面解耦） */
export function planeHasContent(bo: any): boolean {
  return ((bo?.flowElements?.length ?? 0) + (bo?.artifacts?.length ?? 0)) > 0;
}

/** 既有平面查找（供徽标等判定平面存在性；语义内容判定用 planeHasContent） */
export { planeOfElement };
