const {
  is
} = require('bpmnlint-utils');

const {
  getEventDefinition,
  hasProperties
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(waitForCompletion);

/**
 * Make sure that wait for completion is NOT set to false.
 */
function waitForCompletion() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:ThrowEvent')) {
      return;
    }

    const eventDefinition = getEventDefinition(node);

    if (!eventDefinition || !is(eventDefinition, 'bpmn:CompensateEventDefinition')) {
      return;
    }

    const errors = hasProperties(eventDefinition, {
      waitForCompletion: {
        value: true
      }
    }, node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }


  return {
    check
  };
}
