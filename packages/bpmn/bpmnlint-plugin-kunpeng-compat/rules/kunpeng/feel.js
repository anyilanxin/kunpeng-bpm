const { is } = require('bpmnlint-utils');

const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const { FeelAnalyzer } = require('@kunpeng-io/expression-analyzer');

const { kunpengReservedNameBuiltins } = require('@kunpeng-io/expression-builtins');

const { reportErrors } = require('../utils/reporter');

const { ERROR_TYPES } = require('../utils/error-types');

const { skipInNonExecutableProcess } = require('../utils/rule');
const { annotateRule } = require('../helper');

const { findParentNode } = require('../utils/element');

const { isFeelProperty } = require('./utils/feel');

module.exports = skipInNonExecutableProcess(function() {
  const feelAnalyzer = new FeelAnalyzer({
    parserDialect: 'camunda',
    reservedNameBuiltins: kunpengReservedNameBuiltins
  });

  function check(node, reporter) {
    if (is(node, 'bpmn:Expression')) {
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

      const { valid } = feelAnalyzer.analyzeExpression(propertyValue.substring(1));

      if (!valid) {
        const path = getPath(node, parentNode);

        errors.push({
          message: `Property <${ propertyName }> is not a valid FEEL expression`,
          path: pathConcat(path || [], propertyName),
          data: {
            type: ERROR_TYPES.FEEL_EXPRESSION_INVALID,
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

  return annotateRule('feel', {
    check
  });
});
