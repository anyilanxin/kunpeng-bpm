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
 * DMN 渲染器。记法对齐 DMN 1.6 §6.2.1/§6.2.2 文字条款（形状见 render/Symbols，
 * 连线线型/端头见各类型注释）；颜色/字号为自有主题，可经 `config.dmnRenderer`
 * 覆盖，亦可整体替换本服务（插件位）。
 *
 * 坐标契约：getShapePath/getConnectionPath 输出**世界坐标**（diagram-js 命中区/
 * 选中圈/连线裁剪共同消费）；绘制一律以元素原点 (0,0) 起画（gfx 组自带 translate）。
 */
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type TextUtil from 'diagram-js/lib/util/Text';
import { append, attr, create } from 'tiny-svg';
import type { DmnElementTypes } from '../meta/ElementTypes';
import { getBusinessObject, getLabel } from '../util/ModelUtil';
import {
  appendCircleHead,
  appendFilledArrow,
  appendOpenArrow,
  DASH_ASSOCIATION,
  DASH_REQUIREMENT,
  drawAnnotationBracket,
  drawBkmShape,
  drawDecisionServiceShape,
  drawDecisionShape,
  drawInputDataShape,
  drawKnowledgeSourceShape,
  LINE_WIDTH,
  type StyleTheme
} from './Symbols';

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

/** 形内名字字体（12px 与注册表尺寸体系同源：两行名字是尺寸设计的输入） */
const INTERNAL_FONT = { fontFamily: 'system-ui, "PingFang SC", sans-serif', fontSize: 12 } as const;

/**
 * 连线末端（线段终点+端头尖端）相对末端锚线的后退量：目标形状描边以锚线为
 * 中心向内外各延半宽（1.5px 描边 → 描带整宽 1.5），末端停在锚线会与目标描
 * 带融合、可见长度被吞；后退让末端停在描带之外，与描边零重叠。
 */
const TIP_RETREAT = 2;

const SHAPE_PAINTERS: Record<string, (v: SVGElement, s: any, t: StyleTheme) => void> = {
  'dmn:Decision': drawDecisionShape,
  'dmn:BusinessKnowledgeModel': drawBkmShape,
  'dmn:InputData': drawInputDataShape,
  'dmn:KnowledgeSource': drawKnowledgeSourceShape,
  'dmn:DecisionService': drawDecisionServiceShape,
  'dmn:TextAnnotation': (v, s, t) => drawAnnotationBracket(v, s, t)
};

export class DmnRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'dmnElementTypes', 'textRenderer', 'config.dmnRenderer'];

  private readonly config: Required<DmnRendererConfig>;

  constructor(
    eventBus: EventBus,
    private readonly elementTypes: DmnElementTypes,
    private readonly textUtil: TextUtil,
    rendererConfig: DmnRendererConfig
  ) {
    // 急切注册（__init__ 装配）：BaseRenderer 仅构造时向 eventBus 注册
    super(eventBus, 2);
    this.config = { ...DEFAULT_CONFIG, ...rendererConfig };
  }

  private get theme(): StyleTheme {
    return {
      stroke: this.config.defaultStrokeColor,
      fill: this.config.defaultFillColor,
      labelColor: this.config.labelColor
    };
  }

  override canRender(element: any): boolean {
    const bo = getBusinessObject(element);
    const type = bo?.$type ?? element.type;
    if (!type) return false;
    if (element.waypoints) {
      return this.elementTypes.isRequirementType(type) || type === 'dmn:Association';
    }
    return type === 'dmn:Definitions' ? false : !!SHAPE_PAINTERS[type];
  }

  override drawShape(visuals: SVGElement, shape: any): SVGElement {
    const bo = getBusinessObject(shape);
    const type = bo?.$type ?? shape.type;
    SHAPE_PAINTERS[type]?.(visuals, shape, this.theme);
    this.drawName(visuals, shape, type);
    return visuals;
  }

  override drawConnection(visuals: SVGElement, connection: any): SVGElement {
    const type = getBusinessObject(connection)?.$type ?? connection.type;
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
      d: toPath(linePoints),
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

  override getShapePath(shape: any): string {
    // 世界坐标包围盒 path（命中/轮廓用）：DMN 各形状的视觉命中差异（切角/胶囊/
    // 波浪底）相对包围盒的让出量 ≤ 20px，按包围盒取命中区偏保守（多命中不漏
    // 命中），换取实现零分叉
    const { x, y, width: w, height: h } = shape;
    return `M${x},${y} h${w} v${h} h${-w} Z`;
  }

  override getConnectionPath(connection: any): string {
    return toPath(connection.waypoints);
  }

  /**
   * 形内名字（规范 §6.2.1 "Name MUST be displayed inside the shape"）：
   * 形状扣除描边/括号余量后的内容盒居中；注记左上（括号右侧起排）。
   */
  private drawName(visuals: SVGElement, shape: any, type: string): void {
    const text = getLabel(shape);
    if (!text) {
      return;
    }
    // 决策服务名字放分割线下方左上（顶带留给输出决策；规范未定名字位，
    // 自有设计避开顶带遮挡）
    if (type === 'dmn:DecisionService') {
      const dividerY = shape.dividerY ?? 90;
      const serviceText = this.textUtil.createText(text, {
        box: { width: shape.width - 16, height: 18 } as any,
        align: 'left-top' as any,
        style: { ...INTERNAL_FONT, fill: this.config.labelColor },
        padding: 0
      });
      attr(serviceText, { 'data-label': 'internal', transform: `translate(8 ${dividerY + 4})` });
      append(visuals, serviceText);
      return;
    }
    const isAnnotation = type === 'dmn:TextAnnotation';
    const box = isAnnotation
      ? { x: 18, y: 4, width: shape.width - 24, height: shape.height - 8 }
      : { x: 5, y: 3, width: shape.width - 10, height: shape.height - 6 };
    const el = this.textUtil.createText(text, {
      box: { width: box.width, height: box.height } as any,
      align: (isAnnotation ? 'left-top' : 'center-middle') as any,
      style: { ...INTERNAL_FONT, fill: this.config.labelColor },
      padding: 2
    });
    attr(el, { 'data-label': 'internal', transform: `translate(${box.x} ${box.y})` });
    append(visuals, el);
  }
}

function toPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}
