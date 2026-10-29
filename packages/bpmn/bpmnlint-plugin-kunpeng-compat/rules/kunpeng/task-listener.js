const { is } = require('bpmnlint-utils');

const {
  findExtensionElement,
  hasProperties
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:UserTask')) {
      return;
    }

    const taskListeners = findExtensionElement(node, 'kunpeng:TaskListeners');

    if (!taskListeners) {
      return;
    }

    const listeners = taskListeners.get('listeners');
    const errors = listeners.flatMap(listener => hasProperties(listener, {
      type: {
        required: true
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
