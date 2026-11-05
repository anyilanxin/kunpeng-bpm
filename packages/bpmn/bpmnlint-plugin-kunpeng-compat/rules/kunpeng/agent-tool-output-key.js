const { is } = require('bpmnlint-utils');

const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const { isAgenticToolElement } = require('../utils/element');
const { reportErrors, getName } = require('../utils/reporter');
const { ERROR_TYPES } = require('../utils/error-types');
const { skipInNonExecutableProcess } = require('../utils/rule');
const { annotateRule } = require('../helper');

/**
 * A tool inside an agentic ad-hoc sub-process returns its result through the
 * `toolCallResult` variable. The result can be set at any point in the tool's
 * flow and through several channels: an output mapping (target `toolCallResult`
 * or a part like `toolCallResult.statusCode`), a script task or called decision
 * `resultVariable`, or a connector `resultVariable`/`resultExpression` header.
 *
 * The rule warns once per tool: on the element that actually miswrote a
 * result-shaped variable, when the tool flow writes some but none of them is
 * `toolCallResult` (misdirection or wrong casing); on the entry activity when
 * the flow writes none at all, since there's no single offending element to
 * point to (the agent gets no completion signal and may retry or hallucinate
 * an outcome). Results written from arbitrary FEEL expressions are not
 * statically detectable.
 */
module.exports = skipInNonExecutableProcess(function(config = {}) {
  const { version } = config;
  function check(node, reporter) {

    // Only a tool entry (a root activity directly inside an agentic AHSP) is a
    // tool; the whole tool flow is then inspected from here. Elements nested
    // inside a tool are not separate tools, so they are not entry points.
    if (!isAgenticToolElement(node, version)) {
      return;
    }

    const { channels, linear } = collectResultChannels(node);

    if (!channels.length) {
      reportErrors(node, reporter, {
        message: 'Tool returns nothing to the agent. Set a "toolCallResult" (at minimum, note the task completed).',
        data: { type: ERROR_TYPES.AGENT_TOOL_RESULT_MISSING },
        path: getOutputsPath(node),
      });
      return;
    }

    const hasResult = channels.some(isToolCallResultChannel);
    if (!hasResult) {
      const casingMismatch = channels.find(isToolCallResultCasingMismatch);

      if (casingMismatch) {
        reportErrors(casingMismatch.element, reporter, {
          message: `Wrong casing "${getCasingMismatchText(casingMismatch)}": use toolCallResult (case-sensitive).`,
          data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_CASING_INVALID },
          path: getChannelPath(casingMismatch),
        });
        return;
      }

      // Every channel here is a miswrite (none matched toolCallResult), so
      // the first one is a real misdirected write; report on the element
      // that actually wrote it, not the tool's entry.
      const misdirected = channels[ 0 ];
      reportErrors(misdirected.element, reporter, {
        message: '"toolCallResult" output is not mapped.',
        data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_INVALID },
        path: getChannelPath(misdirected),
      });
      return;
    }

    // toolCallResult is set somewhere, but assigning it more than once
    // overwrites the earlier value. Part contributions (toolCallResult.part)
    // and the context put(toolCallResult, ...) accumulation pattern are
    // exempt; every other full write after the first one is flagged.
    //
    // Only flag overwrites on a strictly linear tool flow, where the writes
    // are guaranteed to run one after another. If the flow branches (an
    // exclusive/parallel split, a join, or a boundary event), two writes may
    // sit on alternative paths that never both run in one execution, so
    // flagging them would be a false positive. We conservatively suppress the
    // check for any non-linear flow.
    //
    // Future improvement: instead of suppressing, walk backward from the
    // flow's leaf nodes and reason about which writes can actually co-execute.
    // That has to account for inclusive-OR splits and other BPMN
    // diverge/converge shapes: the common inner-orchestration case is one
    // entry with multiple leaf nodes, so naive flattening over-reports.
    if (linear) {
      const fullWrites = channels.filter(isToolCallResultChannel).filter(isFullOverwriteChannel);

      for (let i = 1; i < fullWrites.length; i++) {
        const overwriter = fullWrites[ i ];
        const overwritten = fullWrites[ i - 1 ];
        const overwrittenLabel = getName(overwritten.element) || overwritten.element.get('id');

        reportErrors(overwriter.element, reporter, {
          message: `This overwrites the "toolCallResult" value set on "${overwrittenLabel}".`,
          data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_OVERWRITE },
          path: getChannelPath(overwriter),
        });
      }
    }
  }

  return annotateRule('agent-tool-output-key', {
    check
  });
});

/**
 * Collect all result-channel writes across the tool flow: the entry element,
 * everything reachable through outgoing sequence flows, and the contents of
 * embedded sub-processes.
 *
 * Also reports whether the flow is strictly linear: a single chain with no
 * branching. A flow is non-linear if any traversed element splits (more than
 * one outgoing sequence flow), joins (more than one incoming), or has a
 * boundary event attached. Non-linear flows can place two writes on
 * alternative paths, so the caller uses this to avoid false overwrite reports.
 *
 * @param {ModdleElement} entry
 *
 * @returns {Object} { channels, linear } — channels as { kind, value, element,
 * node, property } (element being whichever element in the flow actually wrote
 * this channel; node/property the moddle leaf that carries the offending value),
 * and linear being true when the flow is a single non-branching chain
 */
function collectResultChannels(entry) {
  const channels = [],
        visited = new Set(),
        queue = [ entry ];

  let linear = true;

  while (queue.length) {
    const element = queue.shift();

    const id = element.get('id');
    if (id && visited.has(id)) {
      continue;
    }
    visited.add(id);

    collectElementChannels(element, channels);

    const outgoing = element.get('outgoing') || [];
    const incoming = element.get('incoming') || [];

    // A split (>1 outgoing) or a join (>1 incoming) means the flow is not a
    // single guaranteed-sequential chain, so writes may live on paths that
    // never both run.
    if (outgoing.length > 1 || incoming.length > 1) {
      linear = false;
    }

    for (const flow of outgoing) {
      const target = flow.get('targetRef');
      if (target) {
        queue.push(target);
      }
    }

    // Boundary events can define alternate tool paths that still contribute
    // outputs; an alternate path is a branch, so the flow is not linear.
    const parent = element.$parent;
    const siblings = parent && parent.get && parent.get('flowElements');
    for (const boundary of siblings || []) {
      if (is(boundary, 'bpmn:BoundaryEvent') && boundary.get('attachedToRef') === element) {
        linear = false;
        queue.push(boundary);
      }
    }

    if (is(element, 'bpmn:SubProcess')) {
      for (const child of element.get('flowElements') || []) {
        if (is(child, 'bpmn:FlowNode')) {
          queue.push(child);
        }
      }
    }
  }

  return { channels, linear };
}

function collectElementChannels(element, channels) {
  const extensionElements = element.get('extensionElements');
  if (!extensionElements) {
    return;
  }

  for (const value of extensionElements.get('values')) {
    if (is(value, 'kunpeng:IoMapping')) {
      for (const output of value.get('outputParameters') || []) {
        channels.push({ kind: 'output', value: output.get('target') || '', source: output.get('source'), element, node: output, property: 'target' });
      }
    }

    if (is(value, 'kunpeng:Script') || is(value, 'kunpeng:CalledDecision')) {
      const resultVariable = value.get('resultVariable');
      if (resultVariable) {
        channels.push({ kind: 'resultVariable', value: resultVariable, element, node: value, property: 'resultVariable' });
      }
    }

    // resultVariable / resultExpression task headers are treated as output
    // channels for ANY task, not only recognized connector tasks. This breadth
    // is intentional: the goal is to capture every way a tool writes its
    // output. resultVariable/resultExpression is the convention connectors use,
    // but custom element templates can follow the same convention, so gating on
    // connector-ness would miss those and let a real miswrite through.
    if (is(value, 'kunpeng:TaskHeaders')) {
      for (const header of value.get('values') || []) {
        const key = header.get('key');
        if (key === 'resultVariable') {
          channels.push({ kind: 'resultVariable', value: header.get('value') || '', element, node: header, property: 'value' });
        }
        if (key === 'resultExpression') {
          channels.push({ kind: 'resultExpression', value: header.get('value') || '', element, node: header, property: 'value' });
        }
      }
    }
  }
}

// The moddle leaf path to the write that actually carries the offending value
// (an output target, a script/decision resultVariable, a connector header
// value), relative to the element the finding is reported on. The panel
// resolves this render-agnostically to the concrete field — a standard output
// entry, or the matching element-template field when the tool is template
// bound. Degrades to null (element selection) if the node is detached.
function getChannelPath(channel) {
  return pathConcat(getPath(channel.node, channel.element), channel.property);
}

// Best-effort location for a "tool returns nothing" finding: the tool's output
// mapping collection, which the panel resolves outward to the outputs group.
// When the tool has no output mapping at all there is nothing to point at, so
// the finding degrades to element selection (null path) rather than fabricate a
// target.
function getOutputsPath(element) {
  const extensionElements = element.get('extensionElements');
  if (!extensionElements) {
    return null;
  }

  const ioMapping = (extensionElements.get('values') || []).find(value => is(value, 'kunpeng:IoMapping'));
  if (!ioMapping) {
    return null;
  }

  return pathConcat(getPath(ioMapping, element), 'outputParameters');
}

function isToolCallResultChannel({ kind, value }) {
  if (kind === 'resultExpression') {
    return /\btoolCallResult\b/.test(value);
  }

  return value === 'toolCallResult' || value.startsWith('toolCallResult.');
}

// A same-letters, wrong-case variant of toolCallResult (e.g. toolcallresult,
// TOOLCALLRESULT), not any other typo. Mirrors agent-fromai-contract's
// case-insensitive name matching for fromAi().
function isToolCallResultCasingMismatch({ kind, value }) {
  if (kind === 'resultExpression') {
    return /\btoolcallresult\b/i.test(value) && !/\btoolCallResult\b/.test(value);
  }

  const lower = value.toLowerCase();
  const isCasingVariant = lower === 'toolcallresult' || lower.startsWith('toolcallresult.');

  return isCasingVariant && !isToolCallResultChannel({ kind, value });
}

// The mismatched word itself, not the whole expression, for resultExpression
// channels (a connector header value is a full FEEL expression, e.g.
// `={toolcallresult: response.body}`).
function getCasingMismatchText({ kind, value }) {
  if (kind === 'resultExpression') {
    const match = value.match(/\btoolcallresult\b/i);
    return match ? match[0] : value;
  }

  return value;
}

// The documented safe-accumulation pattern for combining several elements'
// contributions into one toolCallResult: `context put(toolCallResult, ...)`.
// Only meaningful for output mappings; connectors and script/decision result
// variables can't read the prior value, so they can never accumulate this way.
const CONTEXT_PUT_TOOL_CALL_RESULT = /^=?\s*context\s+put\s*\(\s*toolCallResult\s*,/;

// Whether this channel fully replaces toolCallResult, as opposed to
// contributing one field (toolCallResult.part) or safely appending to the
// existing value via context put(). Only meaningful for channels that
// already passed isToolCallResultChannel.
function isFullOverwriteChannel({ kind, value, source }) {
  if (kind === 'resultExpression' || kind === 'resultVariable') {
    return true;
  }

  if (value !== 'toolCallResult') {
    return false;
  }

  return !CONTEXT_PUT_TOOL_CALL_RESULT.test(source || '');
}
