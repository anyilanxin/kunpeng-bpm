const { is } = require('bpmnlint-utils');

const { findExtensionElement } = require('../utils/element');

const { getPath } = require('@bpmn-io/moddle-utils');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const { ERROR_TYPES } = require('../utils/error-types');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!node || !is(node, 'bpmn:StartEvent')) {
      return;
    }

    const formDefinition = findExtensionElement(node, 'kunpeng:FormDefinition');

    if (!formDefinition) {
      return;
    }

    const formKey = formDefinition.get('formKey');

    if (!formKey || !formKey.startsWith('camunda-forms:bpmn:')) {
      return;
    }

    const errors = [
      {
        message: 'Embedded forms on start events are deprecated; use a linked form instead',
        path: getPath(formDefinition, node),
        data: {
          type: ERROR_TYPES.PROPERTY_DEPRECATED,
          node: formDefinition,
          parentNode: node,
          property: 'formKey'
        }
      }
    ];

    reportErrors(node, reporter, errors);
  }

  return {
    check
  };
});
