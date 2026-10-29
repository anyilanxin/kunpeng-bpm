const { is } = require('bpmnlint-utils');

const {
  ERROR_TYPES,
  hasProperties,
  findExtensionElement
} = require('../utils/element');
const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');
const { greaterOrEqual } = require('../utils/version');

const COMPLETION_ALLOWED_VERSION = '8.8';
const OUTPUT_COLLECTION_ALLOWED_VERSION = '8.8';

module.exports = skipInNonExecutableProcess(function({ version }) {
  function check(node, reporter) {
    if (!is(node, 'bpmn:AdHocSubProcess')) {
      return;
    }

    const errors = [];

    // ad-hoc sub-process must contain at least one activity
    if (!node.get('flowElements').some(isActivity)) {
      errors.push({
        message: 'Element of type <bpmn:AdHocSubProcess> must contain at least one activity',
        data: {
          type: ERROR_TYPES.CHILD_ELEMENT_OF_TYPE_REQUIRED,
          node,
          parentNode: null,
          requiredType: 'bpmn:Activity'
        }
      });
    }

    if (!greaterOrEqual(version, COMPLETION_ALLOWED_VERSION)) {
      errors.push(...hasProperties(node, {
        completionCondition: {
          allowed: false,
          allowedVersion: COMPLETION_ALLOWED_VERSION
        },
        cancelRemainingInstances: {
          allowed: value => value !== false, // only allow true which is default value
          allowedVersion: COMPLETION_ALLOWED_VERSION
        }
      }, node));
    }

    const adHoc = findExtensionElement(node, 'kunpeng:AdHoc');

    if (adHoc) {
      const allowed = greaterOrEqual(version, OUTPUT_COLLECTION_ALLOWED_VERSION);

      // (1) check whether outputCollection and outputElement are allowed
      errors.push(...hasProperties(adHoc, {
        outputCollection: {
          allowed,
          allowedVersion: OUTPUT_COLLECTION_ALLOWED_VERSION,
        },
        outputElement: {
          allowed,
          allowedVersion: OUTPUT_COLLECTION_ALLOWED_VERSION,
        }
      }, node));

      if (errors.length) {
        reportErrors(node, reporter, errors);

        return;
      }

      // (2) check whether outputCollection and outputElement are both set
      errors.push(...hasProperties(adHoc, {
        outputCollection: {
          dependentRequired: 'outputElement'
        },
        outputElement: {
          dependentRequired: 'outputCollection'
        }
      }, node));
    }

    if (errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});

function isActivity(element) {
  return is(element, 'bpmn:Activity');
}
