/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
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
 * 构建后置步骤（与 bpmn-js 同款机制）：
 * 1) src/styles → dist/styles（经 package.json exports "./styles" 子路径发布）；
 * 2) JS 产物注入版权横幅——vite lib 模式不透传 rollupOptions.output.banner
 *    （注释与语句均实测丢弃，且 rollup 打包默认剥离源码注释），故构建后补写；
 *    sourcemap 同步在 mappings 头部补 N 个分号（分号=生成物换行，VLQ 段内
 *    相对增量不受影响），保证补写后映射不错位；
 * 3) dist/types/**.d.ts 补文件级版权头（tsc 声明产物不带注释）。
 */
import { cpSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(pkgRoot, 'dist');

// ---- 1) 样式 ----
const stylesSrc = join(pkgRoot, 'src/styles');
const stylesDist = join(dist, 'styles');
if (!existsSync(stylesSrc)) {
  console.error('prepare-dist: src/styles 不存在');
  process.exit(1);
}
cpSync(stylesSrc, stylesDist, { recursive: true });
console.log('prepare-dist: src/styles -> dist/styles');

// ---- 2) JS 横幅 ----
const banner = `/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
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
 *
 * 本分发包以内联方式包含以下第三方组件，著作权归各自作者所有，按其原始
 * MIT / ISC 许可随包再分发（该两式许可与 GPLv2 相容，须保留本声明）：
 *   diagram-js                  MIT  © 2014-present Camunda Services GmbH
 *   @bpmn-io/diagram-js-ui      MIT  © 2022-present Camunda Services GmbH
 *   object-refs                 MIT  © 2014-present Camunda Services GmbH
 *   path-intersection           MIT  © 2017 camunda Services GmbH
 *   min-dash                    MIT  © 2017-present Camunda Services GmbH
 *   min-dom                     MIT  © 2014 Nico Rehwaldt
 *   ids                         MIT  © 2014 camunda Services GmbH
 *   didi                        MIT  © 2013 Vojta Jína, © 2015-present Nico Rehwaldt
 *   tiny-svg                    MIT  © 2014 Nico Rehwaldt, © 2015-present Camunda Services GmbH
 *   clsx                        MIT  © Luke Edwards
 *   preact                      MIT  © 2015-present Jason Miller
 *   domify                      MIT  © TJ Holowaychuk
 *   inherits-browser            ISC  © 2022-present Nico Rehwaldt, © 2011-2022 Isaac Z. Schlueter
 *   dmn-moddle                  MIT  © 2015-present Camunda Services GmbH
 *   moddle                      MIT  © 2014-present Camunda Services GmbH
 *   moddle-xml                  MIT  © 2014-present Camunda Services GmbH
 *
 * Apache-2.0 组件（htm）不内联：Apache-2.0 与 GPLv2 不相容，本 GPL-2.0-only
 * 分发物不含其源码，运行时以外部依赖解析（见 package.json dependencies）。
 */
`;
const bannerLines = banner.split('\n').length - 1;

for (const name of ['dmn-js.es.js', 'dmn-js.cjs']) {
  const file = join(dist, name);
  if (!existsSync(file)) {
    console.error(`prepare-dist: ${name} 不存在`);
    process.exit(1);
  }
  let code = readFileSync(file, 'utf8');
  if (code.startsWith('/*')) {
    console.warn(`prepare-dist: ${name} 已有横幅，跳过`);
  } else {
    writeFileSync(file, banner + code);
    const mapFile = `${file}.map`;
    if (existsSync(mapFile)) {
      const map = JSON.parse(readFileSync(mapFile, 'utf8'));
      // 生成物头部新增 bannerLines 行：mappings 前补同数量空行（分号），段内增量不动
      map.mappings = ';'.repeat(bannerLines) + map.mappings;
      writeFileSync(mapFile, JSON.stringify(map));
    }
    console.log(`prepare-dist: banner -> ${name}`);
  }
}

// ---- 3) d.ts 版权头 ----
const header = `/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
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
`;
let dtsCount = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
    } else if (name.endsWith('.d.ts')) {
      const text = readFileSync(p, 'utf8');
      if (!text.includes('anyilanxin')) {
        writeFileSync(p, header + text);
        dtsCount += 1;
      }
    }
  }
})(join(dist, 'types'));
console.log(`prepare-dist: d.ts 版权头 ${dtsCount} 个文件`);
