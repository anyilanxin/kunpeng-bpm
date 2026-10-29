const { isAny } = require('bpmnlint-utils');

const {
  findExtensionElement,
  hasProperties
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (isAny(node, [ 'bpmn:Process', 'bpmn:Participant' ])) {
      return;
    }

    const executionListeners = findExtensionElement(node, 'kunpeng:ExecutionListeners');

    if (!executionListeners) {
      return;
    }

    const listeners = executionListeners.get('listeners');

    const errors = listeners.flatMap(listener => hasProperties(listener, {
      eventType: {
        allowed: (value) => value !== 'cancel'
      }
    }, node));

    if (errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});
