const {
  is,
  isAny
} = require('bpmnlint-utils');

const {
  getEventDefinition,
  getReferencePath,
  hasProperties
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');
const { annotateRule } = require('../helper');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!isAny(node, [ 'bpmn:CatchEvent', 'bpmn:ReceiveTask' ])) {
      return;
    }

    let eventDefinitionOrReceiveTask = node;

    if (!is(node, 'bpmn:ReceiveTask')) {
      const eventDefinition = getEventDefinition(node);

      if (!eventDefinition || !is(eventDefinition, 'bpmn:MessageEventDefinition')) {
        return;
      }

      eventDefinitionOrReceiveTask = eventDefinition;
    }

    let errors = hasProperties(eventDefinitionOrReceiveTask, {
      messageRef: {
        required: true
      }
    }, node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);

      return;
    }

    const messageRef = eventDefinitionOrReceiveTask.get('messageRef');

    const nodePath = getReferencePath({
      element: node,
      referenceHolder: eventDefinitionOrReceiveTask,
      referenceProperty: 'messageRef',
      referencedRoot: messageRef,
      node: messageRef
    });

    errors = hasProperties(messageRef, {
      name: {
        required: true
      }
    }, node, nodePath);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return annotateRule('message-reference', {
    check
  });
});