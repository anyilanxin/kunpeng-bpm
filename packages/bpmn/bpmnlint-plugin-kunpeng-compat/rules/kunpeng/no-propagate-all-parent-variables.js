const { is } = require('bpmnlint-utils');

const {
  findExtensionElement,
  hasProperties
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

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
      propagateAllParentVariables: {
        allowed: function(value) {

          // `propergateAllParentVariables` is not recognized by Camunda 8.1 and older
          // setting it to `true` is therefore allowed for all versions
          // setting it to `false` is only allowed for Camunda 8.2 and newer
          return value;
        },
        allowedVersion: '8.2'
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