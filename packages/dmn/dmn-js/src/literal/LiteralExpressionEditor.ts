/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
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
 * 字面表达式编辑器：表达式文本（FEEL 多行）+ 输出变量名/typeRef + 表达式
 * 语言标记。全部编辑经命令栈（updateModdleProperties）；variable 缺失时首次
 * 编辑经工厂创建挂接（撤销还原为无变量）。命令栈/模式变化全量重渲。
 */
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnMode } from '../mode/DmnMode';
import type { DmnI18n } from '../i18n/DmnI18n';
import { backButton } from '../views/backButton';

/** 与决策表 typeRef 下拉同源的类型候选（FEEL 基础类型） */
const TYPE_REFS = [
  'string', 'boolean', 'integer', 'decimal', 'date', 'time',
  'dateTime', 'daysAndTimeDuration', 'yearsAndMonthsDuration'
];

/** decisionLogic 全类切换（类型切换与视图重挂联动，见 DmnViews） */
const LOGIC_TYPES: Array<{ value: string; label: string }> = [
  { value: 'dmn:LiteralExpression', label: '字面表达式' },
  { value: 'dmn:DecisionTable', label: '决策表' },
  { value: 'dmn:Context', label: '上下文' },
  { value: 'dmn:Invocation', label: '调用' },
  { value: 'dmn:Relation', label: '关系' },
  { value: 'dmn:List', label: '列表' },
  { value: 'dmn:FunctionDefinition', label: '函数定义' }
];

export interface LiteralExpressionEditorDeps {
  modeling: any;
  eventBus: any;
  elementRegistry: any;
  dmnFactory: DmnFactory;
  dmnMode: DmnMode;
  i18n: DmnI18n;
  /** 视图管理（返回 DRD 通道） */
  dmnViews: { open(id: string): void };
}

export class LiteralExpressionEditor {
  private readonly root: HTMLElement;
  private focusExpression = false;
  private destroyed = false;

  constructor(
    container: HTMLElement,
    private readonly decision: any,
    private readonly deps: LiteralExpressionEditorDeps
  ) {
    this.root = document.createElement('div');
    this.root.className = 'dmn-literal-editor';
    container.appendChild(this.root);
    this.deps.eventBus.on('commandStack.changed', this.rerender);
    this.deps.eventBus.on('mode.changed', this.rerender);
    this.render();
  }

  private readonly rerender = (): void => {
    this.render();
  };

  destroy(): void {
    this.destroyed = true;
    this.deps.eventBus.off('commandStack.changed', this.rerender);
    this.deps.eventBus.off('mode.changed', this.rerender);
    this.root.remove();
  }

  private get expression(): any {
    return this.decision.decisionLogic;
  }

  private get editable(): boolean {
    return this.deps.dmnMode.isEditable();
  }

  private get canvasElement(): any {
    return this.deps.elementRegistry.get(this.decision.id);
  }

  render(): void {
    if (this.destroyed) {
      return;
    }
    const t = this.deps.i18n.t.bind(this.deps.i18n);
    const wrap = document.createElement('div');
    wrap.className = 'dmn-literal-wrap';

    // 顶栏：返回 DRD / 类型切换 / 变量名 / 变量类型 / 表达式语言
    const bar = document.createElement('div');
    bar.className = 'dmn-literal-bar';
    bar.prepend(backButton(t, () => this.deps.dmnViews.open('drd')));
    if (this.editable) {
      const kindSelect = document.createElement('select');
      kindSelect.className = 'dmn-literal-input';
      for (const opt of LOGIC_TYPES) {
        kindSelect.add(new Option(t(opt.label), opt.value));
      }
      kindSelect.value = this.decision.decisionLogic?.$type ?? '';
      kindSelect.addEventListener('change', () => {
        const fresh = this.deps.dmnFactory.create<any>(
          this.skeleton(kindSelect.value)
        );
        this.deps.modeling.updateModdleProperties(this.canvasElement, this.decision, { decisionLogic: fresh });
      });
      bar.appendChild(this.fieldLabel(t('表达式类型'), kindSelect));
    }
    bar.appendChild(this.fieldLabel(t('输出变量名'), this.variableInput('name', this.decision.variable?.name, (value) => {
      this.ensureVariable({ name: value || undefined });
    })));
    bar.appendChild(this.fieldLabel(t('变量类型'), this.variableTypeSelect()));
    bar.appendChild(this.fieldLabel(t('表达式语言'), this.plainInput(this.expression?.expressionLanguage ?? '', t('缺省 feel'), (value) => {
      this.deps.modeling.updateModdleProperties(this.canvasElement, this.expression, {
        expressionLanguage: value || undefined
      });
    })));
    wrap.appendChild(bar);

    // 表达式正文
    const areaLabel = document.createElement('div');
    areaLabel.className = 'dmn-literal-area-label';
    areaLabel.textContent = t('表达式（FEEL）');
    wrap.appendChild(areaLabel);

    const area = document.createElement('textarea');
    area.className = 'dmn-literal-area';
    area.value = this.expression?.text ?? '';
    area.placeholder = t('例：信用分 * 0.7 + 申请人年龄 * 0.3');
    if (this.editable) {
      area.addEventListener('change', () => {
        this.deps.modeling.updateModdleProperties(this.canvasElement, this.expression, {
          text: area.value || undefined
        });
      });
      area.addEventListener('focus', () => {
        this.focusExpression = true;
      });
    } else {
      area.disabled = true;
    }
    wrap.appendChild(area);

    this.root.replaceChildren(wrap);
    if (this.focusExpression && this.editable) {
      const el = this.root.querySelector<HTMLTextAreaElement>('.dmn-literal-area');
      el?.focus();
    }
  }

  /** 各类型切换骨架（空容器/首列首行等合法起点） */
  private skeleton(type: string): { $type: string } & Record<string, unknown> {
    switch (type) {
      case 'dmn:DecisionTable':
        return { $type: 'dmn:DecisionTable', hitPolicy: 'UNIQUE' };
      case 'dmn:Context':
        return { $type: 'dmn:Context', contextEntry: [] };
      case 'dmn:Invocation':
        return { $type: 'dmn:Invocation', binding: [] };
      case 'dmn:Relation':
        return { $type: 'dmn:Relation', column: [], row: [] };
      case 'dmn:List':
        return { $type: 'dmn:List', elements: [] };
      case 'dmn:FunctionDefinition':
        return { $type: 'dmn:FunctionDefinition', formalParameter: [] };
      default:
        return { $type: 'dmn:LiteralExpression' };
    }
  }

  /** variable 首次编辑时创建挂接；已有则单属性更新 */
  private ensureVariable(properties: Record<string, any>): void {
    if (this.decision.variable) {
      this.deps.modeling.updateModdleProperties(this.canvasElement, this.decision.variable, properties);
      return;
    }
    const variable = this.deps.dmnFactory.create<any>({ $type: 'dmn:InformationItem', ...properties });
    this.deps.modeling.updateModdleProperties(this.canvasElement, this.decision, { variable });
  }

  private variableInput(key: string, value: string | undefined, commit: (v: string) => void): HTMLInputElement {
    const input = document.createElement('input');
    input.className = 'dmn-literal-input';
    input.value = value ?? '';
    if (this.editable) {
      input.addEventListener('change', () => commit(input.value));
    } else {
      input.disabled = true;
    }
    return input;
  }

  private variableTypeSelect(): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'dmn-literal-input dmn-literal-type';
    select.add(new Option(this.deps.i18n.t('类型'), ''));
    for (const type of TYPE_REFS) {
      select.add(new Option(type, type));
    }
    const current = this.decision.variable?.typeRef;
    if (current && !TYPE_REFS.includes(current)) {
      select.add(new Option(current, current));
    }
    select.value = current ?? '';
    if (this.editable) {
      select.addEventListener('change', () => this.ensureVariable({ typeRef: select.value || undefined }));
    } else {
      select.disabled = true;
    }
    return select;
  }

  private plainInput(value: string, placeholder: string, commit: (v: string) => void): HTMLInputElement {
    const input = document.createElement('input');
    input.className = 'dmn-literal-input';
    input.value = value;
    input.placeholder = placeholder;
    if (this.editable) {
      input.addEventListener('change', () => commit(input.value));
    } else {
      input.disabled = true;
    }
    return input;
  }

  private fieldLabel(text: string, control: HTMLElement): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'dmn-literal-field';
    const label = document.createElement('span');
    label.textContent = text;
    wrap.appendChild(label);
    wrap.appendChild(control);
    return wrap;
  }
}
