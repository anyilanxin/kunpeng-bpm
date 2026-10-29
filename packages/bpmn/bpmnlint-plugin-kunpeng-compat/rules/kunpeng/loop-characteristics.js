const { is } = require('bpmnlint-utils');

const {
  findExtensionElement,
  hasProperties,
  hasExtensionElement
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:Activity')) {
      return;
    }

    let loopCharacteristics = node.get('loopCharacteristics');

    if (!loopCharacteristics) {
      return;
    }

    let errors = hasProperties(node, {
      loopCharacteristics: {
        type: 'bpmn:MultiInstanceLoopCharacteristics'
      }
    }, node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);

      return;
    }

    errors = hasExtensionElement(loopCharacteristics, 'kunpeng:LoopCharacteristics', node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);

      return;
    }

    loopCharacteristics = findExtensionElement(loopCharacteristics, 'kunpeng:LoopCharacteristics');

    errors = hasProperties(loopCharacteristics, {
      inputCollection: {
        required: true
      },
      outputCollection: {
        dependentRequired: 'outputElement'
      },
      outputElement: {
        dependentRequired: 'outputCollection'
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