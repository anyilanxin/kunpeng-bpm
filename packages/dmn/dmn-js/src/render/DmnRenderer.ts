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
 * DMN 渲染器（用户定规 2026-10-26：**画布图形由资产 SVG 生成**）：四 DRG
 * 形状轮廓=dmnicons 资产外圈子路径（逐字节）拉伸进元素边界（bpmn 线
 * marker 同法——不改写控制点，只变换定位）；DS/注记保持记法参数绘制
 * （无对应资产）；名字形内居中（规范 §6.2.1）；可下钻元素左上角角标由
 * DrillBadge 的 overlays 承担（渲染层零下钻逻辑）。
 */
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type TextUtil from 'diagram-js/lib/util/Text';
import { append, attr, create } from 'tiny-svg';
import { SIZES } from '../meta/ElementTypes';
import { SHAPE_OUTLINES, type ShapeOutlineName } from '../icons/DmnIconSet';
import {
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

export class DmnRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'textRenderer', 'config.dmnRenderer', 'elementRegistry', 'graphicsFactory'];

  constructor(
    eventBus: EventBus,
    private readonly textUtil: TextUtil,
    config: DmnRendererConfig,
    private readonly elementRegistry: any,
    private readonly graphicsFactory: any
  ) {
    super(eventBus, 1500);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.defaultTheme = Object.freeze({
      stroke: this.config.defaultStrokeColor,
      fill: this.config.defaultFillColor,
      labelColor: this.config.labelColor
    });
  }

  private config: Required<DmnRendererConfig>;

  /** 缺省主题冻结缓存（theme() 热路径零分配） */
  private defaultTheme: Readonly<StyleTheme>;

  /**
   * 运行期主题切换（暗色模式，对齐 bpmn 线 BpmnRenderer.setTheme 契约）：
   * 合并覆盖缺省并全量重绘。缺省主题不写 DI/XML——导出无痕。
   */
  setTheme(overrides: DmnRendererConfig): void {
    this.config = { ...this.config, ...overrides };
    this.defaultTheme = Object.freeze({
      stroke: this.config.defaultStrokeColor,
      fill: this.config.defaultFillColor,
      labelColor: this.config.labelColor
    });
    for (const element of this.elementRegistry.getAll()) {
      this.graphicsFactory.update(
        element.waypoints ? 'connection' : 'shape',
        element,
        this.elementRegistry.getGraphics(element)
      );
    }
  }

  override canRender(element: any): boolean {
    const type = element.businessObject?.$type ?? element.type;
    return typeof type === 'string' && type.startsWith('dmn:');
  }

  override drawShape(visuals: SVGElement, shape: any): SVGElement {
    const type = shape.businessObject?.$type ?? shape.type;
    const theme = this.themeFor(shape);
    switch (type) {
      case 'dmn:Decision':
        this.drawAssetShape(visuals, 'decision', shape.width, shape.height, theme);
        break;
      case 'dmn:BusinessKnowledgeModel':
        this.drawAssetShape(visuals, 'business-knowledge', shape.width, shape.height, theme);
        break;
      case 'dmn:InputData':
        this.drawAssetShape(visuals, 'input-data', shape.width, shape.height, theme);
        break;
      case 'dmn:KnowledgeSource':
        this.drawAssetShape(visuals, 'knowledge-source', shape.width, shape.height, theme);
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
      default: {
        // 未登记形状按平边矩形兜位（不 fuchsia：未知类型至少可见可选中）
        const rect = create('rect');
        attr(rect, {
          x: 0,
          y: 0,
          width: shape.width,
          height: shape.height,
          fill: theme.fill,
          stroke: theme.stroke,
          'stroke-width': LINE_WIDTH
        });
        append(visuals, rect);
      }
    }
    this.drawName(visuals, shape, type);
    return visuals;
  }

  /**
   * 资产外轮廓直生（画布=图标同形）：内容盒等比映射进元素边界——
   * transform 链右起：内容盒平移到原点 → 非等比缩放到 (w,h)。描边取
   * 平均尺度补偿（横/纵回归基准厚；残差=元素宽高比偏离资产比的度，
   * 默认尺寸 ±20% 内不可辨），随画布缩放语义与其余图形一致。
   */
  private drawAssetShape(
    visuals: SVGElement,
    name: ShapeOutlineName,
    w: number,
    h: number,
    theme: StyleTheme
  ): void {
    const o = SHAPE_OUTLINES[name];
    const sx = w / o.w;
    const sy = h / o.h;
    const path = create('path');
    attr(path, {
      d: o.d,
      fill: theme.fill,
      stroke: theme.stroke,
      'stroke-width': (LINE_WIDTH * 2) / (sx + sy),
      'stroke-linejoin': 'round',
      transform: `scale(${sx} ${sy}) translate(${-o.x} ${-o.y})`
    });
    append(visuals, path);
  }

  override drawConnection(visuals: SVGElement, connection: any): SVGElement {
    const type = connection.businessObject?.$type ?? connection.type;
    const stroke = this.themeFor(connection).stroke;
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
      style: { fontFamily: 'system-ui, "PingFang SC", sans-serif', fontSize: 12, fill: this.theme().labelColor },
      padding: 2
    });
    attr(el, { transform: `translate(${box.x} ${box.y})` });
    append(visuals, el);
  }

  // 下钻角标不走渲染层：DrillBadgeBehavior 以 overlays 挂 DOM 按钮（原生
  // 点击不进画布事件链，移动/删除跟随由 Overlays 基座承担）

  private theme(): Readonly<StyleTheme> {
    return this.defaultTheme;
  }

  /** 元素级主题：bioc 颜色（element.colors，DI 扩展往返）优先于全局缺省；
   * 无元素色返回冻结缺省（热路径零分配）。形内文字色恒走全局（对齐 bpmn 线：
   * 形内标签不随元素色） */
  private themeFor(element: any): Readonly<StyleTheme> {
    const colors = element?.colors;
    if (!colors?.fill && !colors?.stroke) {
      return this.defaultTheme;
    }
    return {
      stroke: colors.stroke ?? this.config.defaultStrokeColor,
      fill: colors.fill ?? this.config.defaultFillColor,
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
