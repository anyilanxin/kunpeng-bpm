const {
  is,
  isAny
} = require('bpmnlint-utils');

const {
  getEventDefinition,
} = require('../utils/element');

const { ERROR_TYPES } = require('../utils/error-types');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!isAny(node, [ 'bpmn:CatchEvent', 'bpmn:ThrowEvent' ])) {
      return;
    }

    const eventDefinition = getEventDefinition(node);

    if (!eventDefinition || !is(eventDefinition, 'bpmn:EscalationEventDefinition')) {
      return;
    }

    const attachedToRef = node.get('attachedToRef');

    if (attachedToRef && is(attachedToRef, 'bpmn:Task')) {
      reportErrors(node, reporter, {
        message: `Element of type <bpmn:BoundaryEvent> with event definition of type <bpmn:EscalationEventDefinition> is not allowed to be attached to element of type <${ attachedToRef.$type }>`,
        path: null,
        data: {
          type: ERROR_TYPES.ATTACHED_TO_REF_ELEMENT_TYPE_NOT_ALLOWED,
          node,
          parentNode: null,
          attachedToRef
        }
      });
    }
  }

  return {
    check
  };
});
