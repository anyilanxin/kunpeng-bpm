// 家族包构建：两入口（index=Linter 核心 / modeler=画布集成模块）各自全量
// 内联打成 ESM 自包含产物——CJS 规则包（@kunpeng-io/bpmnlint-plugin-kunpeng-compat）
// 经 rollup commonjs 互操作进包，消费端（浏览器 vite / Node）零解析链、零互操作负担。
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { build } from 'vite';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

// 手写类型声明（types/ 为源）随构建拷入产物
cpSync('types', 'dist', { recursive: true });

for (const entry of [ 'index.js', 'modeler.js' ]) {
  await build({
    configFile: false,
    logLevel: 'warn',
    build: {
      lib: {
        entry,
        formats: [ 'es' ],
        fileName: () => entry
      },
      outDir: 'dist',
      emptyOutDir: false,
      minify: false,
      rollupOptions: {
        output: {
          codeSplitting: false
        }
      }
    }
  });
}
