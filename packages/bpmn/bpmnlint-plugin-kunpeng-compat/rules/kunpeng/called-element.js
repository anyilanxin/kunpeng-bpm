const { is } = require('bpmnlint-utils');

const {
  findExtensionElement,
  hasExtensionElement,
  hasProperties
} = require('../utils/element');

const { annotateRule } = require('../helper');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const { greaterOrEqual } = require('../utils/version');

const BUSINESS_ID_ALLOWED_VERSION = '8.10';

const MAX_BUSINESS_ID_LENGTH = 256;

module.exports = skipInNonExecutableProcess(function({ version }) {
  function check(node, reporter) {
    if (!is(node, 'bpmn:CallActivity')) {
      return;
    }

    let errors = hasExtensionElement(node, 'kunpeng:CalledElement', node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);

      return;
    }

    const calledElement = findExtensionElement(node, 'kunpeng:CalledElement');

    errors = hasProperties(calledElement, {
      processId: {
        required: true
      },
      businessId: {
        allowed: (value) => isValidBusinessId(value, version)
      }
    }, node);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return annotateRule('called-element', {
    check
  });
});


// helpers //////////

// Business ID is not supported before BUSINESS_ID_ALLOWED_VERSION; the
// `no-business-id` rule flags its presence in that range, so it is treated
// as valid here to avoid reporting the same value twice.
function isValidBusinessId(value, version) {
  if (!value || value.startsWith('=')) {
    return true;
  }

  if (!greaterOrEqual(version, BUSINESS_ID_ALLOWED_VERSION)) {
    return true;
  }

  return value.length < MAX_BUSINESS_ID_LENGTH;
}