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
 * 行为集合：双击直编 / 追加自动摆放 / 首池协作包装。
 * 三者互不依赖，拆分为独立类（可分别被插件覆盖）。
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import { SIZES } from '../meta/ElementTypes';
import { adoptionBounds } from '../util/PoolGeometry';
import type { OrientationService } from '../meta/Orientation';
import type { BpmnDocumentState } from '../xml/DocumentState';
import type { BpmnFactory } from '../factory/BpmnFactory';

/** 双击元素 → 激活直接编辑 */
export class LabelBehavior {
  static $inject = ['eventBus', 'directEditing'];

  constructor(eventBus: EventBus, private readonly directEditing: any) {
    eventBus.on('element.dblclick', 1200, (event: any) => {
      this.directEditing.activate(event.element);
    });
  }
}

/**
 * 追加自动摆放（主流向轴朝向感知）：水平模型源右侧开新列、垂直模型源
 * 正下方开新位；位置被占则沿交叉轴错开。
 * 常量：净空 36（APPEND_GAP）、步进 46（APPEND_STEP）、防碰垫 8 —— 自有取值。
 */
export class AutoPlacementBehavior {
  static $inject = ['eventBus', 'elementRegistry', 'orientationService'];

  constructor(
    eventBus: EventBus,
    private readonly elementRegistry: ElementRegistry,
    private readonly orientationService: OrientationService
  ) {
    eventBus.on('autoPlace', (context: any) => this.placeNext(context.source, context.shape));
  }

  private placeNext(source: any, shape: any): { x: number; y: number } {
    // 避让目标 = 兄弟形状；源的祖先容器（池/泳道/子流程链）除外——追加
    // 落点本就要落在源居所内部，祖先边界不该当碰撞块（否则避让会把
    // 新元素挤出容器：池内基座位被"池自身"命中，zigzag 逐级外逃）
    const ancestors = new Set<any>();
    for (let cur = source.parent; cur; cur = cur.parent) {
      ancestors.add(cur);
    }
    const occupied = this.elementRegistry
      .getAll()
      .filter((e: any) => !e.waypoints && !e.labelTarget && e !== source && e.parent && !ancestors.has(e));

    const free = (x: number, y: number): boolean => {
      const box = {
        x: x - shape.width / 2 - 4,
        y: y - shape.height / 2 - 4,
        width: shape.width + 8,
        height: shape.height + 8
      };
      return !occupied.some((e: any) => overlaps(box, e));
    };

    // 文本注记惯例放源斜角位（业界设计器通行布局）：L 括号朝源、Association
    // 沿中心连线斜向直连、线入注记底边括号侧。水平模型右上 / 垂直模型左上。
    // 横向净空 12（自有取值：仅留括号呼吸位，注记左缘列对齐源右缘）；纵向
    // 取 APPEND_GAP 标准净空抬高，保证中心连线约 45° 入底边而非侧穿括号。
    // 被占则沿竖向逐级上移避让（注记列不动，不挤占流程流向空间）
    if (shape.type === 'bpmn:TextAnnotation') {
      const bracketGap = 12;
      if (this.orientationService.isHorizontal()) {
        const cx = source.x + source.width + bracketGap + shape.width / 2;
        let y = source.y - SIZES.APPEND_GAP - shape.height / 2;
        for (let i = 0; i < 24; i++) {
          if (free(cx, y)) {
            return { x: cx, y };
          }
          y -= shape.height / 2 + SIZES.APPEND_STEP / 2;
        }
        return { x: cx, y };
      }
      const cy = source.y - SIZES.APPEND_GAP - shape.height / 2;
      let x = source.x - bracketGap - shape.width / 2;
      for (let i = 0; i < 24; i++) {
        if (free(x, cy)) {
          return { x, y: cy };
        }
        x -= shape.width / 2 + SIZES.APPEND_STEP / 2;
      }
      return { x, y: cy };
    }

    const horizontal = this.orientationService.isHorizontal();
    const base = horizontal
      ? {
          x: source.x + source.width + SIZES.APPEND_GAP + shape.width / 2,
          y: source.y + source.height / 2
        }
      : {
          x: source.x + source.width / 2,
          y: source.y + source.height + SIZES.APPEND_GAP + shape.height / 2
        };

    // 避让=沿交叉轴单向均匀堆叠（水平模型新列向下 / 垂直模型新行向右）：
    // 网关等多分支追加场景形成整齐一列/行，间距恒为步进；交替 zigzag 会
    // 上下跳摆且步长递增掉队，破坏扇形展开的视觉主干
    let candidate = { ...base };
    for (let i = 0; i < 24; i++) {
      if (free(candidate.x, candidate.y)) {
        return candidate;
      }
      const step = (i + 1) * SIZES.APPEND_STEP;
      candidate = horizontal ? { ...base, y: base.y + step } : { ...base, x: base.x + step };
    }
    return base;
  }
}

/**
 * 拖放悬停目标归一：diagram-js 把悬停命中元素直接当放置目标（Create/Move
 * 的 context.target = event.hover），命中流节点/连线等非容器形状时会以
 * "元素当容器"判禁止——悬停元素上方无法释放。本行为在高优先级监听里把
 * 非容器命中沿父链改写到最近的承载容器（泳道/池/展开子流程/画布根），
 * 悬停元素上方即释放到其所在容器。两个例外保持原始命中：拖中间事件悬停
 * 活动是边界事件挂靠语义（shape.attach）；拖边界事件沿宿主边线滑动重挂
 * 依赖 hover=宿主活动。
 */
export class DropTargetBehavior {
  static $inject = ['eventBus'];

  constructor(eventBus: EventBus) {
    const normalize = (event: any): void => {
      const hover = event.hover;
      if (!hover || !hover.businessObject) {
        return;
      }
      const shape = event.context?.shape;
      if (shape && !shape.parent &&
        (shape.type === 'bpmn:IntermediateThrowEvent' || shape.type === 'bpmn:IntermediateCatchEvent')) {
        return;
      }
      const dragging = event.context?.shapes ?? (shape ? [shape] : []);
      if (dragging.some((s: any) => s.businessObject?.$type === 'bpmn:BoundaryEvent')) {
        return;
      }
      // 池的合法落点只有画布根：悬停元素/道/池上一律归一到根（归一到最近
      // 容器会得到池自身——"池建在池里"必然拒绝）
      const isParticipantDrag =
        shape?.businessObject?.$type === 'bpmn:Participant' || shape?.type === 'bpmn:Participant';
      if (isParticipantDrag) {
        let rt: any = hover;
        while (rt && rt.parent) {
          rt = rt.parent;
        }
        if (rt && rt !== hover) {
          event.hover = rt;
        }
        return;
      }
      if (isDropContainer(hover)) {
        return;
      }
      let parent = hover.parent;
      while (parent && !isDropContainer(parent)) {
        parent = parent.parent;
      }
      if (parent) {
        event.hover = parent;
      }
    };
    // 数值优先级须高于 Create.js / Move.js 的默认监听（1000），在其读取
    // event.hover 前完成改写
    eventBus.on(['create.hover', 'create.move', 'shape.move.move'], 1500, normalize);
  }
}

function isDropContainer(element: any): boolean {
  if (!element.parent) {
    return true; // 画布根
  }
  const t = element.businessObject?.$type;
  return (
    t === 'bpmn:Participant' ||
    t === 'bpmn:Lane' ||
    ((t === 'bpmn:SubProcess' || t === 'bpmn:Transaction' || t === 'bpmn:AdHocSubProcess') && element.isExpanded !== false)
  );
}

/**
 * 文本注记横向调整 + 高度自适应：
 * - 宽度是注记唯一可调维度（换行由宽度决定）；高度不进命令栈，渲染后按
 *   文字实测 bbox 收敛回写（shape + DI 同步），幂等——高相等即停，revert
 *   resize 后按恢复的宽度重算自然收敛；
 * - 引擎默认给选中形状加八向手柄，注记仅保留 w/e 纯横向两枚（其余移除，
 *   与规则层方向拒绝互为表里）。
 * 两个钩子都取 200 优先级（引擎默认 1000 为大者先执行）：确保跑在重画/
 * 手柄添加之后，读到的 bbox / DOM 是最新态。
 */
export class TextAnnotationBehavior {
  static $inject = ['eventBus', 'elementRegistry'];

  constructor(private readonly eventBus: EventBus, private readonly elementRegistry: ElementRegistry) {
    this.eventBus.on('element.changed', 200, (e: any) => this.fitHeight(e.element));
    this.eventBus.on('selection.changed', 200, (e: any) => this.trimHandles(e.newSelection));
  }

  private fitHeight(element: any): void {
    if (element?.businessObject?.$type !== 'bpmn:TextAnnotation') {
      return;
    }
    const gfx = this.elementRegistry.getGraphics(element.id);
    const label = gfx?.querySelector('.djs-visual text') as SVGGraphicsElement | null | undefined;
    // 高 = 文字实测高 + 上下留白 8 + 视觉余量 4；空文字回落默认高 40
    const contentH = label?.getBBox().height ?? 0;
    const target = Math.max(SIZES.ANNOTATION_H, Math.ceil(contentH + 12));
    if (target === element.height) {
      return;
    }
    element.height = target;
    if (element.di?.bounds) {
      element.di.bounds.height = target;
    }
    this.eventBus.fire('element.changed', { element });
  }

  private trimHandles(selection: any[]): void {
    const shape = selection?.length === 1 ? selection[0] : null;
    if (shape?.businessObject?.$type !== 'bpmn:TextAnnotation') {
      return;
    }
    for (const dir of ['n', 's', 'nw', 'ne', 'sw', 'se']) {
      gfxRemoveAll(`.djs-resizer-${shape.id}.djs-resizer-${dir}`);
    }
  }
}

function gfxRemoveAll(selector: string): void {
  document.querySelectorAll(selector).forEach((n) => n.remove());
}

/**
 * 首池语义包装：无协作图上创建第一个参与者 → 生成 <collaboration>、
 * 首池领养现有唯一流程；平面目标切换到协作。
 */
export class CollaborationBehavior extends CommandInterceptor {
  static $inject = ['eventBus', 'bpmnDocumentState', 'bpmnFactory', 'canvas', 'orientationService', 'modeling'];

  constructor(
    eventBus: EventBus,
    private readonly state: BpmnDocumentState,
    private readonly bpmnFactory: BpmnFactory,
    private readonly canvas: Canvas,
    private readonly orientationService: OrientationService,
    private readonly modeling: any
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
        : this.bpmnFactory.createProcess({ name: `流程 ${this.state.processes().length + 1}` });
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
    for (const el of loose) {
      this.modeling.moveShape(el, { x: 0, y: 0 }, pool);
      // 外部标签是独立画布元素，moveShape 不自动跟随换父（位置不变，仅归池）
      for (const label of el.labels ?? []) {
        this.modeling.moveShape(label, { x: 0, y: 0 }, pool);
      }
    }
  }
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
