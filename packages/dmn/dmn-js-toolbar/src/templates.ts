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
 * 重置画布缺省模板：单决策+单输入/输出空决策表（namespace 遵循内核示例
 * 惯例 anyilanxin.com/schema/dmn；带业务扩展命名空间的宿主应经
 * `dmnToolbar.resetXml` 覆盖为自家模板）。
 */
export const DEFAULT_RESET_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmn:definitions xmlns:dmn="https://www.omg.org/spec/DMN/20191111/MODEL/"
                 xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
                 xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
                 id="Definitions_Reset"
                 namespace="http://anyilanxin.com/schema/dmn">
  <dmn:decision id="Decision_Reset" name="Decision 1">
    <dmn:decisionTable id="DecisionTable_Reset">
      <dmn:input id="Input_1">
        <dmn:inputExpression id="InputExpression_1" typeRef="string">
          <dmn:text></dmn:text>
        </dmn:inputExpression>
      </dmn:input>
      <dmn:output id="Output_1" typeRef="string" />
    </dmn:decisionTable>
  </dmn:decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="Decision_Reset">
        <dc:Bounds x="160" y="100" width="180" height="80" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</dmn:definitions>`;
