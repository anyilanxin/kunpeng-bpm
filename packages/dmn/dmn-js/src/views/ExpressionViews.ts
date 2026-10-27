/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that licenses/ directories that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this work).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/**
 * 表达式编辑器视图（G5 核心，用户截图版式）：
 * - Decision：decisionLogic 按形态分派——决策表=用户截图版式（视图头槽位
 *   「名 | Hit policy: [▼]」、单行四角表头〔左上 When/Then/Annotations 族标记、
 *   中间列名、右下类型〕、深蓝圆形 ⊕ 骑族界缝与标题同行、单元格「-」占位+
 *   悬停铅笔、底行行号列蓝色+加行）；LiteralExpression=文本域（头部变量名/
 *   类型/表达式语言/形态标签，点击形态标签弹形态菜单）。
 * - BKM（Literal 模式）：boxed 编辑器——参数区（formalParameter 增删/名/类型）、
 *   体区（FunctionDefinition.body 按形态分派：Literal=文本域、其余四族本期
 *   占位提示）、结果区（variable name/typeRef）。
 *
 * 全部编辑经 modeling 命令（可撤销；Decision/ BKM 的结构改动走
 * properties.update / updateModdleProperties / dmn.list / dmn.table.clause）。
 * 编辑器层为 DOM 直渲（.dmn-editor 表布局）；形态切换/增删后整体重渲（
 * rerender()——命令完成即重算命令栈后的新态）。
 */
import type { DmnViews } from './DmnViews';
import type { DmnFactory } from '../factory/DmnFactory';
import type { DmnModeling } from '../command/DmnModeling';
import { buildTypeSelect } from './typeSelect';
import { mountDecisionTable } from './DecisionTableView';

export interface EditorDeps {
  views: DmnViews;
  factory: DmnFactory;
  modeling: DmnModeling;
  /** 图侧事件总线（table-js 视图监听 commandStack.changed 重建） */
  eventBus: any;
}

// ---- 通用小件 ----
function el(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function makeTextInput(value: string | undefined, onCommit: (v: string) => void, placeholder?: string): HTMLInputElement {
  const input = document.createElement('input');
  input.className = 'dmn-editor-input';
  input.value = value ?? '';
  if (placeholder) input.placeholder = placeholder;
  input.addEventListener('change', () => onCommit(input.value));
  return input;
}

// ---- 形态切换菜单（简单下拉浮层；当前形态置灰） ----
function kindMenu(current: string, onPick: (kind: string) => void): HTMLElement {
  const wrap = el('div', 'dmn-kind-menu');
  const options: Array<{ kind: string; label: string }> = [
    { kind: 'dmn:DecisionTable', label: 'Decision Table' },
    { kind: 'dmn:LiteralExpression', label: 'Literal Expression' },
    { kind: 'dmn:Context', label: 'Context' },
    { kind: 'dmn:List', label: 'List' },
    { kind: 'dmn:Invocation', label: 'Invocation' },
    { kind: 'dmn:Relation', label: 'Relation' }
  ];
  for (const o of options) {
    const item = el('button', 'dmn-kind-item', o.label);
    if (o.kind === current) item.setAttribute('disabled', '');
    item.addEventListener('click', () => onPick(o.kind));
    wrap.append(item);
  }
  return wrap;
}

/** 点击形态标签弹出切换菜单（简单定位浮层；Escape/外点关闭） */
function openKindMenu(anchor: HTMLElement, current: string, onPick: (kind: string) => void): void {
  const existing = document.querySelector('.dmn-kind-menu');
  existing?.remove();
  const menu = kindMenu(current, (kind) => {
    menu.remove();
    onPick(kind);
  });
  const rect = anchor.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  document.body.append(menu);
  const onDoc = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && e.target !== anchor) {
      menu.remove();
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      menu.remove();
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('mousedown', onDoc);
  document.addEventListener('keydown', onKey);
}

// ---- Decision 编辑器 ----
export function openDecisionEditor(element: any, deps: EditorDeps): void {
  const bo = element.businessObject;
  const body = el('div', 'dmn-decision-editor');
  deps.views.open(element, body);

  // table-js 视图生命周期（决策表形态独占；rerender/关视图时销毁）
  let tableView: { rebuild: () => void; destroy: () => void } | null = null;
  const destroyTableView = (): void => {
    tableView?.destroy();
    tableView = null;
  };
  const onClosed = (): void => {
    destroyTableView();
    deps.eventBus.off('dmnViews.closed', onClosed);
  };
  deps.eventBus.on('dmnViews.closed', onClosed);

  const rerender = () => {
    destroyTableView();
    body.textContent = '';
    renderDecisionBody(body, bo, deps, rerender, (tv) => { tableView = tv; });
  };
  rerender();
}

function renderDecisionBody(
  body: HTMLElement,
  bo: any,
  deps: EditorDeps,
  rerender: () => void,
  mountTable: (tv: { rebuild: () => void; destroy: () => void }) => void
): void {
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
  if (logic.$type === 'dmn:DecisionTable') {
    // 决策表 = table-js 底座（vendored @kunpeng-io/table-js）；
    // 表名/Hit policy 由表内标题条承担（对齐 kunpeng-modeler 版式），视图头槽位留空
    const host = el('div', 'dmn-tablejs-host');
    body.append(host);
    mountTable(mountDecisionTable(host, logic, { factory: deps.factory, modeling: deps.modeling, eventBus: deps.eventBus }));
  } else if (logic.$type === 'dmn:LiteralExpression') {
    renderLiteralExpression(body, bo, logic, deps, rerender, false);
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


// ---- Literal expression（Decision；版式对齐 kunpeng-modeler：名字头/表达式区/属性区 三段） ----
function renderLiteralExpression(body: HTMLElement, bo: any, logic: any, deps: EditorDeps, rerender: () => void, isBkm: boolean): void {
  const host = el('div', 'dmn-literal-expression-container viewer-container');
  body.append(host);

  // ① 名字头（名 21px 就地编辑 + 形态标签入口）
  const props = el('div', 'decision-properties');
  const name = bo.name ?? '';
  const nameEl = el('div', 'decision-name editable', name);
  nameEl.title = `Decision name: ${name}`;
  nameEl.addEventListener('click', () => {
    startNameEdit(props, bo, name, deps, rerender);
  });
  props.append(nameEl);
  const kindTag = el('button', 'dmn-kind-tag', kindLabel(logicKind(logic)));
  kindTag.addEventListener('click', () =>
    openKindMenu(kindTag, logicKind(logic), (kind) => {
      if (kind === logicKind(logic)) return;
      if (isBkm) {
        setBkmBody(bo, kind, deps);
      } else {
        setDecisionLogic(bo, kind, deps);
      }
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
  if (!isBkm) {
    table.append(propertyRow('Variable name:', makeTextInput(bo.get('variable')?.name, (v) => setVariableName(bo, v, deps))));
    table.append(propertyRow('Variable type:', buildTypeSelect(bo.get('variable')?.typeRef, (v) => setVariableTypeRef(bo, v, deps))));
  }
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

/** 名字头就地编辑（对齐决策表标题条交互：点击名→覆盖输入框，Enter/失焦提交） */
function startNameEdit(host: HTMLElement, bo: any, current: string, deps: EditorDeps, rerender: () => void): void {
  const existing = host.querySelector('.decision-name.editing');
  if (existing) return;
  const nameEl = host.querySelector('.decision-name');
  if (!nameEl) return;
  const input = document.createElement('input');
  input.className = 'content-editable-input';
  input.value = current;
  nameEl.textContent = '';
  nameEl.classList.add('editing');
  nameEl.classList.remove('editable');
  nameEl.append(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (save: boolean) => {
    if (done) return;
    done = true;
    if (save && input.value && input.value !== current) {
      deps.modeling.updateModdleProperties(bo, bo, { name: input.value });
    } else {
      rerender();
    }
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
}

// ---- BKM boxed（版式对齐 kunpeng-modeler：header 名 / F(x,y) 网格 body / Result footer） ----
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

export function openBkmEditor(element: any, deps: EditorDeps): void {
  const bo = element.businessObject;
  const body = el('div', 'dmn-bkm-editor');
  deps.views.open(element, body);

  const rerender = () => {
    body.textContent = '';
    renderBkmBody(body, bo, deps, rerender);
  };
  rerender();
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
  nameEl.addEventListener('click', () => startNameEdit(header, bo, name, deps, rerender));
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

// ---- 形态标签文案 ----
function logicKind(expr: any): string {
  return expr?.$type ?? '';
}
function kindLabel(kind: string): string {
  return kind === 'dmn:DecisionTable' ? 'Decision Table'
    : kind === 'dmn:LiteralExpression' ? 'Literal Expression'
      : kind === 'dmn:Context' ? 'Context'
        : kind === 'dmn:List' ? 'List'
          : kind === 'dmn:Invocation' ? 'Invocation'
            : kind === 'dmn:Relation' ? 'Relation'
              : kind || 'Empty';
}
