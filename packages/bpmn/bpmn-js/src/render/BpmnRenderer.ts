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
 * BPMN 渲染器。
 *
 * 记法对齐规范文字描述（线型/线宽/标记位见各分支注释）；颜色/字号为自有主题，
 * 可经 `config.bpmnRenderer` 覆盖，亦可整体替换本服务（插件位）。
 *
 * 坐标契约：getShapePath 必须输出**世界坐标**（diagram-js 命中区/选中圈/连线裁剪共同消费）。
 */
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import type EventBus from 'diagram-js/lib/core/EventBus';
import type TextUtil from 'diagram-js/lib/util/Text';
import { append, attr, classes as svgClasses, create } from 'tiny-svg';
import type { BpmnElementTypes } from '../meta/ElementTypes';
import { EventDefinitions } from '../meta/EventDefinitions';
import {
  drawEventSymbol,
  drawGatewayMarker,
  drawGatewayShape,
  drawTaskMarker,
  drawDataObjectShape,
  drawDataStoreShape,
  drawAnnotationBracket,
  drawTransactionBorder,
  drawActivityMarkerRow,
  diamondPath
} from './Symbols';
import { loopKindOf } from '../meta/LoopCharacteristics';
import {
  internalLabelBox,
  EXTERNAL_FONT,
  INTERNAL_FONT
} from '../label/LabelGeometry';
import { SIZES } from '../meta/ElementTypes';

export interface BpmnRendererConfig {
  defaultStrokeColor?: string;
  defaultFillColor?: string;
  labelColor?: string;
}

const DEFAULT_CONFIG: Required<BpmnRendererConfig> = {
  defaultStrokeColor: '#000000',
  defaultFillColor: '#ffffff',
  labelColor: '#000000'
};

/**
 * 箭头尺寸（自有取值）：比例取自 icons/bpmn-icon-connection.svg 头部——顶点到
 * 翼底轴向长 18.5、垂直半宽 6.1，长:半宽≈3:1；映射画布取长 12px（翼长）×
 * 半宽 4px，半角 atan(4/12)≈0.32rad——工具图标与画布箭头同一形态语言
 */
const ARROW_W = 12;
const ARROW_HALF_ANGLE = 0.32;
/**
 * 连线末端（线段终点+箭头尖端）相对末端锚线的后退量（自有取值）：目标形状
 * 描边以锚线为中心向内外各延半宽（2px 描边 → 描带整宽 2），末端停在锚线会
 * 与目标描带融合、可见长度被吞，且连线与目标的图层顺序在创建后/移动后不同
 * 会造成尖端形态漂移；整条描带宽后退让末端停在描带之外，与描边零重叠、两
 * 种图层顺序渲染一致。线段终点与箭头尖端必须共用同一后退点——只退其一会
 * 让另一方伸进留出的缝隙
 */
const ARROW_TIP_RETREAT = 2;

/** 连线拐角圆角半径（对齐用户规格样例 data-corner-radius="5"） */
const CORNER_RADIUS = 5;

/** 折线 → 圆角 path：每个中间航点沿两侧各退 r（不超过半段长）后以 Q(拐点) 圆滑衔接 */
function roundedPath(points: any[], r: number): string {
  const n = points.length;
  if (n < 3) {
    return `M${points[0].x},${points[0].y} L${points[n - 1].x},${points[n - 1].y}`;
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < n - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const lenIn = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const lenOut = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (lenIn === 0 || lenOut === 0) {
      d += ` L${p1.x},${p1.y}`;
      continue;
    }
    const rr = Math.min(r, lenIn / 2, lenOut / 2);
    const inPt = { x: p1.x + ((p0.x - p1.x) / lenIn) * rr, y: p1.y + ((p0.y - p1.y) / lenIn) * rr };
    const outPt = { x: p1.x + ((p2.x - p1.x) / lenOut) * rr, y: p1.y + ((p2.y - p1.y) / lenOut) * rr };
    d += ` L${inPt.x},${inPt.y} Q${p1.x},${p1.y} ${outPt.x},${outPt.y}`;
  }
  d += ` L${points[n - 1].x},${points[n - 1].y}`;
  return d;
}

export class BpmnRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'bpmnElementTypes', 'textRenderer', 'config.bpmnRenderer', 'orientationService'];

  constructor(
    eventBus: EventBus,
    private readonly elementTypes: BpmnElementTypes,
    private readonly textUtil: TextUtil,
    rendererConfig: BpmnRendererConfig,
    private readonly orientationService: { isHorizontal(): boolean }
  ) {
    super(eventBus, 2);
    this.config = { ...DEFAULT_CONFIG, ...rendererConfig };
  }

  private config: Required<BpmnRendererConfig>;

  /** 元素级主题：bioc 颜色（element.colors，DI 扩展往返）优先于全局缺省 */
  private themeFor(element: any) {
    const colors = element?.colors;
    if (!colors?.fill && !colors?.stroke) {
      return {
        stroke: this.config.defaultStrokeColor,
        fill: this.config.defaultFillColor,
        labelColor: this.config.labelColor
      };
    }
    return {
      stroke: colors.stroke ?? this.config.defaultStrokeColor,
      fill: colors.fill ?? this.config.defaultFillColor,
      labelColor: this.config.labelColor
    };
  }

  override canRender(element: any): boolean {
    return !!element.businessObject?.$type?.startsWith('bpmn:');
  }

  override drawShape(visuals: SVGElement, shape: any): SVGElement {
    // 独立标签元素（diagram-js 标签原语，可选中/拖动/直编）：只画文字，
    // 几何即元素框（原点 0,0 起画，gfx 组自带 translate）
    if (shape.labelTarget) {
      this.drawLabel(visuals, shape);
      return visuals;
    }
    const bo = shape.businessObject;
    const type = bo.$type;
    const theme = this.themeFor(shape);

    switch (true) {
      case type.endsWith('Event'):
        this.drawEvent(visuals, shape, theme);
        break;
      case type.endsWith('Gateway'):
        this.drawGateway(visuals, shape, theme);
        break;
      case type === 'bpmn:Participant':
        this.drawParticipant(visuals, shape, theme);
        break;
      case type === 'bpmn:Lane':
        this.drawLane(visuals, shape, theme);
        break;
      case type === 'bpmn:SubProcess':
        this.drawSubProcess(visuals, shape, theme);
        break;
      case type === 'bpmn:Transaction':
        // 事务子流程（规范 §10.5.6）：双线边框；标记行（补偿/循环）同活动族
        drawTransactionBorder(visuals, shape, theme);
        drawActivityMarkerRow(visuals, shape, {
          loop: loopKindOf(bo) ?? undefined,
          compensation: bo.forCompensation === true
        }, theme);
        this.drawInternalLabel(visuals, shape, 'top');
        break;
      case type === 'bpmn:AdHocSubProcess':
        // Ad-hoc 子流程（规范 §10.5.5）：普通圆角盒 + 底部波浪号标记
        this.drawRoundedBox(visuals, shape, theme, 2);
        drawActivityMarkerRow(visuals, shape, {
          loop: loopKindOf(bo) ?? undefined,
          compensation: bo.forCompensation === true,
          adHoc: true
        }, theme);
        this.drawInternalLabel(visuals, shape, 'top');
        break;
      case type === 'bpmn:CallActivity':
        // 规范 §10.2.3：调用活动=加粗边框（取 4：与结束事件粗环同重，边框即"调用"语义）
        this.drawRoundedBox(visuals, shape, theme, 4);
        drawActivityMarkerRow(visuals, shape, {
          loop: loopKindOf(bo) ?? undefined,
          compensation: bo.forCompensation === true
        }, theme);
        this.drawInternalLabel(visuals, shape);
        break;
      case type === 'bpmn:DataObjectReference':
        drawDataObjectShape(visuals, shape, theme);
        break;
      case type === 'bpmn:DataStoreReference':
        drawDataStoreShape(visuals, shape, theme);
        break;
      case type === 'bpmn:TextAnnotation':
        drawAnnotationBracket(visuals, shape, theme);
        this.drawAnnotationText(visuals, shape);
        break;
      case type === 'bpmn:Group':
        this.drawGroup(visuals, shape, theme);
        break;
      default:
        // 任务族
        this.drawRoundedBox(visuals, shape, theme, 2);
        const meta = this.elementTypes.shapeMeta(type);
        if (meta?.symbol) {
          drawTaskMarker(visuals, meta.symbol, shape, theme);
        }
        drawActivityMarkerRow(visuals, shape, {
          loop: loopKindOf(bo) ?? undefined,
          compensation: bo.forCompensation === true
        }, theme);
        this.drawInternalLabel(visuals, shape);
        break;
    }
    return visuals;
  }

  override drawConnection(visuals: SVGElement, connection: any): SVGElement {
    const bo = connection.businessObject;
    const stroke = connection.colors?.stroke ?? this.config.defaultStrokeColor;
    const points = connection.waypoints;
    const last = points[points.length - 1];
    const prev = points[points.length - 2] ?? last;

    // 带末端箭头的类型：线段终点与箭头尖端一起后退（避开目标描边带）
    const hasArrow =
      bo.$type === 'bpmn:SequenceFlow' ||
      bo.$type === 'bpmn:MessageFlow' ||
      bo.$type === 'bpmn:DataInputAssociation' ||
      bo.$type === 'bpmn:DataOutputAssociation';
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    const tip = hasArrow
      ? {
          x: last.x - ARROW_TIP_RETREAT * Math.cos(angle),
          y: last.y - ARROW_TIP_RETREAT * Math.sin(angle)
        }
      : last;
    const linePoints = hasArrow ? [...points.slice(0, -1), tip] : points;

    const line = create('path');
    const attrs: Record<string, string | number> = {
      d: roundedPath(linePoints, CORNER_RADIUS),
      fill: 'none',
      stroke,
      'stroke-width': 1.5,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round'
    };
    switch (bo.$type) {
      case 'bpmn:MessageFlow':
        attrs['stroke-dasharray'] = '7 5';
        break;
      case 'bpmn:Association':
        attrs['stroke-dasharray'] = '1.5 4';
        attrs['stroke-linecap'] = 'round';
        break;
      case 'bpmn:DataInputAssociation':
      case 'bpmn:DataOutputAssociation':
        attrs['stroke-dasharray'] = '6 4';
        break;
      default:
        break;
    }
    attr(line, attrs);
    append(visuals, line);

    switch (bo.$type) {
      case 'bpmn:MessageFlow':
        this.appendOpenArrow(visuals, prev, tip, stroke);
        this.appendSourceCircle(visuals, points[0], stroke);
        break;
      case 'bpmn:DataInputAssociation':
      case 'bpmn:DataOutputAssociation':
        this.appendOpenArrow(visuals, prev, tip, stroke);
        break;
      case 'bpmn:SequenceFlow':
        this.appendFilledArrow(visuals, prev, tip, stroke);
        // 条件流菱形（规范 §10.5.1）：条件表达式存在且源非网关（网关出线本身
        // 即条件分支语境，规范示例不加菱形）；默认流（斜杠）优先不叠加
        // 默认流判定：源元素 default 属性指向本流（XSD 契约；无独立标志位）
        const sourceDefault = bo.sourceRef?.default;
        const isDefaultFlow = sourceDefault === bo || sourceDefault?.id === bo.id;
        if (bo.conditionExpression && !isDefaultFlow && !bo.sourceRef?.$type?.endsWith('Gateway')) {
          this.appendDiamondMarker(visuals, points[0], points[1] ?? points[0], stroke);
        }
        if (isDefaultFlow) {
          this.appendSlashMarker(visuals, points[0], points[1] ?? points[0], stroke);
        }
        break;
      default:
        break;
    }

    return visuals;
  }

  override getShapePath(shape: any): string {
    const type = shape.businessObject?.$type ?? shape.type;
    if (type?.endsWith('Event')) {
      return circlePath(
        shape.x + shape.width / 2,
        shape.y + shape.height / 2,
        shape.width / 2
      );
    }
    if (type?.endsWith('Gateway')) {
      return diamondPath(
        shape.x + shape.width / 2,
        shape.y + shape.height / 2,
        shape.width / 2,
        shape.height / 2
      );
    }
    return rectPath(shape.x, shape.y, shape.width, shape.height);
  }

  override getConnectionPath(connection: any): string {
    const waypoints = connection.waypoints;
    return waypoints
      .map((p: any, i: number) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
      .join(' ');
  }

  // ---------------- 形状 ----------------

  private drawEvent(visuals: SVGElement, shape: any, theme: any): void {
    const bo = shape.businessObject;
    // 局部坐标（0,0 = 元素原点）：gfx 组已带 translate(x,y)，勿再加绝对坐标
    const cx = shape.width / 2;
    const cy = shape.height / 2;
    const r = shape.width / 2;
    const type = bo.$type;

    // 非中断（规范 §10.5.2/Table 10.86）：边界 cancelActivity=false、
    // 事件子流程内开始 isInterrupting=false —— 外环虚线
    const nonInterrupting =
      type === 'bpmn:BoundaryEvent' ? bo.cancelActivity === false
        : type === 'bpmn:StartEvent' ? bo.isInterrupting === false
          : false;

    // 规范线型：开始=细单线；中间/边界=细双线；结束=粗单线。
    // 非中断 dash=6/4（36px 外圈周长约 113px，周期 10px 得约 11 个划段——
    // 处于人眼最易分辨的段数区间，划隔比 1.5 与分组虚线/数据关联线笔语言
    // 一致；过密（如 3.5/3.5 约 16 段）在常规缩放下近似实线无法区分中断
    // 形态——自有取值）
    const strokeW = type === 'bpmn:EndEvent' ? 4 : 2;
    const circleEl = create('circle');
    attr(circleEl, {
      cx, cy, r, fill: theme.fill, stroke: theme.stroke, 'stroke-width': strokeW,
      ...(nonInterrupting ? { 'stroke-dasharray': '6 4' } : {})
    });
    append(visuals, circleEl);
    // 中间/边界事件=双环（规范 §10.5.2），内环 r-4：等比图标库双环几何
    // （32 视窗外环带 [15.1,16.6]/内环带 [11.7,13.5]，映射 38px 事件即 r 与
    // r-4、缝约 2px）；非中断双环同为虚线（图标库非中断记法实测=两族各 7
    // 段虚线弧 r≈15.2/11.9，即"双虚线环"而非单虚线环）
    const hasInner =
      type === 'bpmn:IntermediateCatchEvent' || type === 'bpmn:IntermediateThrowEvent' || type === 'bpmn:BoundaryEvent';
    if (hasInner) {
      const inner = create('circle');
      attr(inner, {
        cx, cy, r: r - 4, fill: 'none', stroke: theme.stroke, 'stroke-width': 2,
        ...(nonInterrupting ? { 'stroke-dasharray': '6 4' } : {})
      });
      append(visuals, inner);
    }

    const symbol = EventDefinitions.symbolOf(bo);
    if (symbol) {
      // 抛出语义（规范 §10.3 抛出=实心）：结束事件与中间抛出事件取实心字形变体
      const throwSemantics = type === 'bpmn:EndEvent' || type === 'bpmn:IntermediateThrowEvent';
      // 符号基准：双环事件（中间/边界）符号墨迹按图标库等比并放大一档
      // （用户观感基准"几乎填满中心圆、留一小点间隙"）——iconSetGlyph 的
      // box 为字形全边长，r+1 经各符号 BOX（0.95~1.07）后墨迹半宽落内环
      // 的 0.62~0.71，与内环内缘仍留 ≥3px 缝；单环事件（开始/结束）
      // 维持 r-4
      const symbolR = hasInner ? r + 1 : r - 4;
      drawEventSymbol(visuals, symbol, cx, cy, symbolR, theme, throwSemantics);
    }
  }

  private drawGateway(visuals: SVGElement, shape: any, theme: any): void {
    const bo = shape.businessObject;
    const cx = shape.width / 2;
    const cy = shape.height / 2;
    const hw = shape.width / 2;
    drawGatewayShape(visuals, shape.width, shape.height, theme);

    let marker: string | null = null;
    if (bo.$type === 'bpmn:ExclusiveGateway') {
      marker = bo.isMarkerVisible === false ? null : 'exclusive';
    } else if (bo.$type === 'bpmn:ParallelGateway') {
      marker = 'parallel';
    } else if (bo.$type === 'bpmn:InclusiveGateway') {
      marker = 'inclusive';
    } else if (bo.$type === 'bpmn:ComplexGateway') {
      marker = 'complex';
    } else if (bo.$type === 'bpmn:EventBasedGateway') {
      // 实例化变体（规范 §10.6.6）：instantiate 标记=多实例开始事件（五边形）；
      // eventGatewayType=Parallel 为并行事件网关（开口加号）
      if (bo.instantiate === true) {
        marker = bo.eventGatewayType === 'Parallel' ? 'eventBasedParallel' : 'eventBasedInstantiate';
      } else {
        marker = 'eventBased';
      }
    }
    if (marker) {
      drawGatewayMarker(visuals, marker, cx, cy, hw * 0.72, theme);
    }
  }

  private drawRoundedBox(visuals: SVGElement, shape: any, theme: any, strokeWidth: number): void {
    const radius = 9; // 自有取值：任务盒圆角 9 ≈ 高度的 1/9，接近规范示例比例
    const rect = create('rect');
    attr(rect, {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      rx: radius,
      ry: radius,
      fill: theme.fill,
      stroke: theme.stroke,
      'stroke-width': strokeWidth
    });
    append(visuals, rect);
  }

  private drawSubProcess(visuals: SVGElement, shape: any, theme: any): void {
    const bo = shape.businessObject;
    const loopKind = loopKindOf(bo);
    if (bo.triggeredByEvent) {
      // 事件子流程（规范 §10.5.4）：虚线边框（短划风格同分组记法，自有取值 7:5）
      const rect = create('rect');
      attr(rect, {
        x: 0, y: 0, width: shape.width, height: shape.height,
        rx: 9, ry: 9,
        fill: theme.fill, stroke: theme.stroke, 'stroke-width': 2,
        'stroke-dasharray': '7 5'
      });
      append(visuals, rect);
    } else {
      this.drawRoundedBox(visuals, shape, theme, 2);
    }
    drawActivityMarkerRow(visuals, shape, {
      loop: loopKind ?? undefined,
      compensation: bo.forCompensation === true,
      collapsed: shape.isExpanded === false
    }, theme);
    this.drawInternalLabel(visuals, shape, shape.isExpanded === false ? 'middle' : 'top');
  }

  private drawParticipant(visuals: SVGElement, shape: any, theme: any): void {
    const horizontal = this.orientationService.isHorizontal();
    const rect = create('rect');
    attr(rect, {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      // 池体实底：内容区遮住画布网格（与业界设计器一致，头带同色靠分隔线区分）
      fill: theme.fill,
      stroke: theme.stroke,
      'stroke-width': 2
    });
    append(visuals, rect);

    // 头带（规范：池标签带；水平池=左端竖带，垂直池=顶端横带）
    const band = create('rect');
    attr(band, horizontal
      ? { x: 0, y: 0, width: SIZES.POOL_HEADER, height: shape.height }
      : { x: 0, y: 0, width: shape.width, height: SIZES.POOL_HEADER });
    attr(band, { fill: theme.fill, stroke: theme.stroke, 'stroke-width': 2 });
    append(visuals, band);

    if (horizontal) {
      this.drawRotatedLabel(visuals, shape, SIZES.POOL_HEADER);
    } else {
      // 垂直池：顶带内水平标签
      this.drawInternalLabel(visuals, shape, 'top');
    }
  }

  private drawLane(visuals: SVGElement, shape: any, theme: any): void {
    const rect = create('rect');
    attr(rect, {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      // 道体实底（同池体）：内容区不透网格，色板着色时道体随之变色
      fill: theme.fill,
      stroke: theme.stroke,
      'stroke-width': 1.5
    });
    append(visuals, rect);
    if (this.orientationService.isHorizontal()) {
      this.drawRotatedLabel(visuals, shape, 28);
    } else {
      // 垂直泳道：顶部水平标签（泳道不画带分隔线，仅自身边框）
      this.drawInternalLabel(visuals, shape, 'top');
    }
  }

  private drawGroup(visuals: SVGElement, shape: any, theme: any): void {
    const rect = create('rect');
    attr(rect, {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      rx: 8,
      ry: 8,
      fill: 'none',
      stroke: theme.stroke,
      'stroke-width': 2,
      'stroke-dasharray': '7 5'
    });
    append(visuals, rect);
  }

  // ---------------- 标签 ----------------

  private drawInternalLabel(visuals: SVGElement, shape: any, mode: 'middle' | 'top' = 'middle'): void {
    const text = shape.businessObject?.name;
    if (!text) {
      return;
    }
    const box = mode === 'top'
      ? { x: 8, y: 6, width: shape.width - 16, height: 26 }
      : internalLabelBox(shape);
    const el = this.textUtil.createText(text, {
      box: { width: box.width, height: box.height } as any,
      align: (mode === 'top' ? 'left-top' : 'center-middle') as any,
      style: { ...INTERNAL_FONT, fill: this.config.labelColor },
      padding: 2
    });
    attr(el, { 'data-label': 'internal', transform: `translate(${box.x} ${box.y})` });
    append(visuals, el);
  }

  /** 独立标签元素：只画文字（几何=元素框，宿主移动/删除由 LabelSupport 跟随） */
  private drawLabel(visuals: SVGElement, label: any): void {
    const text = label.businessObject?.name;
    if (!text) {
      return;
    }
    const el = this.textUtil.createText(text, {
      box: { width: label.width, height: label.height } as any,
      align: 'center-top',
      style: { ...EXTERNAL_FONT, fill: this.config.labelColor },
      padding: 0
    });
    attr(el, { 'data-label': 'element' });
    append(visuals, el);
  }

  private drawAnnotationText(visuals: SVGElement, shape: any): void {
    const text = shape.businessObject?.text;
    if (!text) {
      return;
    }
    // 文字起点 x=8 紧贴左括号横勾（10px）内侧——对齐用户参考规格样例
    const box = { x: 8, y: 4, width: shape.width - 12, height: shape.height - 8 };
    const el = this.textUtil.createText(text, {
      box: { width: box.width, height: box.height } as any,
      align: 'left-top' as any,
      style: { ...EXTERNAL_FONT, fill: this.config.labelColor },
      padding: 2
    });
    attr(el, { transform: `translate(${box.x} ${box.y})` });
    append(visuals, el);
  }

  /** 池/泳道竖排标签（-90° 旋转） */
  private drawRotatedLabel(visuals: SVGElement, shape: any, bandWidth: number): void {
    const text = shape.businessObject?.name;
    if (!text) {
      return;
    }
    const cx = bandWidth / 2;
    const cy = shape.height / 2;
    const labelWidth = shape.height - 12;
    const el = this.textUtil.createText(text, {
      box: { width: labelWidth, height: bandWidth } as any,
      align: 'center-middle',
      style: { ...INTERNAL_FONT, fill: this.config.labelColor },
      padding: 0
    });
    const g = create('g');
    attr(g, { transform: `translate(${cx} ${cy}) rotate(-90) translate(${-labelWidth / 2} ${-bandWidth / 2})` });
    append(g, el);
    append(visuals, g);
  }

  // ---------------- 连线端点装饰 ----------------

  private appendFilledArrow(visuals: SVGElement, from: any, to: any, stroke: string): void {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const a1 = angle + Math.PI - ARROW_HALF_ANGLE;
    const a2 = angle + Math.PI + ARROW_HALF_ANGLE;
    const p1 = { x: to.x + ARROW_W * Math.cos(a1), y: to.y + ARROW_W * Math.sin(a1) };
    const p2 = { x: to.x + ARROW_W * Math.cos(a2), y: to.y + ARROW_W * Math.sin(a2) };
    const arrow = create('path');
    attr(arrow, {
      d: `M${to.x},${to.y} L${p1.x},${p1.y} L${p2.x},${p2.y} Z`,
      fill: stroke,
      stroke: stroke
    });
    // 拖拽连线预览容器（.djs-dragger）的影子样式会把全部图形 fill 压成 none，
    // 实心箭头将被线框化而误传「空心箭头 = 消息流/数据关联」的类型信号；
    // 语义 class 供组件样式恢复填充（见 src/styles/bpmn-js.css）
    svgClasses(arrow).add('bpmn-arrow-filled');
    append(visuals, arrow);
  }

  private appendOpenArrow(visuals: SVGElement, from: any, to: any, stroke: string): void {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const a1 = angle + Math.PI - ARROW_HALF_ANGLE;
    const a2 = angle + Math.PI + ARROW_HALF_ANGLE;
    const p1 = { x: to.x + ARROW_W * Math.cos(a1), y: to.y + ARROW_W * Math.sin(a1) };
    const p2 = { x: to.x + ARROW_W * Math.cos(a2), y: to.y + ARROW_W * Math.sin(a2) };
    const arrow = create('path');
    attr(arrow, {
      d: `M${p1.x},${p1.y} L${to.x},${to.y} L${p2.x},${p2.y}`,
      fill: 'none',
      stroke,
      'stroke-width': 1.5
    });
    append(visuals, arrow);
  }

  private appendSourceCircle(visuals: SVGElement, at: any, stroke: string): void {
    const c = create('circle');
    attr(c, { cx: at.x, cy: at.y, r: 4.5, fill: 'none', stroke, 'stroke-width': 1.5 });
    append(visuals, c);
  }

  /** 默认流：源端斜杠标记（规范 §10.5.2） */
  private appendSlashMarker(visuals: SVGElement, at: any, next: any, stroke: string): void {
    const angle = Math.atan2(next.y - at.y, next.x - at.x);
    const dx = Math.cos(angle + Math.PI / 2);
    const dy = Math.sin(angle + Math.PI / 2);
    const l = create('line');
    attr(l, {
      x1: at.x + dx * 9 - Math.cos(angle) * 4,
      y1: at.y + dy * 9 - Math.sin(angle) * 4,
      x2: at.x - dx * 9 + Math.cos(angle) * 4,
      y2: at.y - dy * 9 + Math.sin(angle) * 4,
      stroke,
      'stroke-width': 1.5
    });
    append(visuals, l);
  }

  /** 条件流：源端菱形标记（规范 §10.5.1） */
  private appendDiamondMarker(visuals: SVGElement, at: any, next: any, stroke: string): void {
    const angle = Math.atan2(next.y - at.y, next.x - at.x);
    const cx = at.x + Math.cos(angle) * 9;
    const cy = at.y + Math.sin(angle) * 9;
    const d = create('path');
    attr(d, {
      d: diamondPath(cx, cy, 6, 6),
      fill: this.config.defaultFillColor,
      stroke,
      'stroke-width': 1.5
    });
    append(visuals, d);
  }
}

// ---------------- 路径工具（世界坐标） ----------------

export function rectPath(x: number, y: number, width: number, height: number): string {
  return `M${x},${y} h${width} v${height} h${-width} Z`;
}

export function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0 Z`;
}
