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
 * 外部标签元素生命周期：事件/网关/数据/分组（注册表 labelMode='external'）
 * 与连线的标签以独立画布元素存在（diagram-js 标签原语：labelTarget 双向
 * refs、LabelSupport 随宿主移动/删除）——可单独选中、拖动、直编。
 *
 * 创建/更新随宿主命令（shape.create / connection.create / label.update 的
 * postExecute 挂钩，与宿主同栈可整体撤销）；几何默认值唯一来源
 * LabelGeometry.absoluteLabelBox，用户拖动后的位置经 BpmnUpdater 回写宿主
 * di.label.bounds 持久化。形内标签（任务族/池/泳道/注记）不经此行为，
 * 仍由宿主 gfx 渲染。
 */
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type ElementFactory from 'diagram-js/lib/core/ElementFactory';
import type TextUtil from 'diagram-js/lib/util/Text';
import { absoluteLabelBox, EXTERNAL_LABEL_WIDTH, EXTERNAL_FONT } from '../label/LabelGeometry';
import type { BpmnElementTypes } from '../meta/ElementTypes';

/** 标签元素最小命中/占位尺寸（自有取值：12px 约一行 11px 文字高度） */
const LABEL_MIN = 12;

export class ExternalLabelBehavior extends CommandInterceptor {
  static $inject = ['eventBus', 'elementFactory', 'modeling', 'textRenderer', 'bpmnElementTypes'];

  constructor(
    private readonly eventBus: EventBus,
    private readonly elementFactory: ElementFactory,
    private readonly modeling: any,
    private readonly textUtil: TextUtil,
    private readonly elementTypes: BpmnElementTypes
  ) {
    super(eventBus);

    this.postExecute(['shape.create', 'connection.create'], (event: any) => {
      const element = event.context.shape ?? event.context.connection;
      if (this.needsLabel(element)) {
        this.ensureLabel(element);
      }
    });

    // 文本变更：显/隐标签并按文字量收敛宽高（形内标签宿主已随命令脏标记重绘）
    this.postExecute('label.update', (event: any) => {
      const host = event.context.element;
      if (this.needsLabel(host)) {
        this.ensureLabel(host);
      }
    });

    // 程序化移动宿主时标签随动：LabelSupport 只把标签纳入拖拽
    // （elements.move）闭包，shape.move 单元素路径不带标签——嵌套同 delta
    // 的 moveShape 命令（postExecute 相内合法）：随宿主命令同栈可整体撤销，
    // 且标签经命令脏标记触发 DI 的 BPMNLabel.bounds 收敛
    this.postExecute('shape.move', (event: any) => {
      const { shape, delta } = event.context;
      for (const label of shape.labels ?? []) {
        this.modeling.moveShape(label, { x: delta.x, y: delta.y });
      }
    });
  }

  private needsLabel(element: any): boolean {
    if (!element || element.labelTarget) {
      return false;
    }
    const bo = element.businessObject;
    if (!bo) {
      return false;
    }
    if (element.waypoints) {
      return true;
    }
    return this.elementTypes.shapeMeta(bo.$type)?.labelMode === 'external';
  }

  private ensureLabel(host: any): void {
    const text: string | undefined = host.businessObject?.name;
    const label = host.labels?.[0];
    if (!label) {
      const box = absoluteLabelBox(this.textUtil, host, text);
      const created = this.elementFactory.create('label', {
        id: `${host.id}_label`,
        type: 'label',
        labelMode: 'external',
        businessObject: host.businessObject,
        hidden: !text,
        ...box
      });
      this.modeling.createLabel(
        host,
        { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        created,
        host.parent
      );
      return;
    }
    const wasHidden = label.hidden;
    label.hidden = !text;
    if (text) {
      // 按文字量收敛宽高，保持当前中心（拖动后的位置不被文本编辑重置）
      const dims = this.textUtil.getDimensions(text, {
        box: { width: EXTERNAL_LABEL_WIDTH, height: 40 },
        style: EXTERNAL_FONT,
        padding: 0
      });
      const cx = label.x + label.width / 2;
      const cy = label.y + label.height / 2;
      label.width = Math.max(dims.width, LABEL_MIN);
      label.height = Math.max(dims.height, LABEL_MIN);
      label.x = cx - label.width / 2;
      label.y = cy - label.height / 2;
    }
    if (wasHidden !== label.hidden || text) {
      this.eventBus.fire('element.changed', { element: label });
    }
  }
}
