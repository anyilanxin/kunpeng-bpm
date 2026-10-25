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
 * 工具与动作图标（palette 工具区与 context pad 动作钮共用，18 网格）。
 *
 * 图标基准=标准图标集（icons/IconSet）：集合已确认的动作图标（抓手/套索/
 * 空间/连线/扳手/垃圾桶）直接内嵌集合 path（1026 坐标系经 scale 进 18 视框，
 * 用户指认文件见 IconSet 各条目注释）；集合未覆盖的（泳道系/折叠钮/更多/
 * 创建）保留自有设计；泳道系：横带 + 头带刻线，插入方向用 + 号位置表达；
 * 子流程折叠钮：盒内 +/-（规范折叠标记语义）。
 */
import { iconSetAsset } from './IconSet';
import { svgShell, entryShell } from './shell';

const S = 'fill="none" stroke="currentColor" stroke-width="1.5"';

/** 图标集剪影缩进 18 视框（按资产各自 viewBox 等比缩放，currentColor 继承） */
function setScaled18(key: Parameters<typeof iconSetAsset>[0]): string {
  const a = iconSetAsset(key);
  return `<g transform="scale(${(18 / a.w).toFixed(6)})" fill="currentColor">${a.body}</g>`;
}

const ICON_BODIES: Record<string, string> = {
  // 抓手（图标集 toolHand 手掌剪影）
  hand: setScaled18('toolHand'),
  // 套索（图标集 toolLasso 虚线选框，框选语义）
  lasso: setScaled18('toolLasso'),
  // 空间工具（图标集 toolSpace 两侧界块+推移元素）
  space: setScaled18('toolSpace'),
  // 连线（图标集 connection 实心细箭头；画布顺序流箭头按其头部 3:1 等比——
  // 工具语义与连线视觉同形态语言）
  connect: setScaled18('connection'),
  // 替换：开口扳手（图标集 toolWrench——头部开口钳口，替换/服务动作族同语言）
  wrench: setScaled18('toolWrench'),
  // 泳道插入（上/下）：横带 + 头带刻线，+ 号位置示方向
  'lane-insert-above':
    `<rect x="2.5" y="7" width="13" height="7.5" rx="0.8" ${S}/>` +
    `<path d="M6.2,7 V14.5 M9,1.5 V4.5 M7.5,3 H10.5" ${S} stroke-linecap="round"/>`,
  'lane-insert-below':
    `<rect x="2.5" y="3.5" width="13" height="7.5" rx="0.8" ${S}/>` +
    `<path d="M6.2,3.5 V11 M9,13.5 V16.5 M7.5,15 H10.5" ${S} stroke-linecap="round"/>`,
  // 泳道本体：横带 + 头带
  lane:
    `<rect x="2.5" y="5" width="13" height="8" rx="0.8" ${S}/>` +
    `<path d="M6.2,5 V13" ${S}/>`,
  // 泳道分割（2/3 段）：横带内画 1/2 条分隔线示意均分（旧线 lane-divide 契约）
  'lane-divide-two':
    `<rect x="2.5" y="5" width="13" height="8" rx="0.8" ${S}/>` +
    `<path d="M6.2,5 V13 M2.5,9 H15.5" ${S}/>`,
  'lane-divide-three':
    `<rect x="2.5" y="5" width="13" height="8" rx="0.8" ${S}/>` +
    `<path d="M6.2,5 V13 M2.5,7.67 H15.5 M2.5,10.33 H15.5" ${S}/>`,
  // 更多（…）：图标集 tool-more 三点，打开全量弹框（追加/创建）
  more: setScaled18('toolMore'),
  // 创建：粗十字（在选中容器内部新建元素）
  plus:
    `<path d="M9,3.5 V14.5 M3.5,9 H14.5" ${S} stroke-linecap="round"/>`,
  // 删除：垃圾桶（图标集 toolTrash——带盖提手 + 竖刻筋剪影）
  trash: setScaled18('toolTrash')
};

/** 工具/动作图标名：palette 工具区与 context pad 动作钮的合法取值 */
export type ToolIconName = keyof typeof ICON_BODIES;

export function toolIconHtml(name: ToolIconName, size = 18): string {
  return svgShell(ICON_BODIES[name], 18, size);
}

/** palette / context pad 动作条目 html（外壳单一来源 icons/shell） */
export function toolEntryHtml(name: ToolIconName, size = 18): string {
  return entryShell(toolIconHtml(name, size));
}
