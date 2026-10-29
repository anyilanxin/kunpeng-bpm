const { is } = require('bpmnlint-utils');

const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');
const { kunpengBuiltins, kunpengReservedNameBuiltins } = require('@kunpeng-io/expression-builtins');

const { FeelAnalyzer } = require('@kunpeng-io/expression-analyzer');
const { isCompatible } = require('@bpmn-io/semver-compat');

const { reportErrors } = require('../utils/reporter');

const { ERROR_TYPES } = require('../utils/error-types');

const { skipInNonExecutableProcess } = require('../utils/rule');

const { findParentNode } = require('../utils/element');

const { isFeelProperty } = require('./utils/feel');

/**
 * Reports calls to FEEL builtins that aren't available in the target Camunda
 * engine (configured via `config.version`).
 */
module.exports = skipInNonExecutableProcess(function(config = {}) {

  const { version } = config;
  const builtins = [ ...kunpengBuiltins, ...kunpengReservedNameBuiltins ];
  const unavailableByName = getUnavailableBuiltins(builtins, version);

  const feelAnalyzer = new FeelAnalyzer({
    parserDialect: 'camunda',
    builtins: kunpengBuiltins,
    reservedNameBuiltins: kunpengReservedNameBuiltins
  });

  function check(node, reporter) {
    if (is(node, 'bpmn:Expression')) {
      return;
    }

    if (!unavailableByName.size) {
      return;
    }

    const parentNode = findParentNode(node);

    if (!parentNode) {
      return;
    }

    const errors = [];

    Object.entries(node).forEach(([ propertyName, propertyValue ]) => {
      if (propertyValue && is(propertyValue, 'bpmn:Expression')) {
        propertyValue = propertyValue.get('body');
      }

      if (!isFeelProperty(node, propertyName, propertyValue)) {
        return;
      }

      const expression = propertyValue.substring(1);

      const { valid, functions = [] } = feelAnalyzer.analyzeExpression(expression);

      // Skip invalid expressions; the `feel` rule reports the syntax error
      if (!valid) {
        return;
      }

      const unsupported = functions.find(
        ({ name, type }) => type === 'builtin' && unavailableByName.has(name)
      );

      if (unsupported) {
        const builtin = unavailableByName.get(unsupported.name);
        const path = getPath(node, parentNode);

        errors.push({
          message: `FEEL function <${ builtin.name }> requires Camunda ${ builtin.engines.camunda }`,
          path: pathConcat(path || [], propertyName),
          data: {
            type: ERROR_TYPES.FEEL_EXPRESSION_UNSUPPORTED_FUNCTION,
            node,
            parentNode,
            property: propertyName
          }
        });
      }
    });

    if (errors && errors.length) {
      reportErrors(parentNode, reporter, errors);
    }
  }

  return {
    check
  };
});

/**
 * Returns a map of builtin names to their definitions for builtins
 * that are incompatible with the provided engine versions.
 *
 * @param { Array<{ name: string, engines?: Record<string, string> }> } builtins
 * @param { string } version
 * @returns { Map<string, { name: string, engines: Record<string, string> }> }
 */
function getUnavailableBuiltins(builtins, version) {
  const unavailable = new Map();

  if (!version) {
    return unavailable;
  }

  for (const builtin of builtins) {
    if (unavailable.has(builtin.name)) {
      continue;
    }

    if (builtin.engines && !isCompatible(builtin.engines, { camunda: version })) {
      unavailable.set(builtin.name, builtin);
    }
  }

  return unavailable;
}
