const {
  is,
  isAny
} = require('bpmnlint-utils');

const {
  findExtensionElement,
  getEventDefinition,
  getReferencePath,
  hasExtensionElement,
  hasProperties
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!isAny(node, [ 'bpmn:CatchEvent', 'bpmn:ThrowEvent', 'bpmn:ReceiveTask' ])
      || (is(node, 'bpmn:StartEvent') && !is(node.$parent, 'bpmn:SubProcess'))) {
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

    const messageRef = eventDefinitionOrReceiveTask.get('messageRef');

    if (!messageRef) {
      return;
    }

    let errors = hasExtensionElement(messageRef, 'kunpeng:Subscription', node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);

      return;
    }

    const subscription = findExtensionElement(messageRef, 'kunpeng:Subscription');

    const nodePath = getReferencePath({
      element: node,
      referenceHolder: eventDefinitionOrReceiveTask,
      referenceProperty: 'messageRef',
      referencedRoot: messageRef,
      node: subscription
    });

    errors = hasProperties(subscription, {
      correlationKey: {
        required: true
      }
    }, node, nodePath);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});