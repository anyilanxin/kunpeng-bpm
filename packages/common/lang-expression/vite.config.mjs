import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

const nonbundledDependencies = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });

export default defineConfig({
  build: {
    minify: false,
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: pkg.source,
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: (id) =>
        nonbundledDependencies.some((d) => id === d || id.startsWith(d + '/')) ||
        id.startsWith('@kunpeng-io/'),
    },
  },
});
