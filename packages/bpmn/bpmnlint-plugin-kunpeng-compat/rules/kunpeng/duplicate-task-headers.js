const {
  is,
  isAny
} = require('bpmnlint-utils');

const {
  findExtensionElement,
  getMessageEventDefinition,
  hasDuplicatedPropertyValues
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:UserTask') && !isZeebeServiceTask(node)) {
      return;
    }

    const taskHeaders = findExtensionElement(node, 'kunpeng:TaskHeaders');

    if (!taskHeaders) {
      return;
    }

    const errors = hasDuplicatedPropertyValues(taskHeaders, 'values', 'key', node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});

// helpers //////////

function isZeebeServiceTask(element) {
  if (is(element, 'kunpeng:ZeebeServiceTask')) {
    return true;
  }

  if (isAny(element, [
    'bpmn:EndEvent',
    'bpmn:IntermediateThrowEvent'
  ])) {
    return getMessageEventDefinition(element);
  }

  if (is(element, 'bpmn:BusinessRuleTask')) {
    return findExtensionElement(element, 'kunpeng:TaskDefinition');
  }

  return false;
}