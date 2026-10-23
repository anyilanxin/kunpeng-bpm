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
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * 组件库构建（npm 发布产物，scope @kunpeng-io）：
 * - dist/bpmn-js.es.js（ESM）/ .cjs（CJS）
 * - 依赖内联自包含（bpmn-js 发布同款策略）：Node 原生 ESM 可直接 import、
 *   使用方 drop-in 即用（扩展命名空间描述符不内联——由使用方经
 *   moddleExtensions 选项外部注入，组件只内置标准 BPMN 命名空间）
 * - 唯一例外：htm（Apache-2.0）保持外部依赖，守住 GPL-2.0-only 分发物
 *   不含不相容许可代码的合规边界
 * - 类型声明由 tsconfig.lib.json（tsc emitDeclarationOnly）产出到 dist/types
 * - 版权横幅：vite 6 lib 模式不透传 rollupOptions.output.banner（语句与注释
 *   均实测被丢），且 rollup 默认剥离注释——故由 scripts/prepare-dist.mjs
 *   构建后补写 JS 横幅 + d.ts 头并同步 sourcemap 行偏移
 */
export default defineConfig({
  build: {
    minify: false,
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'BpmnWebModeler',
      formats: ['es', 'cjs'],
      fileName: (format) => `bpmn-js.${format === 'es' ? 'es.js' : 'cjs'}`
    },
    rollupOptions: {
      external: (id: string) => id === 'htm' || id.startsWith('htm/')
    }
  }
});
