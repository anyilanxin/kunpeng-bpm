const { is } = require('bpmnlint-utils');

const { hasNoExtensionElement } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const ALLOWED_VERSION = '8.6';

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (is(node, 'bpmn:Process')) {
      const errors = hasNoExtensionElement(node, 'kunpeng:VersionTag', node, ALLOWED_VERSION);

      if (errors && errors.length) {
        reportErrors(node, reporter, errors);
      }
    }
  }

  return {
    check
  };
});