const { isAny } = require('bpmnlint-utils');

const config = require('./config');

const { reportErrors } = require('../../utils/reporter');

const { skipInNonExecutableProcess } = require('../../utils/rule');

const { greaterOrEqual } = require('../../utils/version');

module.exports = skipInNonExecutableProcess(function({ version }) {
  function check(node, reporter) {
    if (!isAny(node, [ 'bpmn:FlowElement', 'bpmn:FlowElementsContainer' ])) {
      return;
    }

    const errors = Object.entries(config).reduce((errors, [ propertyName, {
      getError,
      getProperty,
      isConnector,
      version: allowedVersion
    } ]) => {
      if (greaterOrEqual(version, allowedVersion) || !isConnector(node)) {
        return errors;
      }

      const property = getProperty(node);

      if (property) {
        return [
          ...errors,
          getError(node)
        ];
      }

      return errors;
    }, []);

    if (errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});
