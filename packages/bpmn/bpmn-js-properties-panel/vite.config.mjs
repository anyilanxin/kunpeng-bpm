import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';

import pkg from './package.json' with { type: 'json' };

const nonbundledDependencies = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
const nonExternalDependencies = ['preact-markup'];

/**
 * hyphenToCamel mirrors babel-plugin-react-svg/lib/camelize.js.
 */
function hyphenToCamel(name) {
  return name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function namespaceToCamel(namespace, name) {
  return namespace + name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Convert a CSS declaration string (e.g. "text-align: center; width: 50px")
 * into a JS object literal source, mirroring react-svg-core's cssToObj.
 */
function cssToObjSource(cssText) {
  const obj = {};
  cssText
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .forEach((rule) => {
      const idx = rule.indexOf(':');
      const prop = rule.slice(0, idx).trim();
      const value = rule.slice(idx + 1).trim();
      if (prop) {
        obj[hyphenToCamel(prop)] = value;
      }
    });
  return JSON.stringify(obj);
}

/**
 * Minimal non-validating XML scanner that splits the SVG source into a
 * sequence of opening tags, closing tags, self-closing tags and text nodes.
 * This avoids pulling in a full XML parser dependency.
 */
function tokenizeSvg(svg) {
  const tokens = [];
  let i = 0;
  const len = svg.length;

  while (i < len) {
    if (svg[i] === '<') {
      // skip comments / doctype / CDATA — not expected in icon SVGs but be safe
      if (svg.startsWith('<!--', i)) {
        const end = svg.indexOf('-->', i + 4);
        i = end === -1 ? len : end + 3;
        continue;
      }
      if (svg.startsWith('<!', i) || svg.startsWith('<?', i)) {
        const end = svg.indexOf('>', i);
        i = end === -1 ? len : end + 1;
        continue;
      }
      const end = svg.indexOf('>', i);
      if (end === -1) {
        i = len;
        continue;
      }
      const inner = svg.slice(i + 1, end);
      const isSelfClosing = inner.endsWith('/');
      const tagContent = isSelfClosing ? inner.slice(0, -1) : inner;
      const isClosing = tagContent.startsWith('/');
      tokens.push({
        type: isClosing ? 'close' : isSelfClosing ? 'selfClose' : 'open',
        content: isClosing ? tagContent.slice(1) : tagContent
      });
      i = end + 1;
    } else {
      const next = svg.indexOf('<', i);
      const text = svg.slice(i, next === -1 ? len : next);
      if (text.trim()) {
        tokens.push({ type: 'text', content: text });
      }
      i = next === -1 ? len : next;
    }
  }

  return tokens;
}

function parseTag(content) {
  // Split "tagname attr1=\"v1\" attr2='v2' attr3" into name + attrs.
  const match = content.match(/^\s*([^\s\/]+)/);
  const name = match ? match[1] : 'unknown';
  const rest = content.slice(match ? match[0].length : 0).trim();
  const attrs = [];
  const attrRe = /([^\s=]+)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = attrRe.exec(rest)) !== null) {
    const attrName = m[1];
    const value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : '';
    attrs.push([attrName, value]);
  }
  return { name, attrs };
}

/**
 * Serialize a single attribute to a Preact h() props object entry,
 * applying the same transformations as babel-plugin-react-svg:
 *   class -> className
 *   style="..." -> style={{...}}
 *   stroke-width -> strokeWidth
 *   xmlns:xlink -> xmlnsXlink
 *   data-* / aria-* -> kept as-is
 */
function serializeAttr(key, value) {
  let propName;
  let valueExpr;

  if (key.includes(':')) {
    const [ns, local] = key.split(':');
    propName = namespaceToCamel(ns, local);
    valueExpr = JSON.stringify(value);
  } else if (key === 'class') {
    propName = 'className';
    valueExpr = JSON.stringify(value);
  } else if (key === 'style') {
    propName = 'style';
    valueExpr = cssToObjSource(value);
  } else if (/^(data-|aria-)/.test(key)) {
    propName = JSON.stringify(key);
    valueExpr = JSON.stringify(value);
  } else {
    propName = hyphenToCamel(key);
    valueExpr = JSON.stringify(value);
  }

  // Wrap prop name in quotes when it is a string literal key (data-/aria-).
  const keyExpr = propName.startsWith('"') ? propName : JSON.stringify(propName);
  return `${keyExpr}: ${valueExpr}`;
}

function buildHCall(node) {
  const { name, attrs, children } = node;
  const propsParts = attrs.map(([k, v]) => serializeAttr(k, v));

  // For the root <svg>, spread the component props last (after own attrs),
  // matching babel-plugin-react-svg: <svg width="32" {...props} />
  const isSvgRoot = name.toLowerCase() === 'svg';

  let propsExpr;
  if (isSvgRoot) {
    const objLiteral = propsParts.length ? `{ ${propsParts.join(', ')} }` : '{}';
    propsExpr = `Object.assign({}, ${objLiteral}, props)`;
  } else if (propsParts.length) {
    propsExpr = `{ ${propsParts.join(', ')} }`;
  } else {
    propsExpr = 'null';
  }

  const childExprs = children.map((child) => {
    if (child.type === 'text') {
      return JSON.stringify(child.content.trim());
    }
    return buildHCall(child);
  });

  const childrenArg = childExprs.length ? `, ${childExprs.join(', ')}` : '';
  return `h(${JSON.stringify(name)}, ${propsExpr}${childrenArg})`;
}

function svgToComponentSource(svg) {
  const tokens = tokenizeSvg(svg);
  const root = { name: 'svg', attrs: [], children: [], type: 'element' };
  const stack = [root];

  for (const token of tokens) {
    if (token.type === 'text') {
      stack[stack.length - 1].children.push({ type: 'text', content: token.content });
    } else {
      const { name, attrs } = parseTag(token.content);
      if (token.type === 'close') {
        stack.pop();
      } else {
        const node = { name, attrs, children: [], type: 'element' };
        stack[stack.length - 1].children.push(node);
        if (token.type === 'open') {
          stack.push(node);
        }
      }
    }
  }

  // The tokenizer places everything under a synthetic root; the first real
  // element child is the <svg>.
  const svgNode = root.children.find((c) => c.type === 'element') || root;

  const hCall = buildHCall(svgNode);

  return [
    `import { h } from 'preact';`,
    `export default (props = {}) => ${hCall};`
  ].join('\n');
}

/**
 * Transform .svg imports into Preact components, mirroring the behavior of
 * rollup-plugin-react-svg / react-svg-loader (which uses babel-plugin-react-svg).
 */
function reactSvgPlugin() {
  return {
    name: 'react-svg',
    enforce: 'pre',
    transform(_code, id) {
      if (!id.endsWith('.svg')) {
        return null;
      }

      const svg = readFileSync(id, 'utf-8');
      const code = svgToComponentSource(svg);

      return { code, map: null };
    }
  };
}

export default defineConfig({
  plugins: [
    reactSvgPlugin(),
    babel({
      babelConfig: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', {
            importSource: '@kunpeng-io/properties-panel/preact',
            runtime: 'automatic'
          }]
        ]
      }
    })
  ],
  resolve: {
    alias: {
      react: '@kunpeng-io/properties-panel/preact/compat',
      'react-dom': '@kunpeng-io/properties-panel/preact/compat',
      preact: '@kunpeng-io/properties-panel/preact'
    }
  },
  build: {
    minify: false,
    lib: {
      entry: 'src/index.js',
      formats: ['cjs', 'es', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'index.esm.js';
        if (format === 'umd') return 'bpmn-js-properties-panel.umd.js';
        return 'index.js';
      },
      name: 'BpmnJSPropertiesPanel'
    },
    rollupOptions: {
      external: (id) => {
        const isExternal = nonbundledDependencies.some(
          (dep) => id === dep || id.startsWith(dep + '/')
        );
        const isForceBundle = nonExternalDependencies.some(
          (dep) => id === dep || id.startsWith(dep + '/')
        );

        // CJS/ESM keep deps external; preact-markup is always bundled.
        // UMD will also honor these externals (it is rarely consumed standalone).
        return isExternal && !isForceBundle;
      },
      output: {
        // Provide global names for UMD externals to suppress MISSING_GLOBAL_NAME warnings.
        globals: (id) => id.replace(/[@/.]/g, '_').replace(/-/g, '_')
      }
    },
    sourcemap: true,
    emptyOutDir: false
  }
});
