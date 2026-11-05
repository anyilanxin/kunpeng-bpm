const {
  findExtensionElement
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const { ERROR_TYPES } = require('../utils/error-types');

const { getPath } = require('@bpmn-io/moddle-utils');

const ALLOWED_VERSION = '8.10';

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    const executionListeners = findExtensionElement(node, 'kunpeng:ExecutionListeners');

    if (!executionListeners) {
      return;
    }

    const listeners = executionListeners.get('listeners');

    const errors = listeners.flatMap(listener => {
      const headers = listener.get('headers');

      if (!headers) {
        return [];
      }

      return [
        {
          message: `Property <kunpeng:TaskHeaders> of <kunpeng:ExecutionListener> only allowed by Camunda ${ ALLOWED_VERSION }`,
          path: getPath(headers, node),
          data: {
            type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
            node: listener,
            parentNode: node,
            property: 'headers',
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
