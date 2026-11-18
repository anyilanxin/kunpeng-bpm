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
 * @kunpeng-io/i18n：鲲鹏建模器语言包（key=英文，2026-11-19 契约翻转；同日目录规范化）。
 *
 * 契约：内核源码 UI 文案 key=英文原文，未装配词典=英文透传（即缺省观感）；
 * 各语言以 en→xx 词典装配。
 *
 * **目录约定**：`src/<locale>/{bpmn,dmn,panel}.ts` 每语言一目录三词典
 * （bpmn 线 / dmn 线 / 属性面板共用）；`en` 为源码 key 透传无目录。
 * **新增语言** = 复制任一语言目录为 `<locale>/`、翻译 value、在下方
 * DICTS 与 KunpengLocale 挂载（或宿主用词典资产自行合并定制）。
 * 现有语言：`zh-CN`（简体，人工维护源）、`zh-TW`（繁體，OpenCC s2twp
 * 由 zh-CN 生成，术语按需手工精调）。
 *
 * 接入（config 词典通道——Modeler 构造项 `bpmnI18n`/`dmnI18n`，随插件 config
 * 透传进内核词典服务构造期，对全部消费者生效；语言为构造期装配，切换=重建实例）：
 * ```ts
 * import { bpmnI18nConfig, dmnI18nConfig } from '@kunpeng-io/i18n';
 *
 * new BpmnModeler({ ..., bpmnI18n: bpmnI18nConfig('zh-TW') });
 * new DmnModeler({ ..., dmnI18n: dmnI18nConfig('zh-TW') });
 * ```
 *
 * **为什么是 config 而非 DI 服务整体替换**：palette 等默认模块在 `__init__`
 * 中急切构造（2026-11-18 实测），先于 additionalModules 的同名服务覆盖注册，
 * DI 替换对这类早捕获消费者不生效——config 词典经 `config.bpmnI18n` 在缺省
 * 词典服务构造期注入，全员生效，是唯一可靠通道。
 *
 * 词条语义（与内核 t() 契约一致）：key=源码英文原文，未命中透传原文；
 * `t(text, params?)` 命中后按 `{token}` 占位替换。zh-CN/zh-TW 装配后内核
 * UI 与属性面板英文 key 一并汉化；en-US/未识别 locale 不装配词典（英文透传）。
 */
import { bpmnZhCN } from './zh-CN/bpmn';
import { dmnZhCN } from './zh-CN/dmn';
import { panelZhCN } from './zh-CN/panel';
import { bpmnZhTW } from './zh-TW/bpmn';
import { dmnZhTW } from './zh-TW/dmn';
import { panelZhTW } from './zh-TW/panel';

/** 已支持的语言（en-US=源码 key 透传，无词典目录） */
export type KunpengLocale = 'en-US' | 'zh-CN' | 'zh-TW';

/** 词典资产出口（宿主自定义语言/增补词条时合并使用） */
export { bpmnZhCN, dmnZhCN, panelZhCN, bpmnZhTW, dmnZhTW, panelZhTW };

/** bpmn 线词典（key=英文）：缺省英文透传；各语言=内核 UI + 面板词典合并 */
const bpmnDicts: Record<string, Record<string, string>> = {
  'zh-CN': { ...bpmnZhCN, ...panelZhCN },
  'zh-TW': { ...bpmnZhTW, ...panelZhTW },
};

/** dmn 线词典（key=英文）：缺省英文透传；各语言=内核 UI + 面板词典合并 */
const dmnDicts: Record<string, Record<string, string>> = {
  'zh-CN': { ...dmnZhCN, ...panelZhCN },
  'zh-TW': { ...dmnZhTW, ...panelZhTW },
};

/** bpmn 线词典 config（Modeler 构造项 `bpmnI18n` 值）。缺省/未识别 locale=英文透传 */
export function bpmnI18nConfig(locale: string = 'en-US'): Record<string, string> {
  return { ...(bpmnDicts[locale] ?? {}) };
}

/** dmn 线词典 config（Modeler 构造项 `dmnI18n` 值）。缺省/未识别 locale=英文透传 */
export function dmnI18nConfig(locale: string = 'en-US'): Record<string, string> {
  return { ...(dmnDicts[locale] ?? {}) };
}
