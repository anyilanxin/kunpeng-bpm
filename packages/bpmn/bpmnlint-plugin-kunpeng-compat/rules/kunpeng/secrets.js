const { isString } = require('min-dash');

const { is } = require('bpmnlint-utils');

const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const {
  findExtensionElement,
  getEventDefinition
} = require('../utils/element');

const { ERROR_TYPES } = require('../utils/error-types');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    const errors = [
      validateIoMapping,
      validateProperties,
      validateSubscription
    ].reduce((errors, validationFunction) => {
      return [
        ...errors,
        ...validationFunction(node)
      ];
    }, []);

    if (errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});

function validateIoMapping(node) {
  const ioMapping = findExtensionElement(node, 'kunpeng:IoMapping');

  if (!ioMapping) {
    return [];
  }

  return ioMapping.get('inputParameters')
    .filter(inputParameter => !isValidSecret(inputParameter.get('source')))
    .map(inputParameter => getReport('source', inputParameter, node));
}

function validateProperties(node) {
  const properties = findExtensionElement(node, 'kunpeng:Properties');

  if (!properties) {
    return [];
  }

  return (properties.get('properties'))
    .filter(property => !isValidSecret(property.get('value')))
    .map(property => getReport('value', property, node));
}

function validateSubscription(node) {
  let message;

  if (is(node, 'bpmn:ReceiveTask')) {
    message = node.get('messageRef');
  } else {
    const messageEventDefinition = getEventDefinition(node, 'bpmn:MessageEventDefinition');

    if (!messageEventDefinition) {
      return [];
    }

    message = messageEventDefinition.get('messageRef');
  }

  if (!message) {
    return [];
  }

  const subscription = findExtensionElement(message, 'kunpeng:Subscription');

  if (!subscription) {
    return [];
  }

  const correlationKey = subscription.get('correlationKey');

  return isValidSecret(correlationKey)
    ? []
    : [ getReport('correlationKey', subscription, node) ];
}

function getReport(propertyName, node, parentNode) {
  const path = getPath(node, parentNode);

  return {
    message: `Property <${ propertyName }> uses deprecated secret expression format`,
    path: pathConcat(path || [], propertyName),
    data: {
      type: ERROR_TYPES.SECRET_EXPRESSION_FORMAT_DEPRECATED,
      node,
      parentNode: parentNode,
      property: propertyName
    }
  };
}

function isValidSecret(value) {
  return !value
    || !isString(value)
    || !value.includes('secrets.')
    || /{{\s*secrets\.[\w-]+\s*}}/.test(value);
}
