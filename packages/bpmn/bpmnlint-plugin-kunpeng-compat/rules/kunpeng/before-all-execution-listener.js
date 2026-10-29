const { is } = require('bpmnlint-utils');

const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const {
  ERROR_TYPES,
  findExtensionElement
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (isMultiInstance(node)) {
      return;
    }

    const executionListeners = findExtensionElement(node, 'kunpeng:ExecutionListeners');

    if (!executionListeners) {
      return;
    }

    const listeners = executionListeners.get('listeners');

    const errors = listeners.flatMap(listener => {
      if (listener.get('eventType') !== 'beforeAll') {
        return [];
      }

      return [
        {
          message: 'Property <eventType> of <kunpeng:ExecutionListener> with value <beforeAll> only allowed on multi-instance elements',
          path: pathConcat(getPath(listener, node), 'eventType'),
          data: {
            type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
            node: listener,
            parentNode: node,
            property: 'eventType'
          }
        }
      ];
    });

    if (errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});

function isMultiInstance(node) {
  const loopCharacteristics = node.get('loopCharacteristics');
  return !!loopCharacteristics && is(loopCharacteristics, 'bpmn:MultiInstanceLoopCharacteristics');
}
