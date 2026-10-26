import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Inline CSS and .dmn files as raw text so that test helpers can use the
 * imported content directly (cf. TestHelper#insertCSS).
 */
function rawAssetsPlugin() {
  return {
    name: 'raw-assets',
    enforce: 'pre',
    transform(_code, id) {
      if (/\.(css|dmn)$/.test(id)) {
      // noop; Vitest resolves these via assetsInclude below, returning the
      // file contents as the default export.
        return null;
      }
    }
  };
}

export default defineConfig({
  plugins: [
    rawAssetsPlugin()
  ],
  resolve: {
    alias: [
      { find: 'react', replacement: '@kunpeng/properties-panel/preact/compat' },
      { find: 'react-dom', replacement: '@kunpeng/properties-panel/preact/compat' },
      { find: 'preact', replacement: '@kunpeng/properties-panel/preact' },
      { find: /^src\//, replacement: path.resolve(__dirname, 'src') + '/' },
      { find: /^test\//, replacement: path.resolve(__dirname, 'test') + '/' }
    ]
  },
  esbuild: {
    loader: 'jsx',
    include: [/src\/.*\.js$/, /test\/.*\.js$/],
    jsxImportSource: '@kunpeng/properties-panel/preact',
    jsx: 'automatic'
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' }
    }
  },
  // .dmn fixtures are imported as raw XML strings by the test specs.
  assetsInclude: ['**/*.dmn'],
  define: {
    'process.env': '{}',
    'window.__env__': '{}'
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['test/**/*{Spec,spec}.js'],
    setupFiles: ['./test/globals.js']
  }
});
