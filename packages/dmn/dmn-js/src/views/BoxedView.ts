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
 * BKM boxed 视图（DmnBoxedViewModule 载体，版式对齐 kunpeng-modeler）：
 * header 名（21px 就地编辑）+形态标签 / function-definition 网格
 * （F 字符 + 参数 chip〔名/类型/删〕+ 添加参数 + body 表达式）/ Result
 * （Variable name·type 两列 grid）。结构改动全走 DmnModeling 命令。
 */
import type { EditorDeps } from './shared/types';
import { el, makeTextInput } from './shared/dom';
import { openKindMenu, kindLabel } from './shared/kindMenu';
import { startNameEdit } from './shared/nameEdit';
import { buildTypeSelect } from './shared/typeSelect';

export function openBoxedView(element: any, deps: EditorDeps): void {
  const bo = element.businessObject;
  const body = el('div', 'dmn-bkm-editor');
  deps.views.open(element, body);

  const rerender = () => {
    body.textContent = '';
    renderBkmBody(body, bo, deps, rerender);
  };
  rerender();
}

function setBkmBody(bo: any, kind: string, deps: EditorDeps): void {
  const logic = bo.get('encapsulatedLogic');
  const body = kind === 'dmn:LiteralExpression'
    ? deps.factory.create<any>({ $type: 'dmn:LiteralExpression', text: '' })
    : kind === 'dmn:Context'
      ? deps.factory.create<any>({ $type: 'dmn:Context', contextEntry: [] })
      : kind === 'dmn:List'
        ? deps.factory.create<any>({ $type: 'dmn:List', elements: [] })
        : kind === 'dmn:Invocation'
          ? deps.factory.create<any>({ $type: 'dmn:Invocation', binding: [] })
          : deps.factory.create<any>({ $type: 'dmn:Relation', column: [], row: [] });
  deps.modeling.updateModdleProperties(bo, logic, { body });
}

function renderBkmBody(body: HTMLElement, bo: any, deps: EditorDeps, rerender: () => void): void {
  const logic = bo.get('encapsulatedLogic');
  if (!logic) {
    body.append(el('div', 'dmn-editor-empty', 'Empty（无表达式）——pad 切回 Literal expression 以编辑'));
    return;
  }
  const host = el('div', 'dmn-boxed-expression-container viewer-container');
  body.append(host);

  // ① header：BKM 名（21px 就地编辑）+ 形态标签
  const header = el('div', 'dmn-boxed-expression-section element-properties');
  const name = bo.name ?? '';
  const nameEl = el('div', 'element-name editable', name);
  nameEl.addEventListener('click', () => startNameEdit(header, '.element-name', bo, name, deps, rerender));
  header.append(nameEl);
  const kindTag = el('button', 'dmn-kind-tag', kindLabel(logic.get('body')?.$type ?? ''));
  kindTag.addEventListener('click', () =>
    openKindMenu(kindTag, logic.get('body')?.$type ?? '', (kind) => {
      if (kind === (logic.get('body')?.$type ?? '')) return;
      setBkmBody(bo, kind, deps);
      rerender();
    })
  );
  header.append(kindTag);
  host.append(header);

  // ② function-definition 网格：F | 参数区 / body 表达式（span 2 列）
  const fn = el('div', 'dmn-boxed-expression-section function-definition');
  const kindCell = el('div', 'function-definition-kind', 'F');
  fn.append(kindCell);
  const paramsCell = el('div', 'function-definition-parameters');
  const formalParameters: any[] = logic.get('formalParameter') ?? [];
  formalParameters.forEach((p) => {
    const chip = el('span', 'parameter-chip');
    const nameSpan = el('span', 'parameter-chip-name', p.name || 'param');
    nameSpan.title = '参数名（点击编辑）';
    nameSpan.addEventListener('click', () => {
      const input = document.createElement('input');
      input.className = 'parameter-chip-input';
      input.value = p.name ?? '';
      nameSpan.textContent = '';
      nameSpan.append(input);
      input.focus();
      input.select();
      const done = (save: boolean) => {
        if (save && input.value !== (p.name ?? '')) {
          deps.modeling.updateModdleProperties(logic, p, { name: input.value });
        } else {
          rerender();
        }
      };
      input.addEventListener('blur', () => done(true));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); done(true); }
        if (e.key === 'Escape') { e.preventDefault(); done(false); }
      });
    });
    chip.append(nameSpan);
    const typeSpan = el('span', 'parameter-chip-type', p.typeRef || 'unspecified');
    typeSpan.title = '参数类型（点击选择）';
    typeSpan.addEventListener('click', () => {
      const sel = buildTypeSelect(p.typeRef, (v) => {
        deps.modeling.updateModdleProperties(logic, p, { typeRef: v });
      });
      sel.classList.add('parameter-chip-select');
      typeSpan.textContent = '';
      typeSpan.append(sel);
      sel.focus();
    });
    chip.append(typeSpan);
    const del = el('button', 'parameter-chip-remove', '\u2715');
    del.title = '删除参数';
    del.addEventListener('click', () => {
      deps.modeling.listRemove(logic, logic, 'formalParameter', p);
      rerender();
    });
    chip.append(del);
    paramsCell.append(chip);
  });
  const addParam = el('button', 'parameter-add tjs-plus', '+');
  addParam.setAttribute('type', 'button');
  addParam.title = '添加参数';
  addParam.addEventListener('click', () => {
    deps.modeling.listAdd(logic, logic, 'formalParameter', deps.factory.create<any>({ $type: 'dmn:InformationItem', name: '' }));
    rerender();
  });
  paramsCell.append(addParam);
  fn.append(paramsCell);

  const bodyCell = el('div', 'function-definition-body');
  const bodyExpr = logic.get('body');
  if (bodyExpr?.$type === 'dmn:LiteralExpression') {
    const ta = document.createElement('textarea');
    ta.className = 'textarea';
    ta.value = bodyExpr.text ?? '';
    ta.placeholder = '输入 FEEL 表达式';
    ta.addEventListener('change', () => {
      deps.modeling.updateModdleProperties(logic, bodyExpr, { text: ta.value });
      rerender();
    });
    bodyCell.append(ta);
  } else if (bodyExpr) {
    bodyCell.append(el('div', 'dmn-editor-empty', `暂不支持形态 ${bodyExpr.$type}（本期 boxed 占位）`));
  } else {
    bodyCell.append(el('div', 'dmn-editor-empty', '无体表达式'));
  }
  fn.append(bodyCell);
  host.append(fn);

  // ③ footer：Result（Variable name/type 两列 grid）
  const footer = el('div', 'dmn-boxed-expression-section element-variable');
  footer.append(el('h2', '', 'Result'));
  const nameLabel = el('div', '');
  nameLabel.append(el('span', 'element-variable-name-label', 'Variable name'));
  nameLabel.append(makeTextInput(logic.get('variable')?.name, (v) => {
    const variable = logic.get('variable');
    if (variable) {
      deps.modeling.updateModdleProperties(logic, variable, { name: v });
    } else {
      deps.modeling.updateModdleProperties(logic, logic, {
        variable: deps.factory.create<any>({ $type: 'dmn:InformationItem', name: v })
      });
    }
    rerender();
  }, '结果名'));
  const typeLabel = el('div', '');
  typeLabel.append(el('span', 'element-variable-type-label', 'Variable type'));
  typeLabel.append(buildTypeSelect(logic.get('variable')?.typeRef, (v) => {
    const variable = logic.get('variable');
    if (variable) {
      deps.modeling.updateModdleProperties(logic, variable, { typeRef: v });
    } else {
      deps.modeling.updateModdleProperties(logic, logic, {
        variable: deps.factory.create<any>({ $type: 'dmn:InformationItem', typeRef: v })
      });
    }
    rerender();
  }));
  footer.append(nameLabel, typeLabel);
  host.append(footer);
}
