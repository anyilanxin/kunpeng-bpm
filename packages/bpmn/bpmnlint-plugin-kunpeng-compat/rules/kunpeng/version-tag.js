const { is } = require('bpmnlint-utils');

const {
  findExtensionElement,
  hasProperties
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

const { greaterOrEqual } = require('../utils/version');

const DMN_VERSION_TAG_EXPRESSION = '8.10';

module.exports = skipInNonExecutableProcess(function(config = {}) {
  const { version } = config;

  function check(node, reporter) {
    if (is(node, 'bpmn:Process')) {
      const versionTag = findExtensionElement(node, 'kunpeng:VersionTag');

      if (!versionTag) {
        return;
      }

      const errors = hasProperties(versionTag, {
        value: {
          required: true
        }
      }, node);

      if (errors && errors.length) {
        reportErrors(node, reporter, errors);
      }
    }

    let extensionElement;

    if (is(node, 'bpmn:BusinessRuleTask')) {
      extensionElement = findExtensionElement(node, 'kunpeng:CalledDecision');
    } else if (is(node, 'bpmn:CallActivity')) {
      extensionElement = findExtensionElement(node, 'kunpeng:CalledElement');
    } else if (is(node, 'bpmn:UserTask')) {
      extensionElement = findExtensionElement(node, 'kunpeng:FormDefinition');
    }

    if (extensionElement && extensionElement.get('bindingType') === 'versionTag') {
      const errors = hasProperties(extensionElement, {
        versionTag: {
          required: true
        }
      }, node);

      if (is(node, 'bpmn:BusinessRuleTask') && !greaterOrEqual(version, DMN_VERSION_TAG_EXPRESSION)) {
        errors.push(...hasProperties(extensionElement, {
          versionTag: {
            allowed: (value) => !value || !value.startsWith('='),
            allowedVersion: DMN_VERSION_TAG_EXPRESSION
          }
        }, node));
      }

      if (errors && errors.length) {
        reportErrors(node, reporter, errors);
      }
    }
  }

  return {
    check
  };
});
