import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import pkg from './package.json' with { type: 'json' };

const nonbundledDependencies = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.devDependencies });
const nonExternalDependencies = [];

/**
 * Transform .svg imports into Preact components.
 * Reads the SVG file and wraps it in a function component that returns
 * the SVG via innerHTML, matching how the icons are consumed as <Icon />.
 */
function svgComponentPlugin() {
  return {
    name: 'svg-to-component',
    enforce: 'pre',
    transform(_code, id) {
      if (!id.endsWith('.svg')) return null;

      const svg = readFileSync(id, 'utf-8');
      // Escape backticks and ${} in SVG content for template literal safety
      const escaped = svg.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

      const code = [
        `import { h } from '@kunpeng/properties-panel/preact';`,
        `import { useEffect, useRef } from '@kunpeng/properties-panel/preact/hooks';`,
        ``,
        `const svgMarkup = \`${escaped}\`;`,
        ``,
        `export default function SvgIcon(props = {}) {`,
        `  const ref = useRef(null);`,
        `  useEffect(() => {`,
        `    if (ref.current) {`,
        `      ref.current.innerHTML = svgMarkup;`,
        `      const svg = ref.current.firstChild;`,
        `      if (svg) {`,
        `        for (const [key, value] of Object.entries(props)) {`,
        `          if (key === 'className') svg.setAttribute('class', value);`,
        `          else if (key !== 'children') svg.setAttribute(key, value);`,
        `        }`,
        `      }`,
        `    }`,
        `  });`,
        `  return h('span', { ref, ...props, dangerouslySetInnerHTML: { __html: svgMarkup } });`,
        `}`
      ].join('\n');

      return { code, map: null };
    }
  };
}

function copyCssPlugin() {
  return {
    name: 'copy-css',
    async closeBundle() {
      const fse = (await import('fs-extra')).default;
      const fsp = await import('node:fs/promises');
      await fse.ensureDir('./dist/assets');

      // Copy properties-panel CSS
      try {
        const ppDir = 'node_modules/@kunpeng/properties-panel/dist/assets';
        const entries = await fsp.readdir(ppDir);
        for (const entry of entries) {
          if (entry.endsWith('.css')) {
            await fse.copy(path.join(ppDir, entry), path.join('./dist/assets', entry));
          }
        }
      } catch { /* properties-panel assets may not exist yet */ }

      // Copy local CSS
      try {
        const localEntries = await fsp.readdir('assets');
        for (const entry of localEntries) {
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
    svgComponentPlugin(),
    babel({
      babelConfig: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', {
            importSource: '@kunpeng/properties-panel/preact',
            runtime: 'automatic'
          }]
        ]
      }
    }),
    copyCssPlugin()
  ],
  resolve: {
    alias: {
      react: '@kunpeng/properties-panel/preact/compat',
      preact: '@kunpeng/properties-panel/preact'
    }
  },
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['cjs', 'es'],
      fileName: (format) => format === 'es' ? 'index.esm.js' : 'index.js'
    },
    rollupOptions: {
      external: (id) => {
        const isExternal = nonbundledDependencies.some(dep => id === dep || id.startsWith(dep + '/'));
        const isForceBundle = nonExternalDependencies.some(dep => id === dep || id.startsWith(dep + '/'));
        return isExternal && !isForceBundle;
      }
    },
    sourcemap: true,
    emptyOutDir: false
  }
});
