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
 * 标题条（table.before）：决策名就地编辑 + 竖分隔线 + Hit policy 下拉浮层
 * （词表/说明对齐 DMN 1.6 §7.2.4）。
 */
import { createElement } from 'inferno-create-element';
import { HIT_POLICIES } from './sheet';
import type { EditState } from './editing';
import { editInput } from './editing';
import type { DmnModeling } from '../../command/DmnModeling';

export function createTitleBar(opts: {
  table: any;
  decisionBo: any;
  edit: EditState;
  modeling: DmnModeling;
  rerender: () => void;
  cancelEdit: () => void;
}) {
  const h = createElement;
  const { table, decisionBo, edit, modeling, rerender, cancelEdit } = opts;

  const PropertiesBar = () => {
    const name = decisionBo?.get('name') ?? '';
    const hp = table.get('hitPolicy') ?? 'UNIQUE';
    const entry = HIT_POLICIES.find((p) => p.value === hp) ?? HIT_POLICIES[0];
    const isEditingName = edit.kind === 'colname' && edit.cellId === '__decision_name';
    const nameEl = isEditingName
      ? h('div', { class: 'decision-table-name editing' }, [
          editInput(name, (v) => {
            edit.cellId = null;
            edit.kind = null;
            if (v && v !== name) modeling.updateModdleProperties(decisionBo, decisionBo, { name: v });
          }, cancelEdit)
        ])
      : h('div', {
          class: 'decision-table-name editable',
          title: `Decision name: ${name}`,
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            edit.cellId = '__decision_name';
            edit.kind = 'colname';
            rerender();
          }
        }, name);
    return h('div', { class: 'decision-table-properties' }, [
      nameEl,
      h('div', { class: 'decision-table-header-separator' }),
      h('div', { class: 'hit-policy header', title: entry.explanation }, [
        h('label', { class: 'dms-label' }, 'Hit policy:'),
        h('div', { class: 'hit-policy-edit-policy-select dms-input-select' }, [
          h('div', {
            class: 'dms-input',
            tabIndex: 0,
            onClick: (e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              openHitPolicyMenu(e.currentTarget as HTMLElement);
            }
          }, entry.label),
          h('span', { class: 'dms-input-select-icon' }, '\u25BE')
        ])
      ])
    ]);
  };

  const openHitPolicyMenu = (anchor: HTMLElement): void => {
    document.querySelector('.hit-policy-options')?.remove();
    const current = table.get('hitPolicy') ?? 'UNIQUE';
    const menu = document.createElement('div');
    menu.className = 'dms-select-options hit-policy-options';
    for (const p of HIT_POLICIES) {
      const option = document.createElement('div');
      option.className = 'option' + (p.value === current ? ' active' : '');
      option.textContent = p.label;
      option.title = p.explanation;
      option.addEventListener('click', (e) => {
        e.preventDefault();
        menu.remove();
        modeling.updateModdleProperties(table, table, { hitPolicy: p.value });
      });
      menu.append(option);
    }
    const host = anchor.closest('.dmn-tablejs-host') as HTMLElement ?? document.body;
    const aRect = anchor.getBoundingClientRect();
    const hRect = host.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${aRect.bottom - hRect.top + 4}px`;
    menu.style.left = `${aRect.left - hRect.left}px`;
    menu.style.zIndex = '60';
    host.append(menu);
    const onDoc = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== anchor) {
        menu.remove();
        document.removeEventListener('mousedown', onDoc, true);
      }
    };
    document.addEventListener('mousedown', onDoc, true);
  };

  return { PropertiesBar, openHitPolicyMenu };
}
