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
