const { is } = require('bpmnlint-utils');
const { isDefined } = require('min-dash');

const {
  findExtensionElement,
  hasExpression
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:UserTask')) {
      return;
    }

    const priorityDefinition = findExtensionElement(node, 'kunpeng:PriorityDefinition');

    if (!priorityDefinition) {
      return;
    }

    const priority = priorityDefinition.get('priority');

    let errors = [];

    if (isDefined(priority)) {
      errors = [
        ...errors,
        ...hasExpression(priorityDefinition, 'priority', {

          // convert to string for validation, cf. https://github.com/camunda/camunda-modeler/issues/5199
          allowed: value => isValidPriority(`${value}`)
        }, node)
      ];
    }

    if (errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});

function isValidPriority(value) {
  return isExpression(value) || isIntegerStringBetween(value, 0, 100);
}

function isExpression(value) {
  return value.startsWith('=');
}

function isIntegerStringBetween(value, min, max) {
  if (/^\d+$/.test(value)) {
    const number = parseInt(value, 10);
    return number >= min && number <= max;
  }
  return false;
}