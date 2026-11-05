const {
  findExtensionElement,
  hasDuplicatedPropertiesValues
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    const executionListeners = findExtensionElement(node, 'kunpeng:ExecutionListeners');

    if (!executionListeners) {
      return;
    }

    const errors = hasDuplicatedExecutionListeners(executionListeners, node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});

// helpers //////////
function hasDuplicatedExecutionListeners(executionListeners, parentNode = null) {
  return hasDuplicatedPropertiesValues(executionListeners, 'listeners', [ 'eventType', 'type' ], parentNode);
}
