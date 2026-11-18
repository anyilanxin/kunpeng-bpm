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
 * 首池协作包装行为：无协作图上创建首参与者时生成 <collaboration>、领养现有唯一流程并切换平面目标（可被插件覆盖的独立行为）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import { SIZES } from '../meta/ElementTypes';
import { adoptionBounds } from '../util/PoolGeometry';
import type { OrientationService } from '../meta/Orientation';
import type { BpmnDocumentState } from '../xml/DocumentState';
import type { BpmnFactory } from '../factory/BpmnFactory';
import type { BpmnI18n } from '../i18n/BpmnI18n';

/**
 * 首池语义包装：无协作图上创建第一个参与者 → 生成 <collaboration>、
 * 首池领养现有唯一流程；平面目标切换到协作。跨池拖动后两端不同池的
 * 连线就地断开（连线语义限同池，跨池属消息流范畴不在本内核）。
 */
export class CollaborationBehavior extends CommandInterceptor {
  static $inject = ['eventBus', 'bpmnDocumentState', 'bpmnFactory', 'canvas', 'orientationService', 'modeling', 'bpmnI18n'];

  constructor(
    eventBus: EventBus,
    private readonly state: BpmnDocumentState,
    private readonly bpmnFactory: BpmnFactory,
    private readonly canvas: Canvas,
    private readonly orientationService: OrientationService,
    private readonly modeling: any,
    private readonly i18n: BpmnI18n
  ) {
    super(eventBus);

    this.on('shape.create', 'preExecute', (event: any) => {
      const shape = event.context.shape;
      const bo = shape.businessObject;
      if (bo?.$type !== 'bpmn:Participant' || bo.processRef) {
        return;
      }
      const existingProcesses = this.state.processes();
      const adoptExisting =
        !this.state.collaboration && existingProcesses.length === 1;

      const process = adoptExisting
        ? existingProcesses[0]
        : this.bpmnFactory.createProcess({
          name: this.i18n.t('Process {n}', { n: String(existingProcesses.length + 1) })
        });
      if (!adoptExisting) {
        this.state.definitions.rootElements.push(process);
      }
      bo.processRef = process;

      if (!this.state.collaboration) {
        const collab = this.bpmnFactory.createCollaboration();
        this.state.definitions.rootElements.unshift(collab);
        this.state.planeTargetId = collab.id;
        // 树上平面与画布根同步改指协作（导出 bpmnElement 与语义一致；根原地
        // 换 bo——diagram-js setRootElement 不迁移子元素 gfx/parent，原地改零成本）
        const plane = this.state.plane;
        if (plane) {
          plane.bpmnElement = collab;
        }
        const root = this.canvas.getRootElement();
        if (root) {
          root.type = collab.$type;
          root.businessObject = collab;
          if (plane) {
            root.di = plane;
          }
        }
      }
    });

    this.on('shape.create', 'postExecute', (event: any) => {
      const shape = event.context.shape;
      if (shape.businessObject?.$type !== 'bpmn:Participant') {
        return;
      }
      this.adoptLooseShapes(shape);
    });

    // 跨池断链（2026-11-18 用户定规）：元素可跨池拖动，但连线两端必须同池
    // ——同池跨泳道连线保留，移动后两端分属不同参与者的连线就地删除。
    // postExecuted（handler 之后、_popAction 之前——postExecute 相位事件在
    // handler 前触发，此时换父未发生两端恒同池）与移动命令同处一个 action
    // 帧，撤销单步还原（断链命令栈内后入先出）
    this.on('elements.move', 'postExecuted', (event: any) => {
      this.severCrossPoolLinks(event.context.shapes ?? []);
    });
  }

  /** 移动集两端跨池的连线删除（源/目标任一端被移入另一池即断） */
  private severCrossPoolLinks(shapes: any[]): void {
    const links = new Set<any>();
    for (const shape of shapes) {
      for (const conn of [...(shape.incoming ?? []), ...(shape.outgoing ?? [])]) {
        links.add(conn);
      }
    }
    for (const conn of links) {
      const sourcePool = participantOf(conn.source);
      const targetPool = participantOf(conn.target);
      if (sourcePool && targetPool && sourcePool !== targetPool) {
        this.modeling.removeConnection(conn);
      }
    }
  }

  /**
   * 池落到已有裸元素的图上：把滞留根平面的形状收编进池，池几何 wrap 全部
   * 裸元素（adoptionBounds，含最小规格钳制——palette 拖拽预览用同一计算，
   * 保证"拖出多大，落池就多大"）。拖池到元素上方即「给这些元素加池」的
   * 完整语义；若不收编，元素滞留协作根平面会被「协作图根上只放池」的
   * 放置规则挡死，后续拖放/追加全部禁止。
   */
  private adoptLooseShapes(pool: any): void {
    const root = this.canvas.getRootElement();
    const loose = (root.children ?? []).filter(
      (c: any) => c !== pool && !c.labelTarget && !c.waypoints && c.businessObject?.$type !== 'bpmn:Participant'
    );
    const bounds = adoptionBounds(loose, SIZES.POOL_HEADER, this.orientationService.isHorizontal());
    if (!bounds) {
      return;
    }
    this.modeling.resizeShape(pool, bounds);
    // 零位移换父：几何不变，连线必须原样保留——diagram-js MoveShapeHandler
    // 默认对被移元素的每条进出连线调 layoutConnection（收养时每条线被源/目标
    // 各重排一次），拖拽后的移动路径形态会被双重 repair+snap 收敛成畸形多折线
    for (const el of loose) {
      this.modeling.moveShape(el, { x: 0, y: 0 }, pool, undefined, { layout: false });
      // 外部标签是独立画布元素，moveShape 不自动跟随换父（位置不变，仅归池）
      for (const label of el.labels ?? []) {
        this.modeling.moveShape(label, { x: 0, y: 0 }, pool);
      }
    }
    // 连线跟随入池：源/目标均被收编的连线一并归池——滞留协作根上渲染序
    // 在池之下，会被不透明池体遮住不可见；连线标签随连线归池
    const adopted = new Set(loose);
    const conns = (root.children ?? []).filter(
      (c: any) => c.waypoints && adopted.has(c.source) && adopted.has(c.target)
    );
    for (const conn of conns) {
      this.modeling.moveConnection(conn, { x: 0, y: 0 }, pool);
      for (const label of conn.labels ?? []) {
        this.modeling.moveShape(label, { x: 0, y: 0 }, pool);
      }
    }
  }
}

/** 元素所属参与者（沿父链；根平面元素返回 null） */
function participantOf(element: any): any | null {
  let cur = element?.parent;
  while (cur) {
    if (cur.businessObject?.$type === 'bpmn:Participant') {
      return cur;
    }
    cur = cur.parent;
  }
  return null;
}
