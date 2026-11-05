/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 */
/**
 * Decision 的字面表达式视图（DmnLiteralViewModule 载体）：
 * 三段式（对齐 kunpeng-modeler）——decision-properties 名（21px 就地编辑）+
 * 形态标签 / monospace 文本域 / variables-table（变量名·类型·表达式语言）。
 * Decision 的非决策表形态（Context/List 等四族）与空态也由此视图承载
 * （占位件+形态切换菜单——决策表形态由 DmnDecisionTableModule 接管）。
 */
import type { EditorDeps } from './shared/types';
import { el, makeTextInput } from './shared/dom';
import { openKindMenu, kindLabel, logicKind } from './shared/kindMenu';
import { startNameEdit } from './shared/nameEdit';
import { buildTypeSelect } from './shared/typeSelect';

export function openLiteralView(element: any, deps: EditorDeps): void {
  const bo = element.businessObject;
  const body = el('div', 'dmn-decision-editor');
  deps.views.open(element, body);

  const rerender = () => {
    body.textContent = '';
    renderLiteralBody(body, bo, deps, rerender);
  };
  rerender();
}

function renderLiteralBody(body: HTMLElement, bo: any, deps: EditorDeps, rerender: () => void): void {
  const logic = bo.get('decisionLogic');
  if (!logic) {
    const empty = el('div', 'dmn-editor-empty', '无表达式 — 点击切换形态');
    empty.style.cursor = 'pointer';
    empty.addEventListener('click', () =>
      openKindMenu(empty, '', (kind) => {
        setDecisionLogic(bo, kind, deps);
        rerender();
      })
    );
    body.append(empty);
    return;
  }
  if (logic.$type === 'dmn:LiteralExpression') {
    renderLiteralExpression(body, bo, logic, deps, rerender);
  } else {
    const ph = el('div', 'dmn-editor-empty', `暂不支持形态 ${logic.$type} 的网格编辑（本期 boxed 四族占位）`);
    ph.style.cursor = 'pointer';
    ph.addEventListener('click', () =>
      openKindMenu(ph, logic.$type, (kind) => {
        setDecisionLogic(bo, kind, deps);
        rerender();
      })
    );
    body.append(ph);
  }
}

function setDecisionLogic(bo: any, kind: string, deps: EditorDeps): void {
  const logic = kind === 'dmn:DecisionTable'
    ? deps.factory.create<any>({ $type: 'dmn:DecisionTable', hitPolicy: 'UNIQUE' })
    : kind === 'dmn:LiteralExpression'
      ? deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: '' })
      : kind === 'dmn:Context'
        ? deps.factory.create<any>({ $type: 'dmn:Context', contextEntry: [] })
        : kind === 'dmn:List'
          ? deps.factory.create<any>({ $type: 'dmn:List', elements: [] })
          : kind === 'dmn:Invocation'
            ? deps.factory.create<any>({ $type: 'dmn:Invocation', binding: [] })
            : deps.factory.create<any>({ $type: 'dmn:Relation', column: [], row: [] });
  deps.modeling.updateModdleProperties(bo, bo, { decisionLogic: logic });
}

function setVariableName(bo: any, v: string, deps: EditorDeps): void {
  const variable = bo.get('variable');
  if (variable) {
    deps.modeling.updateModdleProperties(bo, variable, { name: v });
  } else {
    deps.modeling.updateModdleProperties(bo, bo, {
      variable: deps.factory.create<any>({ $type: 'dmn:InformationItem', name: v })
    });
  }
}

function setVariableTypeRef(bo: any, v: string, deps: EditorDeps): void {
  const variable = bo.get('variable');
  if (variable) {
    deps.modeling.updateModdleProperties(bo, variable, { typeRef: v });
  } else {
    deps.modeling.updateModdleProperties(bo, bo, {
      variable: deps.factory.create<any>({ $type: 'dmn:InformationItem', typeRef: v })
    });
  }
}

// ---- Literal expression 三段式（对齐 kunpeng-modeler） ----
function renderLiteralExpression(
  body: HTMLElement,
  bo: any,
  logic: any,
  deps: EditorDeps,
  rerender: () => void
): void {
  const host = el('div', 'dmn-literal-expression-container viewer-container');
  body.append(host);

  // ① 名字头（名 21px 就地编辑 + 形态标签入口）
  const props = el('div', 'decision-properties');
  const name = bo.name ?? '';
  const nameEl = el('div', 'decision-name editable', name);
  nameEl.title = `Decision name: ${name}`;
  nameEl.addEventListener('click', () => {
    startNameEdit(props, '.decision-name', bo, name, deps, rerender);
  });
  props.append(nameEl);
  const kindTag = el('button', 'dmn-kind-tag', kindLabel(logicKind(logic)));
  kindTag.addEventListener('click', () =>
    openKindMenu(kindTag, logicKind(logic), (kind) => {
      if (kind === logicKind(logic)) return;
      setDecisionLogic(bo, kind, deps);
      rerender();
    })
  );
  props.append(kindTag);
  host.append(props);

  // ② 表达式区（monospace 14px、min-height 250）
  const ta = document.createElement('textarea');
  ta.className = 'textarea';
  ta.value = logic.text ?? '';
  ta.placeholder = '输入 FEEL 表达式';
  ta.addEventListener('change', () => {
    deps.modeling.updateModdleProperties(logic, logic, { text: ta.value });
    rerender();
  });
  host.append(ta);

  // ③ 属性区（variables-table：Expression language + Variable name/type）
  const propSection = el('div', 'literal-expression-properties');
  const table = document.createElement('table');
  table.className = 'variables-table';
  table.append(propertyRow('Variable name:', makeTextInput(bo.get('variable')?.name, (v) => setVariableName(bo, v, deps))));
  table.append(propertyRow('Variable type:', buildTypeSelect(bo.get('variable')?.typeRef, (v) => setVariableTypeRef(bo, v, deps))));
  const lang = document.createElement('select');
  lang.className = 'dmn-editor-select';
  for (const l of ['feel', 'juav', 'groovy']) {
    const o = document.createElement('option');
    o.value = l;
    o.textContent = l;
    lang.appendChild(o);
  }
  lang.value = logic.expressionLanguage ?? 'feel';
  lang.addEventListener('change', () => {
    deps.modeling.updateModdleProperties(logic, logic, { expressionLanguage: lang.value });
    rerender();
  });
  table.append(propertyRow('Expression language:', lang));
  propSection.append(table);
  host.append(propSection);
}

function propertyRow(label: string, control: HTMLElement): HTMLTableRowElement {
  const tr = document.createElement('tr');
  const td1 = document.createElement('td');
  td1.textContent = label;
  const td2 = document.createElement('td');
  td2.append(control);
  tr.append(td1, td2);
  return tr;
}
