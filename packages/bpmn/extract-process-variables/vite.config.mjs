import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

// 依赖保持 external，不打包进产物（与原 rollup 配置一致：仅 min-dash 为运行时依赖）。
const external = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: 'src/index.js',
      formats: [ 'es' ],
      fileName: () => 'index.js'
    },
    rollupOptions: {
      external: (id) => external.some(
        (dep) => id === dep || id.startsWith(dep + '/')
      )
    },
    sourcemap: true,
    emptyOutDir: true
  }
});
