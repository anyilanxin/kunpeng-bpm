const { is } = require('bpmnlint-utils');

const { reportErrors } = require('../utils/reporter');

const { getEventDefinition } = require('../utils/element');

const { ERROR_TYPES } = require('../utils/error-types');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:StartEvent')) {
      return;
    }

    const eventDefinition = getEventDefinition(node);

    if (!eventDefinition || !is(eventDefinition, 'bpmn:SignalEventDefinition')) {
      return;
    }

    const { $parent: parent } = node;

    if (parent && is(parent, 'bpmn:SubProcess')) {
      const error = {
        message: 'Element of type <bpmn:StartEvent> with event definition of type <bpmn:SignalEventDefinition> not allowed as child of <bpmn:SubProcess>',
        path: null,
        data: {
          type: ERROR_TYPES.CHILD_ELEMENT_TYPE_NOT_ALLOWED,
          node,
          parentNode: null,
          eventDefinition,
          parent,
          allowedVersion: '8.3'
        }
      };

      reportErrors(node, reporter, error);
    }
  }

  return {
    check
  };
});