/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH Classpath-exception-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file that accompanies this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License
 * version 2 along with this work; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * React 渲染器构建：
 * - peer（react / react-dom / antd / dayjs）外部化——含子路径（automatic JSX
 *   运行时 import "react/jsx-runtime"、antd 组件深路径），用前缀正则一体的外置；
 * - @kunpeng-io/form-js 内联自包含（宿主免单独安装协议包）；
 * - JSX 走 esbuild automatic 模式，无需 babel/react 插件（lib 构建无 HMR 需求）。
 */
const peerExternal = /^(react|react-dom|antd|dayjs)(\/.*)?$/;

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  build: {
    minify: false,
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'form-js-react.es.js'
    },
    rollupOptions: {
      external: (id) => peerExternal.test(id.split('?')[0])
    }
  }
});
