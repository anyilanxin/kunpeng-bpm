English | [简体中文](CHANGELOG.zh-CN.md)

# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/), and entries follow the repository's commit convention (`feat` / `fix` / `refactor` / `perf`).

## [Unreleased]

## [0.1.0] - 2026-10-23

Initial release: a web-based BPMN 2.0 modeling toolchain — a full-featured process modeler plus metamodel extensions, properties panels, a FEEL expression toolchain and Vue 3 integration examples, managed as a pnpm + turbo monorepo.

### Added

**Modeler core**

- BPMN 2.0 modeler / viewer core (`@kunpeng-io/bpmn-js`): events, tasks, gateways, subprocesses, pools & lanes, connections and labels
- Three instantiation flavors — `Modeler` (full modeling), `NavigatedViewer` (read-only + canvas navigation), `Viewer` (pure viewing); editing services are wired per flavor, so programmatic paths are restricted as well, not just the UI
- Preview / edit modes — `mode: 'preview'` option or runtime `modeler.setMode('preview')`, with a `mode.changed` event for host UI sync
- Element colors — `modeling.setColor`, stored as `bioc:fill` / `bioc:stroke` DI attributes and round-tripped through XML
- Horizontal / vertical layout — switch the whole model between horizontal and vertical pools with a single command, XML round-trip stable
- Undo / redo, connection and label editing, standard BPMN 2.0 XML import / export round-trip, and SVG export
- Built-in Chinese (zh-CN) UI; injectable dictionaries for any language
- Model utilities as public exports — `is` / `isAny` / `getBusinessObject` / `getLabel` / `setLabel` and friends
- Self-contained ESM / CJS bundles with complete TypeScript declarations — usable in Node and bundlers out of the box

**Metamodels & namespaces**

- Kunpeng BPMN extension metamodel shipped built-in (`@kunpeng-io/kunpeng-bpmn-moddle`); further business namespaces injectable via `moddleExtensions`, round-trip lossless
- BPMN semantic model extensions (`@kunpeng-io/bpmn-moddle`)

**Properties panel & templates**

- BPMN properties panel (`@kunpeng-io/bpmn-js-properties-panel`) on a shared properties-panel foundation (`@kunpeng-io/properties-panel`)
- Element templates (`@kunpeng-io/bpmn-js-element-templates`) with JSON schema and validator packages (`@kunpeng-io/element-templates-json-schema`, `@kunpeng-io/element-templates-validator`)
- Process variable extraction (`@kunpeng-io/extract-process-variables`)
- Behavior extensions and linting integration (`@kunpeng-io/bpmn-js-behaviors`, `@kunpeng-io/linting`)

**Expression toolchain**

- FEEL expression toolchain: analyzer, builtins, editor and lint (`@kunpeng-io/expression-analyzer`, `-builtins`, `-editor`, `-lint`)
- Expression language support and Lezer grammar (`@kunpeng-io/lang-expression`, `@kunpeng-io/lezer-expression`)

**Examples & repository**

- Vue 3 integration example — toolbar, properties panel, element colors, import / export
- pnpm + turbo monorepo (workspace `packages/*/*` + `examples/*`), Vite lib builds, TypeScript type checks, and a Node smoke test of the built artifacts (`pnpm smoke`)
- Bilingual `docs/user-guide/` index reserved as the home for upcoming how-to guides (one `topic.md` / `topic.zh-CN.md` pair per topic; each guide is brief prose plus pointers to the full files and directories)
- Dual licensing: the modeler core (`@kunpeng-io/bpmn-js`) under GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0, all remaining packages (including `@kunpeng-io/kunpeng-bpmn-moddle`) under MIT
- License layout: short root `LICENSE` + `NOTICE` + full texts under `licenses/`; the modeler core carries its own `LICENSE` + `NOTICE` + `licenses/` set, and every npm package ships its own `LICENSE`
