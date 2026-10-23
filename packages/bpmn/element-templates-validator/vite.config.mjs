import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };
import { createStandaloneKunpengValidator } from './tasks/createStandaloneValidator.js';

const standaloneValidatorPath = createStandaloneKunpengValidator();

const externalDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
];

export default defineConfig({
  resolve: {
    alias: {
      './validateKunpeng': standaloneValidatorPath
    }
  },
  build: {
    minify: false,
    lib: {
      entry: pkg.source,
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs')
    },
    rollupOptions: {
      external: (id) => externalDeps.some((d) => id === d || id.startsWith(d + '/'))
    },
    emptyOutDir: false
  }
});
