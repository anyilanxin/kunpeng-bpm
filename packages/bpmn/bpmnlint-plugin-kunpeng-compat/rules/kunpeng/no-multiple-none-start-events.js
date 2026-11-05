const { is } = require('bpmnlint-utils');

const { reportErrors } = require('../utils/reporter');

const { ERROR_TYPES } = require('../utils/element');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:Process')) {
      return;
    }

    const flowElements = node.get('flowElements') || [];

    const noneStartEvents = flowElements.filter(flowElement => {
      return is(flowElement, 'bpmn:StartEvent') && !flowElement.get('eventDefinitions').length;
    });

    if (noneStartEvents.length <= 1) {
      return;
    }

    noneStartEvents.forEach(startEvent => {
      reportErrors(startEvent, reporter, {
        message: 'Multiple elements of type <bpmn:StartEvent> with no event definition not allowed as children of <bpmn:Process>',
        path: null,
        data: {
          type: ERROR_TYPES.ELEMENT_MULTIPLE_NOT_ALLOWED,
          node: startEvent,
          parent: null
        }
      });
    });
  }

  return {
    check
  };
});
