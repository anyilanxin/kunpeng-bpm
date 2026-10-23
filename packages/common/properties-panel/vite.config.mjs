import path, { parse as parsePath, relative as relativePath } from 'node:path';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import { replaceInFile } from 'replace-in-file';

import pkg from './package.json' with { type: 'json' };

const nonbundledDependencies = Object.keys({ ...pkg.dependencies });

/**
 * Monkey-patch preact subpackages to import from the local package via relative path.
 */
async function rewirePreactSubpackages() {
  await replaceInFile({
    files: './preact/**/*.{js,mjs,js.map}',
    from: [
      /(import\s*['"])preact([/'"])/g,
      /(from\s*['"])preact([/'"])/g,
      /(require\(['"])preact([/'"])/g
    ],
    to(...args) {
      const afterImport = args[2];
      const filePath = args.pop();
      const importGroup = args[1];

      const { dir } = parsePath(filePath);
      const posixPathToPreact = relativePath(dir, './preact')
        .split(path.sep)
        .join(path.posix.sep);
      return `${importGroup}${posixPathToPreact}${afterImport}`;
    }
  });
}

/**
 * Copy vendored preact and assets, then rewire preact subpackage imports.
 *
 * NOTE: The `build` and `lib` scripts both run `vite build` and may execute
 * concurrently under turbo. They share the same `./preact` output directory,
 * so the vendoring step is guarded by a lockfile to serialize the writes and
 * avoid `ENOENT`/`ENOTEMPTY` races between the two processes.
 */
async function withLock(lockFile, action) {
  const fs = await import('node:fs/promises');
  const lockDir = `${lockFile}.lock`;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // mkdir is atomic on most filesystems — use it as a cross-process lock.
  const maxAttempts = 600; // up to ~60s
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fs.mkdir(lockDir);
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      await sleep(100);
    }
  }
  try {
    await action();
  } finally {
    await fs.rm(lockDir, { recursive: true, force: true });
  }
}

function preactVendoringPlugin() {
  return {
    name: 'preact-vendoring',
    async closeBundle() {
      const fse = (await import('fs-extra')).default;
      const fs = await import('node:fs/promises');

      await withLock('./preact.vendoring-lock', async () => {
        // Start from a clean slate so repeated builds don't collide with the
        // previously vendored (and already-rewired) files. Use the native
        // recursive `rm` with retries because fs-extra's `remove` can fail with
        // `ENOTEMPTY` on pnpm-managed node_modules (symlinked preact) and when
        // file handles are still being released by the bundler.
        const cleanDir = async (target) => {
          await fs.rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          await fse.ensureDir(target);
        };
        await cleanDir('./preact');

        // Copy node_modules/preact/* → preact/ (recursively, including dist/).
        // Resolve the real path because node_modules/preact is a pnpm symlink.
        const preactSrc = await fs.realpath('node_modules/preact');
        const preactEntries = await fs.readdir(preactSrc);
        for (const entry of preactEntries) {
          const src = path.join(preactSrc, entry);
          // fse.copy handles both files and directories recursively.
          await fse.copy(src, path.join('./preact', entry));
        }

        // Copy src/assets → dist/
        await fse.copy('./src/assets', './dist/assets');

        // Rewire preact subpackage imports to relative paths
        await rewirePreactSubpackages();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', {
            importSource: 'preact',
            runtime: 'automatic'
          }],
          'babel-plugin-inline-react-svg',
          ['babel-plugin-module-resolver', {
            alias: {
              preact: './preact',
              react: './preact/compat'
            }
          }]
        ]
      }
    }),
    preactVendoringPlugin()
  ],
  resolve: {
    alias: {
      preact: path.resolve(__dirname, './preact'),
      react: path.resolve(__dirname, './preact/compat')
    }
  },
  build: {
    minify: false,
    lib: {
      entry: 'src/index.js',
      formats: ['cjs', 'es'],
      fileName: (format) => (format === 'es' ? 'index.esm.js' : 'index.js')
    },
    rollupOptions: {
      external: [
        ...nonbundledDependencies,
        /\.\/preact/
      ]
    },
    sourcemap: true,
    emptyOutDir: false
  }
});
