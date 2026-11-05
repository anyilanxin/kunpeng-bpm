import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  publicDir: false,
  resolve: {
    alias: {
      // 示例与未来 npm 使用方同款写法；别名直连组件源码，热更不依赖 dist
      // （styles 子路径须先于包根别名声明：别名按序前缀匹配）
      '@kunpeng-io/dmn-js/styles': fileURLToPath(
        new URL('../../packages/dmn/dmn-js/src/styles/dmn-js.css', import.meta.url)
      ),
      '@kunpeng-io/dmn-js': fileURLToPath(
        new URL('../../packages/dmn/dmn-js/src/index.ts', import.meta.url)
      )
    }
  },
  server: {
    port: 5179,
    strictPort: true
  },
  build: {
    minify: false,
    sourcemap: true
  }
});
