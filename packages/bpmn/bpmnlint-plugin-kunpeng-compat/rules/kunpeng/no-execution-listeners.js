const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const { hasNoExtensionElement } = require('../utils/element');

const ALLOWED_VERSION = '8.6';

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    const errors = hasNoExtensionElement(node, 'kunpeng:ExecutionListeners', node, ALLOWED_VERSION);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});
