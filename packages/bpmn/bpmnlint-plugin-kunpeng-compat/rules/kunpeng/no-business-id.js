const { is } = require('bpmnlint-utils');

const { hasProperties, findExtensionElement } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const ALLOWED_VERSION = '8.10';

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:CallActivity')) {
      return;
    }

    const calledElement = findExtensionElement(node, 'kunpeng:CalledElement');

    if (!calledElement) {
      return;
    }

    const errors = hasProperties(calledElement, {
      businessId: {
        allowed: false,
        allowedVersion: ALLOWED_VERSION
      }
    }, node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});
