const { findExtensionElement, hasProperties } = require('../utils/element');
const { reportErrors } = require('../utils/reporter');
const { skipInNonExecutableProcess } = require('../utils/rule');
const { greaterOrEqual } = require('../utils/version');

const ALLOWED_VERSION_NO_INPUT_SOURCE = '8.8';

module.exports = skipInNonExecutableProcess(function({ version }) {
  function check(node, reporter) {
    const ioMapping = findExtensionElement(node, 'kunpeng:IoMapping');

    if (!ioMapping) {
      return [];
    }

    const errors = [];

    const inputParameters = ioMapping.get('inputParameters');
    errors.push(...inputParameters.flatMap((parameter) => hasProperties(parameter, {
      source: {
        required: !greaterOrEqual(version, ALLOWED_VERSION_NO_INPUT_SOURCE),
        allowedVersion: ALLOWED_VERSION_NO_INPUT_SOURCE
      },
      target: {
        required: true
      }
    }, node)));

    const outputParameters = ioMapping.get('outputParameters');
    errors.push(...outputParameters.flatMap((parameter) => hasProperties(parameter, {
      source: {
        required: true
      },
      target: {
        required: true
      }
    }, node)));

    if (errors.length) {
      reportErrors(node, reporter, errors);
    }

  }
  return { check };
});
