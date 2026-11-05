const { is } = require('bpmnlint-utils');

const { ERROR_TYPES } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:InclusiveGateway')) {
      return;
    }

    const incoming = node.get('incoming');

    if (incoming && incoming.length > 1) {
      const error = {
        message: `Element of type <${ node.$type }> must have one property <incoming> of type <bpmn:SequenceFlow>`,
        path: [ 'incoming' ],
        data: {
          type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
          node,
          parentNode: null,
          property: 'incoming'
        }
      };

      reportErrors(node, reporter, error);
    }
  }

  return {
    check
  };
});