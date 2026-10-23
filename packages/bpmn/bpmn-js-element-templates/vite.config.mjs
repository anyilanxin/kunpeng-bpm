import path from 'node:path';

import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';

import pkg from './package.json' with { type: 'json' };

const nonbundledDependencies = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.devDependencies });
const nonExternalDependencies = [ 'preact-markup' ];

function copyCssPlugin() {
  return {
    name: 'copy-css',
    async closeBundle() {
      const fse = (await import('fs-extra')).default;
      const fsp = await import('node:fs/promises');

      await fse.ensureDir('./dist/assets');

      try {
        const entries = await fsp.readdir('assets');
        for (const entry of entries) {
          if (entry.endsWith('.css')) {
            await fse.copy(path.join('assets', entry), path.join('./dist/assets', entry));
          }
        }
      } catch { /* no local assets dir */ }
    }
  };
}

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', {
            importSource: '@kunpeng-io/properties-panel/preact',
            runtime: 'automatic'
          }]
        ]
      }
    }),
    copyCssPlugin()
  ],
  define: {
    'process.env.PKG_VERSION': JSON.stringify(pkg.version)
  },
  resolve: {
    alias: {
      react: '@kunpeng-io/properties-panel/preact/compat',
      preact: '@kunpeng-io/properties-panel/preact'
    }
  },
  build: {
    minify: false,
    lib: {
      entry: { index: 'src/index.js', core: 'src/core.js' },
      formats: [ 'cjs', 'es' ],
      fileName: (format, entryName) => {
        if (entryName === 'core') {
          return format === 'es' ? 'core.esm.js' : 'core.js';
        }

        return format === 'es' ? 'index.esm.js' : 'index.js';
      }
    },
    rollupOptions: {
      external: (id) => {
        // Also match unscoped names (e.g. bpmn-js-properties-panel for @kunpeng-io/bpmn-js-properties-panel)
        const unscopedDeps = nonbundledDependencies.map((d) => d.replace(/^@kunpeng-js\//, ''));
        const allDeps = [...nonbundledDependencies, ...unscopedDeps];
        const isExternal = allDeps.some((dep) => id === dep || id.startsWith(dep + '/'));
        const isForceBundle = nonExternalDependencies.some((dep) => id === dep || id.startsWith(dep + '/'));

        return isExternal && !isForceBundle;
      }
    },
    sourcemap: true,
    emptyOutDir: false
  }
});
