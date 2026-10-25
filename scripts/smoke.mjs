#!/usr/bin/env node
/**
 * 组件产物冒烟：@kunpeng-io/bpmn-js 构建后快速自检。
 * ESM/CJS 导出齐全性 + kunpeng 扩展命名空间常量就位。
 * （Node 无 DOM 不能实例化 Modeler，属预期；浏览器链路由 examples 验收。）
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const esm = await import('../packages/bpmn/bpmn-js/dist/bpmn-js.es.js');
const expected = ['Modeler', 'PlatformModules', 'BpmnModules', 'BpmnElementTypes', 'BpmnI18n', 'SIZES'];
const missing = expected.filter((name) => !(name in esm));
if (missing.length > 0) {
  console.error('ESM 导出缺失:', missing.join(', '));
  process.exit(1);
}

const cjs = require('../packages/bpmn/bpmn-js/dist/bpmn-js.cjs');
if (typeof cjs.Modeler !== 'function') {
  console.error('CJS 导出缺失: Modeler');
  process.exit(1);
}

// 组件自有样式随包发布（exports "./styles" 子路径的产物实体）
const { readFileSync } = await import('node:fs');
const cssPath = new URL('../packages/bpmn/bpmn-js/dist/styles/bpmn-js.css', import.meta.url);
const css = readFileSync(cssPath, 'utf8');
if (!css.includes('.djs-palette .entry svg')) {
  console.error('styles 产物缺失或不含功能性覆写规则');
  process.exit(1);
}

// GPL + Classpath Exception 分发合规（OpenJDK 长式文件头）：JS 产物与类型声明
// 须携带版权头及 Classpath exception 指定句与第三方声明横幅，
// 且不得内联 Apache-2.0 组件（htm 与 GPLv2 不相容，仅可外部依赖）
for (const rel of ['bpmn-js.es.js', 'bpmn-js.cjs']) {
  const js = readFileSync(new URL(`../packages/bpmn/bpmn-js/dist/${rel}`, import.meta.url), 'utf8');
  if (
    !js.includes('Copyright (c) 2026 anyilanxin zxh') ||
    !js.includes('"Classpath" exception as provided') ||
    !js.includes('DO NOT ALTER OR REMOVE COPYRIGHT NOTICES')
  ) {
    console.error(`${rel} 缺版权横幅`);
    process.exit(1);
  }
  if (js.includes('Apache License')) {
    console.error(`${rel} 含 Apache-2.0 代码（htm 应为外部依赖）`);
    process.exit(1);
  }
}
const dts = readFileSync(new URL('../packages/bpmn/bpmn-js/dist/types/index.d.ts', import.meta.url), 'utf8');
if (!dts.includes('Copyright (c) 2026 anyilanxin zxh') || !dts.includes('"Classpath" exception as provided')) {
  console.error('dist/types/index.d.ts 缺版权头');
  process.exit(1);
}

console.log(`smoke ok：ESM ${Object.keys(esm).length} 个导出，CJS Modeler=${typeof cjs.Modeler}，styles 就位，版权横幅就位`);

// ---------- @kunpeng-io/form-js 协议核心冒烟 ----------
const formEsm = await import('../packages/form/form-js/dist/form-js.es.js');
const formExpected = ['FormEngine', 'serializeSchema', 'parseSchema', 'validateSchema', 'FormSchemaError', 'SCHEMA_VERSION'];
const formMissing = formExpected.filter((name) => !(name in formEsm));
if (formMissing.length > 0) {
  console.error('form-js ESM 导出缺失:', formMissing.join(', '));
  process.exit(1);
}
const formCjs = require('../packages/form/form-js/dist/form-js.cjs');
if (typeof formCjs.FormEngine !== 'function' || typeof formCjs.serializeSchema !== 'function') {
  console.error('form-js CJS 导出缺失: FormEngine / serializeSchema');
  process.exit(1);
}

// 样例 Schema：覆盖全部 8 类字段 + group + 联动 + 规则 + 默认值
const sampleSchema = {
  schemaVersion: 1,
  id: 'smoke-form',
  name: '冒烟表单',
  fields: [
    {
      id: 'type',
      type: 'radio',
      label: '类型',
      required: true,
      props: { options: [{ label: '年假', value: 'annual' }, { label: '病假', value: 'sick' }] }
    },
    {
      id: 'reason',
      type: 'textarea',
      label: '事由',
      required: true,
      props: { rows: 3, maxLength: 200 },
      rules: [{ kind: 'minLength', value: 5 }]
    },
    {
      id: 'days',
      type: 'number',
      label: '天数',
      required: true,
      props: { min: 1, max: 30 },
      visibleWhen: { field: 'type', op: 'eq', value: 'annual' }
    },
    { id: 'start', type: 'date', label: '开始日期', rules: [{ kind: 'min', value: '2026-01-01' }] },
    {
      id: 'attachments',
      type: 'checkbox',
      label: '附件',
      props: { options: [{ label: '诊断证明', value: 'diag' }, { label: '请假条', value: 'note' }] }
    },
    { id: 'notify', type: 'switch', label: '邮件通知', defaultValue: true },
    {
      id: 'extra',
      type: 'group',
      label: '补充信息',
      children: [{ id: 'delegate', type: 'text', label: '代理人', visibleWhen: { field: 'days', op: 'notEmpty' } }]
    }
  ]
};

// 结构校验 + 字节级往返：serialize → parse → serialize 逐字节一致
const schemaCheck = formEsm.validateSchema(sampleSchema);
if (!schemaCheck.valid) {
  console.error('样例 Schema 结构校验失败:', schemaCheck.errors.join(' | '));
  process.exit(1);
}
const canonicalJson = formEsm.serializeSchema(sampleSchema);
if (formEsm.serializeSchema(formEsm.parseSchema(canonicalJson)) !== canonicalJson) {
  console.error('form-js 字节级往返不稳定');
  process.exit(1);
}

// 引擎行为：默认值 / 隐藏跳过校验 / 必填拦截 / 越界选项 / 非法 Schema 抛错
const { FormEngine, parseSchema: parse, FormSchemaError } = formEsm;
const engine = new FormEngine(parse(canonicalJson));
const defaults = engine.defaults();
const expectedDefaults = JSON.stringify({
  type: null,
  reason: '',
  days: null,
  start: null,
  attachments: [],
  notify: true,
  delegate: ''
});
if (JSON.stringify(defaults) !== expectedDefaults) {
  console.error('defaults() 与类型默认值不符:', JSON.stringify(defaults));
  process.exit(1);
}
const emptyResult = engine.validate(defaults);
// type 为 null 时 days 被隐藏（visibleWhen 不满足）→ 必填拦截只剩 type 与 reason
if (emptyResult.valid || Object.keys(emptyResult.byField).join(',') !== 'type,reason') {
  console.error('空数据校验不符预期:', JSON.stringify(Object.keys(emptyResult.byField)));
  process.exit(1);
}
const fullResult = engine.validate({
  ...defaults,
  type: 'annual',
  reason: '家中有事需要处理',
  days: 3,
  start: '2026-05-01'
});
if (!fullResult.valid) {
  console.error('合法完整数据校验未通过:', JSON.stringify(fullResult.issues));
  process.exit(1);
}
const optionResult = engine.validate({ ...defaults, type: 'unknown', reason: '家中有事需要处理' });
if (!optionResult.issues.some((issue) => issue.field === 'type' && issue.rule === 'option')) {
  console.error('选项越界未拦截');
  process.exit(1);
}
let threw = false;
try {
  parse('{"schemaVersion": 1, "id": "x", "fields": [{"id": "a", "type": "nope"}]}');
} catch (error) {
  threw = error instanceof FormSchemaError;
}
if (!threw) {
  console.error('非法 Schema 未抛 FormSchemaError');
  process.exit(1);
}

// ---------- 表格字段（table）冒烟 ----------
const tableSchema = {
  schemaVersion: 1,
  id: 'smoke-table',
  fields: [
    {
      id: 'trips',
      type: 'table',
      label: '行程明细',
      required: true,
      props: { minRows: 1, maxRows: 3 },
      columns: [
        { id: 'place', type: 'text', label: '地点', required: true, rules: [{ kind: 'minLength', value: 2 }] },
        { id: 'days', type: 'number', label: '天数', defaultValue: 1, rules: [{ kind: 'min', value: 0.5 }] },
        {
          id: 'transport',
          type: 'select',
          label: '交通',
          props: { options: [{ label: '高铁', value: 'rail' }, { label: '飞机', value: 'flight' }] }
        }
      ]
    },
    { id: 'note', type: 'text', label: '备注', visibleWhen: { field: 'trips', op: 'notEmpty' } }
  ]
};
const tableCheck = formEsm.validateSchema(tableSchema);
if (!tableCheck.valid) {
  console.error('表格样例 Schema 结构校验失败:', tableCheck.errors.join(' | '));
  process.exit(1);
}
const tableJson = formEsm.serializeSchema(tableSchema);
if (formEsm.serializeSchema(formEsm.parseSchema(tableJson)) !== tableJson) {
  console.error('table 字段字节级往返不稳定');
  process.exit(1);
}
// 结构校验反例：列类型越界（group）/ 列携带 visibleWhen / eq 引用 table / minRows>maxRows / defaultValue 行键越界
const tableBad = JSON.parse(JSON.stringify(tableSchema));
tableBad.fields[0].columns[0].type = 'group';
tableBad.fields[0].columns[1].visibleWhen = { field: 'place', op: 'notEmpty' };
tableBad.fields[0].props = { minRows: 3, maxRows: 1 };
tableBad.fields[0].defaultValue = [{ unknown: 1 }];
tableBad.fields.push({ id: 'bad', type: 'text', label: 'x', visibleWhen: { field: 'trips', op: 'eq', value: 1 } });
const tableBadCheck = formEsm.validateSchema(tableBad);
if (tableBadCheck.valid) {
  console.error('table 结构校验反例未被拦截');
  process.exit(1);
}
// 引擎行为：emptyRow / defaults / 空表校验 / 单元格三段定位 / 修复转 valid / 行数上界 / 表引用联动
const tableEngine = new formEsm.FormEngine(tableSchema);
const row = formEsm.emptyRow(tableSchema.fields[0]);
if (JSON.stringify(row) !== JSON.stringify({ place: '', days: 1, transport: null })) {
  console.error('emptyRow 与列初始值不符:', JSON.stringify(row));
  process.exit(1);
}
const tableDefaults = tableEngine.defaults();
if (JSON.stringify(tableDefaults) !== JSON.stringify({ trips: [], note: '' })) {
  console.error('table defaults() 不符:', JSON.stringify(tableDefaults));
  process.exit(1);
}
const emptyTable = tableEngine.validate(tableDefaults);
if (emptyTable.valid || Object.keys(emptyTable.byField).join(',') !== 'trips') {
  console.error('空表校验不符预期（应只剩表级 required+minRows）:', JSON.stringify(Object.keys(emptyTable.byField)));
  process.exit(1);
}
if (!emptyTable.issues.every((issue) => ['required', 'minRows'].includes(issue.rule) && issue.row === undefined)) {
  console.error('表级 issue 不应带行定位:', JSON.stringify(emptyTable.issues));
  process.exit(1);
}
const badCell = tableEngine.validate({ trips: [{ place: '京', days: 0, transport: 'walk' }], note: '' });
const badKeys = Object.keys(badCell.byField).join(',');
if (badKeys !== 'trips[0].place,trips[0].days,trips[0].transport') {
  console.error('单元格三段定位键不符:', badKeys);
  process.exit(1);
}
const placeIssue = badCell.issues.find((issue) => issue.column === 'place');
if (!placeIssue || placeIssue.row !== 0 || placeIssue.rule !== 'minLength') {
  console.error('单元格 issue 定位不符:', JSON.stringify(placeIssue));
  process.exit(1);
}
if (!tableEngine.validate({ trips: [{ place: '北京', days: 1, transport: 'rail' }], note: '' }).valid) {
  console.error('合法行数据校验未通过:', JSON.stringify(badCell.issues));
  process.exit(1);
}
const overRows = tableEngine.validate({ trips: [{ place: '北京', days: 1 }, { place: '上海', days: 1 }, { place: '广州', days: 1 }, { place: '深圳', days: 1 }], note: '' });
if (!overRows.issues.some((issue) => issue.rule === 'maxRows' && issue.field === 'trips')) {
  console.error('行数上界未拦截');
  process.exit(1);
}
if (!tableEngine.isVisible('note', { trips: [{ place: '北京' }], note: '' }) || tableEngine.isVisible('note', { trips: [], note: '' })) {
  console.error('notEmpty 引用 table 的联动判定不符预期');
  process.exit(1);
}

for (const rel of ['form-js.es.js', 'form-js.cjs']) {
  const js = readFileSync(new URL(`../packages/form/form-js/dist/${rel}`, import.meta.url), 'utf8');
  if (!js.includes('Copyright (c) 2026 anyilanxin zxh') || !js.includes('"Classpath" exception as provided')) {
    console.error(`form-js ${rel} 缺版权横幅`);
    process.exit(1);
  }
}

console.log('form-js smoke ok：ESM/CJS 导出、字节级往返、引擎行为（默认值/隐藏跳过/必填/越界/非法抛错）、table（结构校验正反例/emptyRow/三段定位/行数界/表引用联动）、版权横幅');
