const { is } = require('bpmnlint-utils');

const { ERROR_TYPES } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:ReceiveTask')) {
      return;
    }

    // receive task as event-based gateway target is allowed by BPMN 2.0 but not
    // supported by Zeebe
    const error = node.get('incoming').some((sequenceFlow) => {
      const source = sequenceFlow.get('sourceRef');

      return is(source, 'bpmn:EventBasedGateway');
    });

    if (error) {
      reportErrors(node, reporter, {
        message: 'Element of type <bpmn:ReceiveTask> not allowed as event-based gateway target',
        path: null,
        data: {
          type: ERROR_TYPES.EVENT_BASED_GATEWAY_TARGET_NOT_ALLOWED,
          node,
          parentNode: null
        }
      });
    }
  }

  return {
    check
  };
});