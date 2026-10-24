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
 * 元素全量弹框 Provider：'bpmn-append'（追加元素）/ 'bpmn-create'（创建元素）。
 * 与 'bpmn-replace'（更改元素）构成组件三张定制弹框，均由 context pad 触发：
 * - 追加：选中流节点 → "…" 钮 → 全量可追加类型，动作 = autoPlace.append（带顺序流）；
 * - 创建：选中容器（池/泳道/展开子流程）→ "+" 钮 → 容器内落形，动作 =
 *   modeling.createShape（target 即容器，池落点避开头带取可用区中心）。
 *   画布根亦可为宿主（palette 底部 "…"）：落点取可视区中心，若被池/泳道/子流程
 *   覆盖则落进最内层容器（协作图上根平面仅可放池）。
 * 条目按 palette 分组展示分组头，多于 5 个时打开方（context pad / palette）传
 * search: true 出搜索框（diagram-js PopupMenu 契约）。
 */
import { BpmnElementTypes, SIZES, isContainerType, metaId } from '../meta/ElementTypes';
import type { ShapeTypeMeta } from '../meta/ElementTypes';
import { bpmnIconHtml } from '../icons/BpmnIcons';
import { poolInnerRect } from '../util/PoolGeometry';

/**
 * 追加弹框收录的 palette 分组：仅流节点族——开始事件规范不允许入边、
 * 边界事件必须吸附宿主活动，两者不可作为追加目标，不收录。
 */
const APPEND_GROUPS = [
  'intermediateCatch',
  'intermediateThrow',
  'endEvents',
  'activities',
  'subProcesses',
  'gateways'
];

/**
 * 创建弹框收录的 palette 分组：容器内可落形的流节点 + 数据/注记制品。
 * 边界事件须吸附宿主、池不可嵌套，均不收录。
 */
const CREATE_GROUPS = [
  'startEvents',
  'intermediateCatch',
  'intermediateThrow',
  'endEvents',
  'activities',
  'subProcesses',
  'gateways',
  'artifacts'
];

/**
 * 弹框条目缓存（按宿主元素 WeakMap）：context pad 打开对同一元素会先
 * isEmpty 判空再 open 取条目（经 PopupMenu._getContext 各触发一次完整构建，
 * ~48-68 条含 SVG 串），选中变化是高频路径——判空+开启同批直接命中缓存。
 * 失效契约：命令栈变化（几何/结构/落点占用变化）统一清空；条目闭包捕获的
 * 落点在两次命令之间保持有效。
 */
export class PopupMenuEntriesCache {
  private entries = new WeakMap<object, Record<string, any>>();

  constructor(eventBus: { on(event: string, fn: () => void): unknown }) {
    eventBus.on('commandStack.changed', () => {
      this.entries = new WeakMap();
    });
  }

  get(target: object, build: () => Record<string, any>): Record<string, any> {
    let cached = this.entries.get(target);
    if (!cached) {
      cached = build();
      this.entries.set(target, cached);
    }
    return cached;
  }
}

/** 按 palette 分组过滤注册表并构建弹框条目；place 收创建后的落形动作 */
function buildEntries(
  elementTypes: BpmnElementTypes,
  i18n: { t(text: string): string },
  groupIds: string[],
  keyPrefix: string,
  place: (meta: ShapeTypeMeta, shape: any) => void,
  close: () => void,
  elementFactory: any
): Record<string, any> {
  const groupLabels = new Map(
    BpmnElementTypes.PALETTE_GROUPS.map((g) => [g.id, g.label] as const)
  );
  const entries: Record<string, any> = {};
  for (const meta of elementTypes.paletteShapeEntries()) {
    if (!groupIds.includes(meta.paletteGroup ?? '')) {
      continue;
    }
    entries[`${keyPrefix}-${metaId(meta)}`] = {
      label: i18n.t(meta.label),
      group: { id: meta.paletteGroup!, name: i18n.t(groupLabels.get(meta.paletteGroup!)!) },
      imageHtml: bpmnIconHtml(meta),
      title: i18n.t(meta.label),
      action: () => {
        place(meta, elementFactory.createShape(elementTypes.createAttrs(meta)));
        // PopupMenu.trigger 不自动关闭（引擎契约），动作方负责收起
        close();
      }
    };
  }
  return entries;
}

export class BpmnAppendMenuProvider {
  static readonly MENU_ID = 'bpmn-append';

  static $inject = ['popupMenu', 'eventBus', 'bpmnElementTypes', 'elementFactory', 'autoPlace', 'bpmnI18n'];

  constructor(
    popupMenu: any,
    eventBus: any,
    private readonly elementTypes: BpmnElementTypes,
    private readonly elementFactory: any,
    private readonly autoPlace: any,
    private readonly i18n: any
  ) {
    this.popupMenu = popupMenu;
    this.cache = new PopupMenuEntriesCache(eventBus);
    popupMenu.registerProvider(BpmnAppendMenuProvider.MENU_ID, this);
  }

  private readonly popupMenu: any;
  private readonly cache: PopupMenuEntriesCache;

  getPopupMenuEntries(target: any): Record<string, any> {
    // 仅流节点可作为追加源（与 context pad 快捷追加同一判定）
    const family = this.elementTypes.family(target.businessObject?.$type);
    if (family !== 'event' && family !== 'activity' && family !== 'gateway') {
      return {};
    }
    return this.cache.get(target, () => buildEntries(
      this.elementTypes,
      this.i18n,
      APPEND_GROUPS,
      'append',
      (_meta, shape) => {
        this.autoPlace.append(target, shape, {
          connection: { type: 'bpmn:SequenceFlow' }
        });
      },
      () => this.popupMenu.close(),
      this.elementFactory
    ));
  }
}

export class BpmnCreateMenuProvider {
  static readonly MENU_ID = 'bpmn-create';

  static $inject = ['popupMenu', 'eventBus', 'bpmnElementTypes', 'elementFactory', 'modeling', 'bpmnI18n', 'canvas', 'elementRegistry', 'orientationService'];

  constructor(
    popupMenu: any,
    eventBus: any,
    private readonly elementTypes: BpmnElementTypes,
    private readonly elementFactory: any,
    private readonly modeling: any,
    private readonly i18n: any,
    private readonly canvas: any,
    private readonly elementRegistry: any,
    private readonly orientationService: { isHorizontal(): boolean }
  ) {
    this.popupMenu = popupMenu;
    this.cache = new PopupMenuEntriesCache(eventBus);
    popupMenu.registerProvider(BpmnCreateMenuProvider.MENU_ID, this);
  }

  private readonly popupMenu: any;
  private readonly cache: PopupMenuEntriesCache;

  getPopupMenuEntries(target: any): Record<string, any> {
    const type = target.businessObject?.$type;
    const isContainer = isContainerType(type, target.isExpanded);
    // 画布根宿主（palette "…" 场景）：可视区中心落形
    const isRoot = target === this.canvas.getRootElement();
    if (!isContainer && !isRoot) {
      return {};
    }

    let host = target;
    let position: { x: number; y: number };
    if (isRoot) {
      const vb = this.canvas.viewbox();
      const center = { x: vb.x + vb.width / 2, y: vb.y + vb.height / 2 };
      // 可视区中心的容器优先（协作图上根平面仅可放池，直接落根会被规则拒绝）
      const container = this.containerAt(center);
      if (container) {
        host = container;
        position = center;
      } else {
        // 有池但中心不在池内：落首个池的可用区中心（头带按朝向避开），不裸投根平面
        const pools = this.elementRegistry.filter((el: any) => el.businessObject?.$type === 'bpmn:Participant');
        if (pools.length > 0) {
          host = pools[0];
          const poolArea = poolInnerRect(host, SIZES.POOL_HEADER, this.orientationService.isHorizontal());
          position = { x: poolArea.x + poolArea.width / 2, y: poolArea.y + poolArea.height / 2 };
        } else {
          position = center;
        }
      }
    } else {
      // 容器宿主（context pad "+" 场景）：落点取可用区中心——池须按朝向避头带，其余取形心
      const area = type === 'bpmn:Participant'
        ? poolInnerRect(target, SIZES.POOL_HEADER, this.orientationService.isHorizontal())
        : { x: target.x, y: target.y, width: target.width, height: target.height };
      position = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
    }

    return this.cache.get(target, () => {
      const placement = this.resolvePlacement(host, position);
      const hostTarget = placement.host;
      const placePosition = placement.position;
      return buildEntries(
        this.elementTypes,
        this.i18n,
        CREATE_GROUPS,
        'create',
        (_meta, shape) => {
          this.modeling.createShape(shape, placePosition, hostTarget);
        },
        () => this.popupMenu.close(),
        this.elementFactory
      );
    });
  }

  /**
   * 弹框落点解析：池带泳道时归一到落点所在道（无命中取首道）——带即占位，
   * 落池会与带冲突；随后在宿主区内避让既有元素（中心被占沿主流向下游逐级
   * 错开，步进同追加分摆位），候选须留在区内，穷尽回中心（弹框是放置动作，
   * 不能像拖放一样拒绝）。
   */
  private resolvePlacement(host: any, position: { x: number; y: number }): { host: any; position: { x: number; y: number } } {
    const horizontal = this.orientationService.isHorizontal();
    if (host.businessObject?.$type === 'bpmn:Participant') {
      const lanes = (host.children ?? []).filter((c: any) => c.businessObject?.$type === 'bpmn:Lane');
      if (lanes.length) {
        const contains = (l: any, p: { x: number; y: number }): boolean =>
          p.x >= l.x && p.x <= l.x + l.width && p.y >= l.y && p.y <= l.y + l.height;
        const hit = lanes.find((l: any) => contains(l, position));
        const first = lanes.reduce((a: any, b: any) => ((horizontal ? b.y < a.y : b.x < a.x) ? b : a));
        host = hit ?? first;
        if (!hit) {
          position = { x: host.x + host.width / 2, y: host.y + host.height / 2 };
        }
      }
    }
    const area = !host.parent ? null
      : host.businessObject?.$type === 'bpmn:Participant'
        ? poolInnerRect(host, SIZES.POOL_HEADER, horizontal)
        : { x: host.x, y: host.y, width: host.width, height: host.height };
    const occupied = (host.children ?? []).filter(
      (c: any) => !c.waypoints && !c.labelTarget && c.businessObject?.$type !== 'bpmn:Group'
    );
    const inside = (p: { x: number; y: number }): boolean =>
      !area || (p.x >= area.x && p.x <= area.x + area.width && p.y >= area.y && p.y <= area.y + area.height);
    const free = (p: { x: number; y: number }): boolean =>
      !occupied.some((c: any) => p.x > c.x && p.x < c.x + c.width && p.y > c.y && p.y < c.y + c.height);
    for (let i = 0; i <= 24; i++) {
      const candidate = horizontal
        ? { x: position.x, y: position.y + i * SIZES.APPEND_STEP }
        : { x: position.x + i * SIZES.APPEND_STEP, y: position.y };
      if (inside(candidate) && free(candidate)) {
        return { host, position: candidate };
      }
    }
    return { host, position };
  }

  /** 点内最内层容器（池/泳道/展开子流程取面积最小者）；无则 null */
  private containerAt(point: { x: number; y: number }): any | null {
    const hits = this.elementRegistry.filter((el: any) => {
      const t = el.businessObject?.$type;
      if (el.waypoints || el.labelTarget || !isContainerType(t, el.isExpanded)) {
        return false;
      }
      return point.x >= el.x && point.x <= el.x + el.width && point.y >= el.y && point.y <= el.y + el.height;
    });
    if (hits.length === 0) {
      return null;
    }
    return hits.reduce((smallest: any, el: any) => (el.width * el.height < smallest.width * smallest.height ? el : smallest));
  }
}
