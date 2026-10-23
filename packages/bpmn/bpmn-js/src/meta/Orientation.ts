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
 * 全模型布局朝向（水平/垂直池）单一事实源。
 *
 * 标记存放于 `<bpmn:definitions kunpeng:orientation="vertical|horizontal">`
 * （moddle 树属性；宿主注册 kunpeng 扩展描述时类型化读写，未注册时经 $attrs
 * 原文往返）。解析次序：
 *   1. 模型自带标记（含导入推断写回的）；
 *   2. 实例缺省 `new Modeler({ orientation })`；
 *   3. 水平。
 *
 * 无标记但池 DI 带显式 isHorizontal 的历史文件，在导入时按首个池推断一次
 * （仅垂直推断写回标记——水平为隐式缺省，文件字节保持不变）。解析后池级
 * 属性不再参与运行时判定；导出侧镜像（syncExportMarker + 写出器 isHorizontal）
 * 按当前朝向统一重写，只认规范属性的工具仍可正确渲染。
 */

export type ModelOrientation = 'horizontal' | 'vertical';

/** definitions 扩展属性名（kunpeng 命名空间，与 @kunpeng-io/kunpeng-bpmn-moddle 资源一致） */
export const ORIENTATION_ATTR = 'kunpeng:orientation';

/** kunpeng 命名空间 URI（resources/kunpeng.json 同源；宿主未注册扩展时兜底声明） */
export const KUNPENG_NS_URI = 'http://anyilanxin.com/schema/kunpeng/1.0';

export class OrientationService {
  static $inject = ['config', 'eventBus'];

  private readonly defaultOrientation: ModelOrientation;
  private orientation: ModelOrientation;

  constructor(config: any, eventBus: any) {
    this.defaultOrientation = config?.orientation === 'vertical' ? 'vertical' : 'horizontal';
    this.orientation = this.defaultOrientation;
    // 清空画布无模型标记可依：回落实例缺省，待下次导入重新解析
    eventBus.on('diagram.clear', () => {
      this.orientation = this.defaultOrientation;
    });
  }

  getOrientation(): ModelOrientation {
    return this.orientation;
  }

  isHorizontal(): boolean {
    return this.orientation === 'horizontal';
  }

  /** 命令侧状态翻转（orientation.set 处理器在重排几何前调用） */
  setOrientation(orientation: ModelOrientation): void {
    this.orientation = orientation;
  }

  /**
   * 导入解析：标记优先，其次首个带显式 isHorizontal 的池 DI 信号，最后实例缺省。
   * 仅垂直推断写回标记（水平保持隐式缺省，往返字节稳定）。
   */
  applyImport(definitions: any, firstPoolHorizontal: boolean | undefined): ModelOrientation {
    const marker = readMarker(definitions);
    if (marker === 'vertical' || marker === 'horizontal') {
      this.orientation = marker;
      return marker;
    }
    if (firstPoolHorizontal !== undefined) {
      const inferred: ModelOrientation = firstPoolHorizontal ? 'horizontal' : 'vertical';
      if (inferred === 'vertical' && definitions) {
        writeMarker(definitions, 'vertical');
      }
      this.orientation = inferred;
      return inferred;
    }
    this.orientation = this.defaultOrientation;
    return this.orientation;
  }

  /** 导出镜像：definitions 标记反映当前朝向（水平=隐式删除标记） */
  syncExportMarker(definitions: any): void {
    if (!definitions) {
      return;
    }
    writeMarker(definitions, this.orientation === 'vertical' ? 'vertical' : undefined);
  }
}

/**
 * 读标记：宿主注册 kunpeng 扩展时为树属性（局部名键 orientation）；
 * 未注册时引擎把未知属性收进 $attrs（带前缀键）。
 */
function readMarker(definitions: any): unknown {
  return definitions?.orientation ?? definitions?.$attrs?.[ORIENTATION_ATTR];
}

/**
 * 写标记：经 moddle set 按描述归位（注册→树属性；未注册→$attrs 并补命名空间
 * 声明，保证序列化器可解析前缀）；undefined = 移除。
 */
function writeMarker(definitions: any, value: 'vertical' | undefined): void {
  if (value === undefined) {
    definitions.set?.(ORIENTATION_ATTR, undefined);
    if (definitions.$attrs) {
      delete definitions.$attrs[ORIENTATION_ATTR];
    }
    return;
  }
  definitions.set(ORIENTATION_ATTR, value);
  if (definitions.$attrs?.[ORIENTATION_ATTR] !== undefined) {
    definitions.$attrs['xmlns:kunpeng'] ??= KUNPENG_NS_URI;
  }
}
