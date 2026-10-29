const { is, isAny } = require('bpmnlint-utils');

const { getPath } = require('@bpmn-io/moddle-utils');

const { isString } = require('min-dash');

const config = require('./config');
const elementTypeConfig = require('../element-type/config');

const { greaterOrEqual } = require('../../utils/version');

const {
  findExtensionElement,
  getEventDefinition,
  hasExtensionElement,
  hasProperties
} = require('../../utils/element');

const { reportErrors } = require('../../utils/reporter');

const { ERROR_TYPES } = require('../../utils/error-types');

const { skipInNonExecutableProcess } = require('../../utils/rule');

module.exports = skipInNonExecutableProcess(function({ version }) {
  function check(node, reporter) {
    const element = elementTypeConfig[ node.$type ];

    if (!element || (isString(element) && !greaterOrEqual(version, element))) {
      return;
    }

    const eventDefinition = isAny(node, [ 'bpmn:CatchEvent', 'bpmn:ThrowEvent' ]) && getEventDefinition(node);

    if (eventDefinition && (!element[ eventDefinition.$type ] || !greaterOrEqual(version, element[ eventDefinition.$type ]))) {
      return;
    }

    if (is(node, 'bpmn:ThrowEvent') && !eventDefinition) {
      return;
    }

    const calledDecisionConfig = config.calledDecision[ node.$type ];
    const scriptConfig = config.script[ node.$type ];
    const taskDefinitionConfig = config.taskDefinition[ node.$type ];

    let errors;

    const calledDecision = findExtensionElement(node, 'kunpeng:CalledDecision'),
          script = findExtensionElement(node, 'kunpeng:Script'),
          taskDefinition = findExtensionElement(node, 'kunpeng:TaskDefinition');

    if (calledDecision && !script && !taskDefinition) {

      if (!isCalledDecisionAllowed(node, version)) {
        const allowedVersion = getAllowedVersion(calledDecisionConfig, node);

        reportErrors(node, reporter, {
          message: allowedVersion
            ? `Extension element of type <kunpeng:CalledDecision> only allowed by Camunda ${ allowedVersion } or newer`
            : 'Extension element of type <kunpeng:CalledDecision> not allowed',
          path: getPath(calledDecision, node),
          data: {
            type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
            node,
            parentNode: null,
            extensionElement: calledDecision,
            allowedVersion
          }
        });

        return;
      }

      errors = hasProperties(calledDecision, {
        decisionId: {
          required: true
        },
        resultVariable: {
          required: true
        }
      }, node);

      if (errors && errors.length) {
        reportErrors(node, reporter, errors);

        return;
      }
    }

    if (!calledDecision && script && !taskDefinition) {

      if (!isScriptAllowed(node, version)) {
        const allowedVersion = getAllowedVersion(scriptConfig, node);

        reportErrors(node, reporter, {
          message: allowedVersion
            ? `Extension element of type <kunpeng:Script> only allowed by Camunda ${ allowedVersion } or newer`
            : 'Extension element of type <kunpeng:Script> not allowed',
          path: getPath(script, node),
          data: {
            type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
            node,
            parentNode: null,
            extensionElement: script,
            allowedVersion
          }
        });

        return;
      }

      errors = hasProperties(script, {
        expression: {
          required: true
        },
        resultVariable: {
          required: true
        }
      }, node);

      if (errors && errors.length) {
        reportErrors(node, reporter, errors);

        return;
      }
    }

    if (!calledDecision && !script && taskDefinition) {

      if (!isTaskDefinitionAllowed(node, version)) {
        const allowedVersion = getAllowedVersion(taskDefinitionConfig, node);

        reportErrors(node, reporter, {
          message: allowedVersion
            ? `Extension element of type <kunpeng:TaskDefinition> only allowed by Camunda ${ allowedVersion } or newer`
            : 'Extension element of type <kunpeng:TaskDefinition> not allowed',
          path: getPath(taskDefinition, node),
          data: {
            type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
            node,
            parentNode: null,
            extensionElement: taskDefinition,
            allowedVersion
          }
        });

        return;
      }

      errors = hasProperties(taskDefinition, {
        type: {
          required: true
        }
      }, node);

      if (errors && errors.length) {
        reportErrors(node, reporter, errors);

        return;
      }
    }

    const allowedTypes = [
      isCalledDecisionAllowed(node, version) ? 'kunpeng:CalledDecision' : false,
      isScriptAllowed(node, version) ? 'kunpeng:Script' : false,
      isTaskDefinitionAllowed(node, version) ? 'kunpeng:TaskDefinition' : false
    ].filter(isAllowed => isAllowed);

    if (allowedTypes.length === 0) {
      return;
    } else if (allowedTypes.length === 1 && !canHaveExtensionlessImplementation(node)) {
      errors = hasExtensionElement(node, allowedTypes[0], node);
    } else if (!canHaveExtensionlessImplementation(node)) {
      errors = hasExtensionElement(node, allowedTypes, node);
    }

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);

      return;
    }
  }

  return {
    check
  };
});

function isCalledDecisionAllowed(node, version) {
  const { calledDecision } = config;

  const allowedVersion = getAllowedVersion(calledDecision[ node.$type ], node);

  return calledDecision[ node.$type ] && greaterOrEqual(version, allowedVersion);
}

function isScriptAllowed(node, version) {
  const { script } = config;

  const allowedVersion = getAllowedVersion(script[ node.$type ], node);

  return allowedVersion && greaterOrEqual(version, allowedVersion);
}

function isTaskDefinitionAllowed(node, version) {
  const { taskDefinition } = config;

  const allowedVersion = getAllowedVersion(taskDefinition[ node.$type ], node);

  return allowedVersion && greaterOrEqual(version, allowedVersion);
}

function getAllowedVersion(config, node) {
  if (!config) {
    return null;
  }

  if (isString(config)) {
    return config;
  }

  const eventDefinition = getEventDefinition(node);

  return eventDefinition && config[ eventDefinition.$type ];
}

/**
 * Check if a BPMN element can have an extension-less implementation
 * (e.g. ad-hoc subprocess with implementation type BPMN).
 */
function canHaveExtensionlessImplementation(node) {
  return is(node, 'bpmn:AdHocSubProcess');
}
