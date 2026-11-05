const { is } = require('bpmnlint-utils');

const { isDefined } = require('min-dash');

const {
  findExtensionElement,
  hasExpression
} = require('../utils/element');

const { validateDate: validateISO8601Date } = require('../utils/iso8601');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:UserTask')) {
      return;
    }

    const taskSchedule = findExtensionElement(node, 'kunpeng:TaskSchedule');

    if (!taskSchedule) {
      return;
    }

    const dueDate = taskSchedule.get('dueDate');

    let errors = [];

    if (isDefined(dueDate)) {
      errors = [
        ...errors,
        ...hasExpression(taskSchedule, 'dueDate', {
          allowed: date => isValidDate(date)
        }, node)
      ];
    }

    const followUpDate = taskSchedule.get('followUpDate');

    if (isDefined(followUpDate)) {
      errors = [
        ...errors,
        ...hasExpression(taskSchedule, 'followUpDate', {
          allowed: date => isValidDate(date)
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

function isValidDate(value) {
  return isExpression(value) || validateISO8601Date(value);
}

function isExpression(value) {
  return value.startsWith('=');
}