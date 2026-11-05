const {
  findExtensionElement,
  hasProperties
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    const executionListeners = findExtensionElement(node, 'kunpeng:ExecutionListeners');

    if (!executionListeners) {
      return;
    }

    const listeners = executionListeners.get('listeners');
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
