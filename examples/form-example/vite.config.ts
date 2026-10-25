import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  publicDir: false,
  resolve: {
    alias: {
      // 与 npm 使用方同款写法；别名直连包源码，开发热更不依赖先产出 dist
      '@kunpeng-io/form-js': fileURLToPath(new URL('../../packages/form/form-js/src/index.ts', import.meta.url)),
      '@kunpeng-io/form-js-vue': fileURLToPath(
        new URL('../../packages/form/form-js-vue/src/index.ts', import.meta.url)
      ),
      '@kunpeng-io/form-js-react': fileURLToPath(
        new URL('../../packages/form/form-js-react/src/index.ts', import.meta.url)
      )
    }
  },
  server: {
    port: 5178,
    strictPort: true
  },
  build: {
    minify: false,
    sourcemap: true
  }
});
