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
 * @kunpeng-io/i18n：鲲鹏建模器双语插件（zh-CN / en-US）。
 *
 * 接入（config 词典通道——Modeler 构造项 `bpmnI18n`/`dmnI18n`，随插件 config
 * 透传进内核词典服务构造期，对全部消费者生效；语言为构造期装配，切换=重建实例）：
 * ```ts
 * import { bpmnI18nConfig, dmnI18nConfig } from '@kunpeng-io/i18n';
 *
 * new BpmnModeler({ ..., bpmnI18n: bpmnI18nConfig('en-US') });
 * new DmnModeler({ ..., dmnI18n: dmnI18nConfig('en-US') });
 * ```
 *
 * **为什么是 config 而非 DI 服务整体替换**：palette 等默认模块在 `__init__`
 * 中急切构造（2026-11-18 实测），先于 additionalModules 的同名服务覆盖注册，
 * DI 替换对这类早捕获消费者不生效（工具栏这类 additionalModules 内的消费者
 * 正常）——config 词典经 `config.bpmnI18n` 在缺省词典服务构造期注入，全员
 * 生效，是唯一可靠通道。
 *
 * 词条语义（与内核 t() 契约一致）：key=源码原文，未命中透传原文；
 * `t(text, params?)` 命中后按 `{token}` 占位替换。zh-CN 下内核中文原文
 * 透传、属性面板英文 key 经 panelZhCN 汉化；en-US 下内核中文原文经
 * bpmnEnUS/dmnEnUS 译为英文、面板英文 key 透传（本身即英文）。
 */
import { bpmnEnUS } from './bpmn-en';
import { dmnEnUS } from './dmn-en';
import { panelZhCN } from './panel-zh';

export type KunpengLocale = 'zh-CN' | 'en-US';

/** 词典资产出口（宿主自定义语言/增补词条时合并使用） */
export { bpmnEnUS, dmnEnUS, panelZhCN };

/** 各语言装配词典：zh=面板汉化（内核中文透传）；en=内核英文（面板英文透传） */
const BPMN_DICTS: Record<KunpengLocale, Record<string, string>> = {
  'zh-CN': { ...panelZhCN },
  'en-US': { ...bpmnEnUS }
};
const DMN_DICTS: Record<KunpengLocale, Record<string, string>> = {
  'zh-CN': { ...panelZhCN },
  'en-US': { ...dmnEnUS }
};

/** bpmn 线词典 config（Modeler 构造项 `bpmnI18n` 值）。缺省 zh-CN */
export function bpmnI18nConfig(locale: KunpengLocale = 'zh-CN'): Record<string, string> {
  return { ...BPMN_DICTS[locale] };
}

/** dmn 线词典 config（Modeler 构造项 `dmnI18n` 值）。缺省 zh-CN */
export function dmnI18nConfig(locale: KunpengLocale = 'zh-CN'): Record<string, string> {
  return { ...DMN_DICTS[locale] };
}
