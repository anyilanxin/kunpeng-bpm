const { isAgenticToolElement } = require('../utils/element');
const { reportErrors } = require('../utils/reporter');
const { ERROR_TYPES } = require('../utils/error-types');
const { skipInNonExecutableProcess } = require('../utils/rule');
const { annotateRule } = require('../helper');

/**
 * The AI agent reads a tool's element documentation to decide which tool to
 * call; without it the LLM falls back to the element name, which is
 * underspecified. This rule warns when a tool entry activity (no incoming
 * sequence flows, not an event sub-process) inside an agentic ad-hoc
 * sub-process has no documentation text.
 */
module.exports = skipInNonExecutableProcess(function(config = {}) {
  const { version } = config;
  function check(node, reporter) {

    // Only a tool (a root activity directly inside an agentic AHSP) needs
    // documentation; steps nested inside a tool are not separate tools.
    if (!isAgenticToolElement(node, version)) {
      return;
    }

    const docs = node.get('documentation') || [];
    const text = docs.map(d => d.get('text') || '').join('').trim();

    if (!text) {
      reportErrors(node, reporter, [
        {
          message: 'Tool documentation is missing.',
          data: { type: ERROR_TYPES.AGENT_TOOL_DOCUMENTATION_MISSING },
          path: [ 'documentation' ],
        },
      ]);
    }
  }

  return annotateRule('agent-tool-documentation', {
    check
  });
});
