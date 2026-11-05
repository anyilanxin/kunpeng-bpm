const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const {
  findExtensionElement
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const { ERROR_TYPES } = require('../utils/error-types');

const ALLOWED_VERSION = '8.10';

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
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
          message: `Property <eventType> of <kunpeng:ExecutionListener> with value <beforeAll> only allowed by Camunda ${ ALLOWED_VERSION } or newer`,
          path: pathConcat(getPath(listener, node), 'eventType'),
          data: {
            type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
            node: listener,
            parentNode: node,
            property: 'eventType',
            allowedVersion: ALLOWED_VERSION
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
