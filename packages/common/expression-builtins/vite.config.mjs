import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

const externalDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
];

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: './src/index.js',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs')
    },
    rollupOptions: {
      external: (id) => externalDeps.some((d) => id === d || id.startsWith(d + '/'))
    },
    emptyOutDir: false
  }
});
