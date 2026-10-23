# Kunpeng BPM

English | [简体中文](README.zh-CN.md)

[![Stars](https://img.shields.io/github/stars/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/stargazers)
[![Forks](https://img.shields.io/github/forks/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/network/members)
[![Contributors](https://img.shields.io/github/contributors/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/graphs/contributors)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/commits)
[![Release](https://img.shields.io/github/v/release/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/releases)
[![Issues](https://img.shields.io/github/issues/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/issues)

Kunpeng BPM is a web-based **BPMN 2.0** modeling toolchain (**pnpm + turbo** monorepo, built with **Vite** and **TypeScript**): a full-featured process modeler (events, tasks, gateways, subprocesses, pools & lanes, horizontal / vertical layout switching, connection and label editing, element colors, undo / redo, standard BPMN 2.0 XML round-trip and SVG export), plus properties panels, a FEEL expression toolchain and Vue 3 integration examples.

**Why Kunpeng BPM?**

* Model with the open [BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2) standard; standard XML in and out
* Self-contained ESM / CJS bundles with complete TypeScript declarations — works in Node and bundlers out of the box
* Modeler core under GPL-2.0-with-Classpath-exception — free to link and call from applications of any license
* Built-in Chinese (zh-CN) UI, injectable dictionaries for any language
* Preview / edit modes, read-only viewers, pluggable properties panel and element colors out of the box
* Vue 3 example to embed the modeler into your application quickly

## Packages

| Package | Description | License |
| --- | --- | --- |
| `@kunpeng-io/bpmn-js` | BPMN 2.0 modeler / viewer core (TypeScript) | GPL-2.0-with-CE |
| `@kunpeng-io/kunpeng-bpmn-moddle` | Kunpeng BPMN extension metamodel | MIT |
| `@kunpeng-io/bpmn-js-properties-panel` | BPMN properties panel | MIT |
| `@kunpeng-io/bpmn-js-element-templates` | Element templates | MIT |
| `@kunpeng-io/element-templates-json-schema` / `-validator` | Template JSON schema and validation | MIT |
| `@kunpeng-io/extract-process-variables` | Process variable extraction | MIT |
| `@kunpeng-io/bpmn-js-behaviors` / `@kunpeng-io/linting` | Behavior extensions / linting integration | MIT |
| `@kunpeng-io/properties-panel` | Shared properties panel foundation | MIT |
| `@kunpeng-io/expression-analyzer` / `-builtins` / `-editor` / `-lint` | Expression parsing / builtins / editor / linting | MIT |
| `@kunpeng-io/lang-expression` / `@kunpeng-io/lezer-expression` | Expression language support and Lezer grammar | MIT |

## Getting Started

```bash
pnpm install
pnpm dev         # Vue 3 example (http://localhost:5177)
pnpm build       # build component packages + example
pnpm typecheck
pnpm smoke       # Node smoke test of the built artifacts
```

Use as a library:

```ts
import { Modeler } from '@kunpeng-io/bpmn-js';
import 'diagram-js/assets/diagram-js.css';
import '@kunpeng-io/bpmn-js/styles';

const modeler = new Modeler({ container: '#canvas' });
await modeler.importXML(xml);
const { xml: out } = await modeler.saveXML();
```

Three instantiation flavors — edit services are wired per flavor, so programmatic paths are restricted as well, not just the UI:

```ts
import { Modeler, NavigatedViewer, Viewer } from '@kunpeng-io/bpmn-js';

new Modeler({ container });          // full modeling (palette / context pad / undo / direct editing …)
new NavigatedViewer({ container });  // read-only + canvas navigation
new Viewer({ container });           // pure viewing (render + import / export + element events)
```

Highlights:

* **Preview / edit modes** — `mode: 'preview'` option or runtime `modeler.setMode('preview')`, with a `mode.changed` event for host UI sync
* **Element colors** — `modeling.setColor(element, { fill?, stroke? })`, stored as `bioc:fill` / `bioc:stroke` DI attributes and round-tripped through XML
* **Horizontal / vertical layout** — switch the whole model between horizontal and vertical pools with a single command, XML round-trip stable
* **Extension namespaces** — the Kunpeng extension ships built-in; inject further business namespaces via `moddleExtensions`, round-trip lossless
* **Properties panel** — drop-in modules from `@kunpeng-io/bpmn-js-properties-panel` (see the [example](/examples/bpmn-example) for wiring)
* **Model utilities** — public exports `is` / `isAny` / `getBusinessObject` / `getLabel` / `setLabel` and friends for plugins and host code

## Helpful Links

* [User Guide](./docs/user-guide/README.md) — how-to guides (topics land here over time)
* [Example app](/examples/bpmn-example) — Vue 3 integration (toolbar, properties panel, colors, import / export)
* Component source — [`packages/bpmn/bpmn-js`](/packages/bpmn/bpmn-js)
* [Changelog](./CHANGELOG.md)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=anyilanxin/kunpeng-bpm&type=Date)](https://star-history.com/#anyilanxin/kunpeng-bpm&Date)

## License

**Default license: MIT** — everything in this repository is MIT unless explicitly stated otherwise. **Exception:** the modeler core — `@kunpeng-io/bpmn-js` — is **GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0** (distributing modified or extended versions of the library itself must stay open under the GPL with source, while independent modules linking or calling the library are free to use any license). The root [LICENSE](/LICENSE) states this designation, the root [NOTICE](/NOTICE) carries the copyright attribution, and full license texts are kept under [`licenses/`](/licenses).

### 1. Available Licenses

1. [MIT](./licenses/MIT.txt) — the default; all packages except the modeler core (including `@kunpeng-io/kunpeng-bpmn-moddle`)
2. [GPL-2.0](./licenses/GPL-2.0.txt) WITH [CLASSPATH-EXCEPTION-2.0](./licenses/CLASSPATH-EXCEPTION-2.0.txt) — the sole exception package `packages/bpmn/bpmn-js`

### 2. License Notices

1. The license of each package is designated by this project. Core source files carry a long-form license header — copyright notice, an `SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0` line, and the per-file "Classpath" exception designation as provided in the LICENSE file. Licensing and compliance inquiries go through the channels in section 3 below
2. Modules with special licensing handling carry their own set: the modeler core ships its own `LICENSE` + `NOTICE` + `licenses/` directory (GPL and Classpath-exception full texts); every npm package carries its own `LICENSE` so the governing text ships with its distribution
3. Please do not touch copyright headers: third-party copyright and attribution notices kept in files must be preserved as they are
4. Header-less files (markdown / json / assets) default to MIT

### 3. Compliance Feedback & Oversight

This repository incorporates and adapts multiple third-party open-source projects. We make good-faith efforts to comply with every third-party license, but the combination of multiple licenses is complex and unintended violations may still exist (e.g. missing attribution or mis-designated licensing).

If you find a license violation, copyright misattribution, or any other compliance concern, please reach out:

1. Open a [GitHub Issue](https://github.com/anyilanxin/kunpeng-bpm/issues/new)
2. Email anyilanxin@aliyun.com

We commit to verifying every report promptly and, once confirmed, fixing it within a reasonable timeframe (fixing attribution, re-designating the license, or removing the code) with the outcome published on the issue.

### 4. Disclaimer

1. This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement.
2. In no event shall the author or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.
3. This software is intended for lawful process modeling use only. Users are responsible for ensuring compliance with applicable laws and regulations when deploying or redistributing it.
