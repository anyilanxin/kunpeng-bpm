const { is } = require('bpmnlint-utils');

const {
  findExtensionElement,
  findExtensionElements,
  findParent,
  hasProperties,
  hasProperty
} = require('../utils/element');

const { hasNoExtensionElement } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const { greaterOrEqual } = require('../utils/version');

const ALLOWED_VERSION = '8.3';

module.exports = skipInNonExecutableProcess(function({ version }) {
  function check(node, reporter) {
    if (!is(node, 'bpmn:StartEvent')) {
      return;
    }

    // Camunda 8.2 and older
    if (!greaterOrEqual(version, ALLOWED_VERSION)) {
      let errors = hasNoExtensionElement(node, 'kunpeng:FormDefinition', node, ALLOWED_VERSION);

      if (errors.length) {
        reportErrors(node, reporter, errors);
      }

      return;
    }

    // Camunda 8.3 and newer
    const formDefinition = findExtensionElement(node, 'kunpeng:FormDefinition');

    if (!formDefinition) {
      return;
    }

    let errors = hasProperty(formDefinition, [
      'formKey',
      'formId'
    ], node);

    if (errors.length) {
      reportErrors(node, reporter, errors);

      return;
    }

    const formKey = formDefinition.get('formKey');

    const userTaskForm = findUserTaskForm(node, formKey);

    if (!userTaskForm) {
      return;
    }

    errors = hasProperties(userTaskForm, {
      body: {
        required: true
      }
    }, node);

    if (errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});

// helpers //////////

function findUserTaskForm(node, formKey) {
  const process = findParent(node, 'bpmn:Process');

  if (!process) {
    return;
  }

  const userTaskForms = findExtensionElements(process, 'kunpeng:UserTaskForm');

  if (userTaskForms && userTaskForms.length) {
    return userTaskForms.find(userTaskForm => {
      const id = userTaskForm.get('id');

      return `camunda-forms:bpmn:${ id }` === formKey;
    });
  }
}