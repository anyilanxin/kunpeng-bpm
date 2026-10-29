const { isAny } = require('bpmnlint-utils');

const { hasProperties, findExtensionElement } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!isAny(node, [
      'bpmn:BusinessRuleTask',
      'bpmn:CallActivity',
      'bpmn:UserTask'
    ])) {
      return;
    }

    const extensionElement = findExtensionElement(node, [
      'kunpeng:CalledDecision',
      'kunpeng:CalledElement',
      'kunpeng:FormDefinition'
    ]);

    if (!extensionElement) {
      return;
    }

    const errors = hasProperties(extensionElement, {
      bindingType: {
        allowed: (value) => !value || value === 'latest',
        allowedVersion: '8.6'
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