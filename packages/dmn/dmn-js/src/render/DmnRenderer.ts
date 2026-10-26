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
 * DMN 渲染器：形状按 DmnSymbols 记法绘制，名字形内居中（规范 §6.2.1
 * "Name MUST be displayed inside the shape"）；可下钻元素（Decision/BKM，
 * 注册表 drillable）左上角绘制下钻图标（点击语义由 plane 层接）。
 */
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type TextUtil from 'diagram-js/lib/util/Text';
import { append, attr, create } from 'tiny-svg';
import { SIZES, shapeMetaOf } from '../meta/ElementTypes';
import {
  drawDecisionShape,
  drawBkmShape,
  drawInputDataShape,
  drawKnowledgeSourceShape,
  drawDecisionServiceShape,
  drawTextAnnotationShape,
  appendFilledArrow,
  appendOpenArrow,
  appendCircleHead,
  LINE_WIDTH,
  type StyleTheme
} from './DmnSymbols';

export interface DmnRendererConfig {
  defaultStrokeColor?: string;
  defaultFillColor?: string;
  labelColor?: string;
}

const DEFAULT_CONFIG: Required<DmnRendererConfig> = {
  defaultStrokeColor: '#000000',
  defaultFillColor: '#ffffff',
  labelColor: '#000000'
};

/**
 * 连线末端（线段终点+端头尖端）相对末端锚线的后退量（自有取值）：目标形状
 * 描边以锚线为中心向内外各延半宽，末端停在锚线会与目标描带融合、可见长度
 * 被吞；后退让末端停在描带之外，与描边零重叠、两种图层顺序渲染一致
 */
const TIP_RETREAT = 2;

/** 连线记法：知识/权威需求虚线（规范 §6.2.7 dashed），关联长虚线弱化 */
const DASH_REQUIREMENT = '6 4';
const DASH_ASSOCIATION = '4 4';

/** 下钻图标（左上角 12×12 网格形+右下角空隙，记法=进入内部编辑）：描边小方格 */
const DRILL_ICON = 'M2,2 H12 V12 M10,14 H14 V10';

export class DmnRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'textRenderer', 'config.dmnRenderer'];

  constructor(
    eventBus: EventBus,
    private readonly textUtil: TextUtil,
    config: DmnRendererConfig
  ) {
    super(eventBus, 1500);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private readonly config: Required<DmnRendererConfig>;

  override canRender(element: any): boolean {
    const type = element.businessObject?.$type ?? element.type;
    return typeof type === 'string' && type.startsWith('dmn:');
  }

  override drawShape(visuals: SVGElement, shape: any): SVGElement {
    const type = shape.businessObject?.$type ?? shape.type;
    const theme = this.theme();
    switch (type) {
      case 'dmn:Decision':
        drawDecisionShape(visuals, shape.width, shape.height, theme);
        break;
      case 'dmn:BusinessKnowledgeModel':
        drawBkmShape(visuals, shape.width, shape.height, SIZES.BKM_CUT, theme);
        break;
      case 'dmn:InputData':
        drawInputDataShape(visuals, shape.width, shape.height, theme);
        break;
      case 'dmn:KnowledgeSource':
        drawKnowledgeSourceShape(visuals, shape.width, shape.height, SIZES.KS_WAVE, theme);
        break;
      case 'dmn:DecisionService':
        drawDecisionServiceShape(
          visuals,
          shape.width,
          shape.height,
          shape.dividerY ?? SIZES.SERVICE_DIVIDER_Y,
          theme
        );
        break;
      case 'dmn:TextAnnotation':
        drawTextAnnotationShape(visuals, shape.width, shape.height, theme);
        break;
      default:
        // 未登记形状按圆角矩形兜位（不 fuchsia：未知类型至少可见可选中）
        drawDecisionShape(visuals, shape.width, shape.height, theme);
    }
    this.drawName(visuals, shape, type);
    this.drawDrillIcon(visuals, shape, type);
    return visuals;
  }

  override drawConnection(visuals: SVGElement, connection: any): SVGElement {
    const type = connection.businessObject?.$type ?? connection.type;
    const stroke = this.config.defaultStrokeColor;
    const points = connection.waypoints;
    const last = points[points.length - 1];
    const prev = points[points.length - 2] ?? last;
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    const decorated = type !== 'dmn:Association';
    const tip = decorated
      ? {
          x: last.x - TIP_RETREAT * Math.cos(angle),
          y: last.y - TIP_RETREAT * Math.sin(angle)
        }
      : last;
    const linePoints = decorated ? [...points.slice(0, -1), tip] : points;

    const line = create('path');
    attr(line, {
      d: `M${linePoints.map((p: any) => `${p.x},${p.y}`).join(' L')}`,
      fill: 'none',
      stroke,
      'stroke-width': LINE_WIDTH,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round'
    });
    if (type === 'dmn:KnowledgeRequirement' || type === 'dmn:AuthorityRequirement') {
      attr(line, { 'stroke-dasharray': DASH_REQUIREMENT });
    } else if (type === 'dmn:Association') {
      attr(line, { 'stroke-dasharray': DASH_ASSOCIATION });
    }
    append(visuals, line);

    if (type === 'dmn:InformationRequirement') {
      appendFilledArrow(visuals, prev, tip, stroke);
    } else if (type === 'dmn:KnowledgeRequirement') {
      appendOpenArrow(visuals, prev, tip, stroke);
    } else if (type === 'dmn:AuthorityRequirement') {
      appendCircleHead(visuals, tip, stroke);
    }
    return visuals;
  }

  /** 形内名字：内容盒居中；注记左上（括号线右侧起排，文本取 bo.text 而非 name）；DS 名字=分割线下左上 */
  private drawName(visuals: SVGElement, shape: any, type: string): void {
    const text =
      type === 'dmn:TextAnnotation' ? shape.businessObject?.text : shape.businessObject?.name;
    if (!text) {
      return;
    }
    let box: { x: number; y: number; width: number; height: number };
    let align: 'center-middle' | 'left-top' = 'center-middle';
    if (type === 'dmn:TextAnnotation') {
      box = { x: 18, y: 4, width: shape.width - 24, height: shape.height - 8 };
      align = 'left-top';
    } else if (type === 'dmn:DecisionService') {
      box = { x: 8, y: (shape.dividerY ?? SIZES.SERVICE_DIVIDER_Y) + 4, width: shape.width - 16, height: shape.height - (shape.dividerY ?? SIZES.SERVICE_DIVIDER_Y) - 8 };
      align = 'left-top';
    } else {
      box = { x: 5, y: 3, width: shape.width - 10, height: shape.height - 6 };
    }
    const el = this.textUtil.createText(text, {
      box: { width: box.width, height: box.height } as any,
      align: align as any,
      style: { fontFamily: 'system-ui, "PingFang SC", sans-serif', fontSize: 12, fill: this.config.labelColor },
      padding: 2
    });
    attr(el, { transform: `translate(${box.x} ${box.y})` });
    append(visuals, el);
  }

  /**
   * 左上角下钻图标（用户定规 2026-10-26）：可下钻元素（注册表 drillable）
   * 左上角 14×14 记法图标（网格+入口缺口=进入内部编辑）。绘制只管视觉，
   * 命中/点击由 plane 下钻层经元素事件接（左上角矩形命中测试）。
   */
  private drawDrillIcon(visuals: SVGElement, shape: any, type: string): void {
    const meta = shapeMetaOf(type);
    if (!meta?.drillable) {
      return;
    }
    const icon = create('path');
    attr(icon, {
      d: DRILL_ICON,
      fill: 'none',
      stroke: this.config.labelColor,
      'stroke-width': 1.2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      transform: 'translate(4 4) scale(0.9)',
      'data-drill-icon': type
    });
    append(visuals, icon);
  }

  private theme(): StyleTheme {
    return {
      stroke: this.config.defaultStrokeColor,
      fill: this.config.defaultFillColor,
      labelColor: this.config.labelColor
    };
  }

  /** 命中/轮廓 path：世界坐标包围盒（DMN 各形状记法差异相对包围盒让出量小，按包围盒取偏保守） */
  override getShapePath(shape: any): string {
    return `M${shape.x},${shape.y} H${shape.x + shape.width} V${shape.y + shape.height} H${shape.x} Z`;
  }

  override getConnectionPath(connection: any): string {
    const points = connection.waypoints;
    return `M${points[0].x},${points[0].y}` + points.slice(1).map((p: any) => ` L${p.x},${p.y}`).join('');
  }
}
