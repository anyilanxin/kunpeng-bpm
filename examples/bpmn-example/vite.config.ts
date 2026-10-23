import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  publicDir: false,
  resolve: {
    alias: {
      // 示例与未来 npm 使用方同款写法；别名直连组件源码，
      // 开发热更/示例构建不依赖先产出组件 dist
      // （styles 子路径须先于包根别名声明：rollup 别名按序前缀匹配）
      '@kunpeng-io/bpmn-js/styles': fileURLToPath(
        new URL('../../packages/bpmn/bpmn-js/src/styles/bpmn-js.css', import.meta.url)
      ),
      '@kunpeng-io/bpmn-js': fileURLToPath(
        new URL('../../packages/bpmn/bpmn-js/src/index.ts', import.meta.url)
      )
    }
  },
  server: {
    port: 5177,
    strictPort: true
  },
  build: {
    minify: false,
    sourcemap: true
  }
});
