const { is } = require('bpmnlint-utils');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const { hasNoExtensionElement } = require('../utils/element');

const ALLOWED_VERSION = '8.5';

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:UserTask')) {
      return;
    }

    const errors = hasNoExtensionElement(node, 'kunpeng:UserTask', node, ALLOWED_VERSION);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});
