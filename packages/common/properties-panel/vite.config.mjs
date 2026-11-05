import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';

import pkg from './package.json' with { type: 'json' };

const nonbundledDependencies = Object.keys({ ...pkg.dependencies });

/**
 * 拷贝 src/assets → dist/assets（dist 消费方按相对路径取样式/静态资源）。
 *
 * preact 处理（方案 C，2026-10-28）：不再构建期拷贝 npm preact 到包内并正则
 * 改写其内部 import（vendored 自包含）——preact 是本包 dependencies，构建
 * 外置（external），运行时经依赖解析到同一份 npm preact；包内 `preact/`
 * 目录是常驻的薄转发源文件（exports 子路径入口），非构建产物。
 */
function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    async closeBundle() {
      const fs = await import('node:fs/promises');
      await fs.cp('./src/assets', './dist/assets', { recursive: true });
    }
  };
}

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', {
            importSource: 'preact',
            runtime: 'automatic'
          }],
          // svg 内联组件与 JSX 同源 preact（默认 classic 会生成
          // `import React from 'react'`，旧配置靠 module-resolver 别名兜）
          ['babel-plugin-inline-react-svg', {
            runtime: 'automatic',
            importSource: 'preact'
          }]
        ]
      }
    }),
    copyAssetsPlugin()
  ],
  resolve: {
    alias: {
      // svg 内联组件（babel-plugin-inline-react-svg 固定生成 `import React
      // from 'react'`）解析到 React 兼容层——npm preact/compat 与薄转发
      // 同源，勿 alias 到包内拷贝目录（vendored 已废除）
      react: 'preact/compat'
    }
  },
  build: {
    minify: false,
    lib: {
      entry: 'src/index.js',
      formats: ['cjs', 'es'],
      fileName: (format) => (format === 'es' ? 'index.esm.js' : 'index.js')
    },
    rollupOptions: {
      // 依赖与 preact（含其子路径：hooks/compat/jsx-runtime 等）一律外置，
      // 由消费侧依赖解析（单实例经 pnpm catalog 钉精确版本保障）
      external: (id) =>
        nonbundledDependencies.includes(id) ||
        id === 'preact' ||
        id.startsWith('preact/')
    },
    sourcemap: true,
    emptyOutDir: false
  }
});
