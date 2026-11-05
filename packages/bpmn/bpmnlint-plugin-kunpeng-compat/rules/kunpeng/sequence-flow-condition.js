const {
  is,
  isAny
} = require('bpmnlint-utils');

const {
  ERROR_TYPES,
  hasProperties
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (isAny(node, [ 'bpmn:ExclusiveGateway', 'bpmn:InclusiveGateway' ])) {
      const outgoing = node.get('outgoing');

      if (outgoing && outgoing.length > 1) {
        for (let sequenceFlow of outgoing) {
          if (node.get('default') !== sequenceFlow) {
            const errors = hasProperties(sequenceFlow, {
              conditionExpression: {
                required: true
              }
            }, sequenceFlow);

            if (errors.length) {
              reportErrors(sequenceFlow, reporter, errors);
            }
          }
        }
      }
    } else if (is(node, 'bpmn:SequenceFlow')) {
      const source = node.get('sourceRef'),
            conditionExpression = node.get('conditionExpression');

      if (source && !isAny(source, [ 'bpmn:ExclusiveGateway', 'bpmn:InclusiveGateway' ]) && conditionExpression) {
        reportErrors(node, reporter, {
          message: 'Property <conditionExpression> only allowed if source is of type <bpmn:ExclusiveGateway> or <bpmn:InclusiveGateway>',
          path: [ 'conditionExpression' ],
          data: {
            type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
            node: node,
            parentNode: null,
            property: 'conditionExpression'
          }
        });
      }
    }
  }

  return {
    check
  };
});