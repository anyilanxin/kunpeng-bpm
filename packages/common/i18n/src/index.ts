/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and directories/ that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * @kunpeng-io/i18n：鲲鹏建模器语言包（2026-11-19 契约翻转：key=英文）。
 *
 * 契约：内核源码 UI 文案 key=英文原文，未装配词典=英文透传（即缺省观感）；
 * 中文等语言以 en→xx 词典装配。新语言接入=新增一张 en→xx 词典并在下方
 * DICTS 挂载（或宿主用词典资产自行合并定制）。
 *
 * 接入（config 词典通道——Modeler 构造项 `bpmnI18n`/`dmnI18n`，随插件 config
 * 透传进内核词典服务构造期，对全部消费者生效；语言为构造期装配，切换=重建实例）：
 * ```ts
 * import { bpmnI18nConfig, dmnI18nConfig } from '@kunpeng-io/i18n';
 *
 * new BpmnModeler({ ..., bpmnI18n: bpmnI18nConfig('zh-CN') });
 * new DmnModeler({ ..., dmnI18n: dmnI18nConfig('zh-CN') });
 * ```
 *
 * **为什么是 config 而非 DI 服务整体替换**：palette 等默认模块在 `__init__`
 * 中急切构造（2026-11-18 实测），先于 additionalModules 的同名服务覆盖注册，
 * DI 替换对这类早捕获消费者不生效——config 词典经 `config.bpmnI18n` 在缺省
 * 词典服务构造期注入，全员生效，是唯一可靠通道。
 *
 * 词条语义（与内核 t() 契约一致）：key=源码英文原文，未命中透传原文；
 * `t(text, params?)` 命中后按 `{token}` 占位替换。zh-CN 装配后内核 UI 与
 * 属性面板英文 key 一并汉化；en-US/未识别 locale 不装配词典（英文透传）。
 */
import { bpmnZhCN } from './bpmn-zh';
import { dmnZhCN } from './dmn-zh';
import { panelZhCN } from './panel-zh';

export type KunpengLocale = 'zh-CN' | 'en-US';

/** 词典资产出口（宿主自定义语言/增补词条时合并使用；panelZhCN 随 zh 一并装配） */
export { bpmnZhCN, dmnZhCN, panelZhCN };

/** bpmn 线词典（key=英文）：缺省英文透传，zh-CN 装配内核 UI + 面板中文 */
const bpmnDicts: Record<string, Record<string, string>> = {
  'zh-CN': { ...bpmnZhCN, ...panelZhCN },
};

/** dmn 线词典（key=英文）：缺省英文透传，zh-CN 装配内核 UI + 面板中文 */
const dmnDicts: Record<string, Record<string, string>> = {
  'zh-CN': { ...dmnZhCN, ...panelZhCN },
};

/** bpmn 线词典 config（Modeler 构造项 `bpmnI18n` 值）。缺省/未识别 locale=英文透传 */
export function bpmnI18nConfig(locale: string = 'en-US'): Record<string, string> {
  return { ...(bpmnDicts[locale] ?? {}) };
}

/** dmn 线词典 config（Modeler 构造项 `dmnI18n` 值）。缺省/未识别 locale=英文透传 */
export function dmnI18nConfig(locale: string = 'en-US'): Record<string, string> {
  return { ...(dmnDicts[locale] ?? {}) };
}
