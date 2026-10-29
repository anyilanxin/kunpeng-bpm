# Rule authoring guide

How to add and change rules in this plug-in, and the non-obvious contracts a rule participates in.

For _whether_ a rule should exist, use the [new rule template](../.github/ISSUE_TEMPLATE/NEW_RULE.md). This guide covers _how_ to build one so it fits the library.

## Contents

- [Where this library sits](#where-this-library-sits)
- [Anatomy of a rule](#anatomy-of-a-rule)
- [Severity: error vs. warn](#severity-error-vs-warn)
- [Versioning and configuration](#versioning-and-configuration)
- [Reporting](#reporting)
- [Detecting Camunda concepts (encode the contract once)](#detecting-camunda-concepts-encode-the-contract-once)
- [Validating against the real runtime, not the modeler](#validating-against-the-real-runtime-not-the-modeler)
- [Testing](#testing)
- [Wiring a new rule in](#wiring-a-new-rule-in)
- [Checklist](#checklist)

## Where this library sits

A rule you write here is consumed through **two perspectives**, and it must work in both.

- **CLI / build-time linting** — this package is a plain [bpmnlint](https://github.com/bpmn-io/bpmnlint) plugin. Users add `plugin:camunda-compat/<config>` to a `.bpmnlintrc`, and rules run from the terminal or CI against `.bpmn` files. No modeler, no properties panel — just the diagram XML, a config, and a report. This is the perspective your rule specs and the `test/**/integration` specs exercise.
- **In-app linting** — the same rules power the "problems" experience inside Desktop and Web Modeler. There, a report must be human-readable and **click-to-focus**: selecting it highlights the offending element and opens the relevant properties-panel entry. This perspective is composed downstream and is only **half** delivered by this package — you contribute a machine-readable finding; [`@camunda/linting`](https://github.com/camunda/linting) and the properties panel turn it into a version-aware message and click-to-focus navigation.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the system-level view of how the libraries compose.

## Anatomy of a rule

A rule is a module exporting a factory that returns `{ check }`. Almost every rule wraps the factory in `skipInNonExecutableProcess` so it never fires on non-executable processes.

```js
const { is } = require('bpmnlint-utils');

const { reportErrors } = require('../utils/reporter');
const { ERROR_TYPES } = require('../utils/error-types');
const { skipInNonExecutableProcess } = require('../utils/rule');
const { annotateRule } = require('../helper');

module.exports = skipInNonExecutableProcess(function (config = {}) {
  const { version } = config;

  function check(node, reporter) {
    // early guard checking if rule applies
    if (!is(node, 'bpmn:Task')) {
      return;
    }

    // ... detect the violation ...

    reportErrors(node, reporter, {
      message: 'Human-readable, actionable message.',
      data: { type: ERROR_TYPES.SOME_ERROR },
    });
  }

  // attach the docs URL — see "Documenting a rule" below
  return annotateRule('my-rule', { check });
});
```

The factory receives `config` with `{ version, platform }` (`platform` defaults to `camunda-cloud`). Keep the `check` function flat and early-return heavy: bail as soon as the node is out of scope. A reader should be able to see the guard conditions before the logic.

**Documenting a rule.** A rule attaches its docs URL through `meta.documentation`. Two ways to do it:

- `annotateRule(ruleName, { check })` ([`rules/helper.js`](../rules/helper.js)) derives the modeling-guidance page URL from the rule name (`https://docs.camunda.io/docs/components/modeler/reference/modeling-guidance/rules/<ruleName>/`). Use it when the rule's canonical docs **is** its modeling-guidance page.
- Manual `return { meta: { documentation: { url } }, check }` — use it to point at a specific external source of truth (an engine/connector doc or migration guide) instead of the generated modeling-guidance URL. [`zeebe-user-task`](../rules/camunda-cloud/zeebe-user-task.js) does this, linking the user-task migration docs.

`annotateRule` also merges any `meta.documentation` you pass — an explicit `url` overrides the derived one.

Errors contain `data`, the machine-readable payload attached to each finding: It is distinct from the human-readable `message`. See [Reporting](#reporting) for the full error shape.

## Severity: error vs. warn

> The linter core determines severity **per rule**. A single rule cannot "error" on one finding and "warn" on another — its severity is fixed by the config (see [`index.js`](../index.js)).

This has a direct design consequence: **findings that need different severities must live in different rules.** Do not try to soften or escalate individual reports inside one rule.

Classify by _intent_, not by _detectability_ (both an error and a warning can be statically detectable):

- **Error** — there is **no legitimate reading**. The model is a mistake; the thing silently does nothing (or throws) at runtime and no plausible intent produces it. Example: [`element-type`](../rules/camunda-cloud/element-type/index.js) flags an element type the target Camunda version cannot run — it will never deploy, so no intent produces a working model.
- **Warning** — a **plausible, not-obviously-wrong attempt** that may just not work as intended. Example: [`connector-properties`](../rules/camunda-cloud/connector-properties/index.js) warns on a connector property that is only supported from a later version — a reasonable model that works once the runtime is upgraded.

When a single rule accretes both flavors, split it. If the split feels arbitrary, that is a signal the classification principle above is not being applied — re-derive from "is there any legitimate reading?" rather than from wording.

## Versioning and configuration

Rules receive `config` with `{ version, platform }`. The active severity and the version handed to a rule come from the per-version config maps in [`index.js`](../index.js) (`camundaCloud88Rules`, etc.). A rule is only in scope for a version if it is listed there.

- Use `greaterOrEqual(version, '8.x')` (from [`rules/utils/version`](../rules/utils/version.js)) to fork behavior by version rather than branching on hardcoded assumptions.
- `skipInNonExecutableProcess` already reads `version`/`platform`; you rarely need to touch platform directly.
- **Moddle caveat:** an extension element or attribute only parses if the pinned `zeebe-bpmn-moddle` (see [`package.json`](../package.json)) knows it. A marker that "should" exist may silently drop until the moddle ships it. Gate forward-looking detection behind a version check and cover the inert branch with a test that documents the state (see how [`element-type`](../rules/camunda-cloud/element-type/config.js) gates newer element types and event definitions per version).

## Reporting

Always report through `reportErrors(node, reporter, errors)` ([`rules/utils/reporter.js`](../rules/utils/reporter.js)). It attaches the element name automatically and accepts one error or an array.

A finding is `{ message, data, path?, paths? }` and carries two machine-readable contracts, each consumed by a different downstream layer (see [`ARCHITECTURE.md`](./ARCHITECTURE.md#the-two-contracts)):

- **`data`** drives the **message**.
- **`path`** / **`paths`** drive the **navigation** to a properties-panel entry.

The raw `message` is only a plain-text fallback. **A rule never constructs a properties-panel entry id** — it reports _where_ (a moddle path), and the panel resolves _which entry_ renders that location (standard field or element-template field). This is what keeps a rule render-agnostic.

### `data` — drives the message

`data.type` is the primary key: a stable [`ERROR_TYPES`](../rules/utils/error-types.js) code (treat it as public API — do not rename lightly). The remaining fields describe the finding so `@camunda/linting`'s `getErrorMessage` can compose a precise, version-aware message (e.g. inserting `allowedVersion`) without re-parsing your text. Emit every field that applies:

| field | meaning |
| --- | --- |
| `type` | stable `ERROR_TYPES` code; selects the message downstream |
| `node` | the offending moddle element (e.g. `zeebe:CalledDecision`) |
| `parentNode` | the element the report is anchored to (`null` when it is `node` itself) |
| `property` / `requiredProperty` | the property at fault (`PROPERTY_REQUIRED` uses `requiredProperty`, other types use `property`) |
| `properties` | the set of properties, for duplicate-value errors |
| `extensionElement` / `requiredExtensionElement` | the extension element type, for `EXTENSION_ELEMENT_*` errors |
| `dependentRequiredProperty` | the missing dependent property, for `PROPERTY_DEPENDENT_REQUIRED` |
| `allowedVersion` | the Camunda version that would make it valid |

A new `ERROR_TYPES` value or `data` shape that `@camunda/linting` does not yet understand degrades to the raw `message` — so plan the rule and its `@camunda/linting` message handling together.

### `path` / `paths` — drive the navigation

Every property-level finding must emit a moddle **`path`** to the offending location, built with `getPath` / `pathConcat` from [`@bpmn-io/moddle-utils`](https://github.com/bpmn-io/moddle-utils). The properties panel resolves it to the entry it renders — the standard field, or an element-template field when the element is template-bound — so the same rule lights up the right entry in both cases. A missing path silently loses inline errors and click-to-focus (which is sometimes the right, graceful outcome — see [Best-effort paths](#best-effort-paths-element-level--missing-findings) below).

- **One offending field:** emit a single `path`.
- **Several offending fields** (e.g. duplicate keys across a list): emit a plural `paths`, one leaf path per field, and keep it a single report. The shared duplicate-value predicates in [`rules/utils/element.js`](../rules/utils/element.js) already fill `paths` for you; for a field on a _referenced_ element use the exported `getReferencePath`, which stitches a path _through_ a moddle reference (e.g. an event's `messageRef`) so it still resolves locally from the reported element.

### Best-effort paths (element-level & missing findings)

Not every finding sits on a scalar field. A finding may be about a _missing_ value (there is no field yet), or about an element/group as a whole. Emit the **most specific path the element's configuration allows**, and let the panel do the rest — resolution is best-effort on both ends:

- **Offending value exists →** point at its scalar leaf (the normal case above).
- **No single offending value, but a container/property exists →** point at that **anchor** (a property such as `documentation`, or a collection such as `outputParameters`). The panel resolves a container **outward** to the group that renders it (e.g. `zeebe:IoMapping` `outputParameters` → the _Output_ group), so navigation still lands in the right section.
- **Nothing exists to point at →** emit **no path**. The finding degrades to plain element selection. This is a deliberate, graceful outcome — never fabricate a leaf or an anchor just to have a path.

Two rules of thumb keep this honest:

- **Never construct an entry id**, not even for element-level findings. Where the offending location cannot be a field, resolve to a group (panel-side) or degrade to the element — do not smuggle a `propertiesPanel.entryIds` back in.
- **Build the path with `pathConcat`**, which encodes the degrade for free: `pathConcat(base, leaf)` returns `null` (→ element selection) when `base` is nil, and `pathConcat(base || [], leaf)` anchors on the property name even at the element root (the legacy `[ leaf ]` fallback). Prefer these over a raw `[ ...base, leaf ]` spread, which throws on a nil `base`.

`agent-tool-documentation` (anchors on the `documentation` property) and `agent-tool-output-key` (a concrete output leaf when a write exists, the `outputParameters` container when the tool returns nothing, no path when there is no output mapping at all) are the reference examples.

## Detecting Camunda concepts (encode the contract once)

When a rule depends on "what makes something an X" (a supported element type, a connector task, an element carrying a given extension), **encode that definition once as a named, tested predicate or a single config table** — do not re-derive it inline in each rule.

Why: these definitions are contracts that live in other repos (the engine, connectors, element templates). Duplicating the gate across rules guarantees they drift. A single predicate plus its spec **is** the discoverable, executable contract.

Examples:

- Shared predicates such as `hasExtensionElement`, `hasProperties`, and `getEventDefinition` in [`rules/utils/element.js`](../rules/utils/element.js), covered by [`test/utils/element.spec.js`](../test/utils/element.spec.js). Rules like [`zeebe-user-task`](../rules/camunda-cloud/zeebe-user-task.js) and [`user-task-definition`](../rules/camunda-cloud/user-task-definition.js) detect their target through the same `hasExtensionElement` predicate.
- Single source-of-truth config tables: [`element-type/config.js`](../rules/camunda-cloud/element-type/config.js) is the one place that says which element types (and event definitions) each Camunda version supports, and [`connector-properties/config.js`](../rules/camunda-cloud/connector-properties/config.js) centralizes connector detection via `isInboundConnector(node, names)`.

When the definition changes (marker shape, version gate, a newly supported type), you change one predicate or one table and its spec, not N rules.

If the concept comes from Camunda docs or engine/connector source, cite it in the predicate's (or rule's) JSDoc so the source of truth is one click away — as [`zeebe-user-task`](../rules/camunda-cloud/zeebe-user-task.js) does by linking the user-task migration docs. Encode the **full** definition, not a convenient subset: a weaker gate lets the rule fire on elements that only partially match. Under-specified detection is the most common source of false positives in this library.

## Validating against the real runtime, not the modeler

The modeler UI is not the contract. FEEL types, connector behavior, and engine resolution are — and they are frequently stricter than what the modeler accepts.

- Confirm the actual constraint against the engine/connector source or docs, and **cite it in the rule's JSDoc or `meta.documentation`**. For example, [`feel-compatibility`](../rules/camunda-cloud/feel-compatibility.js) reports FEEL builtins that the target engine version cannot parse, and [`zeebe-user-task`](../rules/camunda-cloud/zeebe-user-task.js) links the user-task migration docs — neither constraint is visible from the modeler.
- Distinguish **hard requirements** from softer **compatibility or convention** concerns, because that drives severity. An unsupported element type ([`element-type`](../rules/camunda-cloud/element-type/index.js)) cannot deploy, so it errors; a property only available in a newer version ([`connector-properties`](../rules/camunda-cloud/connector-properties/index.js)) still works after an upgrade, so it warns.
- Verify end-to-end on the command line (no modeler involved) that report levels and error messages are meaningful — see the integration specs under `test/**/integration` (e.g. [`test/camunda-cloud/integration`](../test/camunda-cloud/integration)).

## Testing

Every rule ships with tests. Two layers:

- **Rule specs** — `test/<platform>/<rule>.spec.js` using `bpmnlint/lib/testers/rule-tester`, with `valid` and `invalid` arrays. Each case is a small BPMN fixture built via `createModdle(createProcess(...))` (see [`test/helper.js`](../test/helper.js)) and, where relevant, a `config` with `version`. Assert the exact `message`, `data.type`, and the `path`/`paths` you emit.
- **Predicate specs** — when you add or change a shared predicate, test it directly (see [`test/utils/element.spec.js`](../test/utils/element.spec.js)). This spec is the contract; keep it readable.

Follow `given / when / then` structure and cover both detection arms and the skip conditions. Prefer real fixtures over mocking.

```sh
npm test        # mocha
npm run lint    # eslint .
npm run all     # both
```

## Wiring a new rule in

1. Add `rules/<platform>/<my-rule>.js`.
2. Register it in the `rules` map in [`index.js`](../index.js).
3. Enable it (with the right severity) in each applicable version config in `index.js`.
4. Add any new `data.type` to [`rules/utils/error-types.js`](../rules/utils/error-types.js).
5. Update the config snapshot test in [`test/config/configs.spec.js`](../test/config/configs.spec.js).
6. Create the matching modeling-guidance documentation page (the URL is derived by `annotateRule`; the page must exist).
7. If the rule reports on a properties-panel field, emit a moddle `path` (or `paths`) and coordinate the version-aware `@camunda/linting` message (see [Reporting](#reporting)).

## Checklist

- [ ] Rule wraps `skipInNonExecutableProcess` and early-returns out of scope.
- [ ] Severity matches the error-vs-warn principle; mixed severities are split into separate rules.
- [ ] Version behavior uses `greaterOrEqual`; forward-looking markers are gated and their inert branch is tested.
- [ ] Reports go through `reportErrors` with an actionable message and a stable `ERROR_TYPES` code.
- [ ] Property-level findings emit a moddle `path` (or `paths`) — never a constructed entry id.
- [ ] Any "what is an X" definition is a single tested predicate in `element.js` (or a single config table), with the source-of-truth doc cited in JSDoc.
- [ ] Runtime constraints verified against engine/connector, not the modeler.
- [ ] Rule spec + predicate spec added; `npm run all` green.
- [ ] Registered in `index.js`, snapshot updated, doc page created.
- [ ] `@camunda/linting` message handling considered for any new `data` shape.
