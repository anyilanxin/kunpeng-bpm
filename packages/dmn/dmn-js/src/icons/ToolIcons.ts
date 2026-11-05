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
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * for more details (a copy is included in the licenses/ directory that
 * accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * DMN 工具与动作图标（palette 工具区与 context pad 动作钮共用，18 网格）。
 *
 * 通用工具（抓手/套索/扳手/垃圾桶）内嵌标准图标集（icons/IconSet）剪影；
 * DMN 域条目（连线=信息需求箭头、创建四类记法、注记）走用户资产 dmnicons
 * （32 视框等比缩进，palette/pad/画布/角标同源，2026-10-26 定规）。
 * 入口机制（toolIconHtml/toolEntryHtml）由 @kunpeng-io/kernel-shared 共享。
 */
import { iconSetAsset } from './IconSet';
import { createToolIcons } from '@kunpeng-io/kernel-shared';
import { dmnIconBody, type DmnIconName } from './DmnIconSet';

/** 图标集剪影缩进 18 视框（按资产各自 viewBox 等比缩放，currentColor 继承） */
function setScaled18(key: Parameters<typeof iconSetAsset>[0]): string {
  const a = iconSetAsset(key);
  return `<g transform="scale(${(18 / a.w).toFixed(6)})" fill="currentColor">${a.body}</g>`;
}

/** DMN 记法资产缩进 18 视框（用户资产 dmnicons，32 视框等比 0.5625；
 * fill=currentColor 与 setScaled18 对齐——漏注时暗色主题下调色板/上下文
 * pad 图标继承默认黑，暗底不可见，2026-11-05 修） */
function dmnScaled18(name: DmnIconName): string {
  return `<g transform="scale(${18 / 32})" fill="currentColor">${dmnIconBody(name)}</g>`;
}

const ICON_BODIES = {
  // 抓手（图标集 toolHand 手掌剪影）
  hand: setScaled18('toolHand'),
  // 套索（图标集 toolLasso 虚线选框，框选语义）
  lasso: setScaled18('toolLasso'),
  // 连线（用户资产：信息需求实心箭头——通用连线入口，类型按落点裁决）
  connect: dmnScaled18('information-requirement'),
  // 替换：开口扳手（图标集 toolWrench——头部开口钳口，替换/服务动作族同语言）
  wrench: setScaled18('toolWrench'),
  // 删除：垃圾桶（图标集 toolTrash——带盖提手 + 竖刻筋剪影）
  trash: setScaled18('toolTrash'),
  // —— DMN 记法图标（用户资产 dmnicons，palette/pad/画布/角标同源）——
  // 决策（创建决策条目）：平边矩形（画布 Decision 形状同记法）
  decision: dmnScaled18('decision'),
  // 输入数据：胶囊
  'input-data': dmnScaled18('input-data'),
  // 知识源：底边波浪
  'knowledge-source': dmnScaled18('knowledge-source'),
  // 业务知识模型：左上/右下双切角罐形
  'business-knowledge': dmnScaled18('business-knowledge'),
  // 注记：左界线+斜纹（用户资产 text-annotation 记法）
  note: dmnScaled18('text-annotation')
};

/** 工具/动作图标名：palette 工具区与 context pad 动作钮的合法取值（字面量联合） */
export type ToolIconName = keyof typeof ICON_BODIES;

export const { toolIconHtml, toolEntryHtml } = createToolIcons(ICON_BODIES);
