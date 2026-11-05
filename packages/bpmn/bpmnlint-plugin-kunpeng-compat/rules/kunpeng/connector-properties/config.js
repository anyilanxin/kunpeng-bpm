const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const { findExtensionElement } = require('../../utils/element');

const { ERROR_TYPES } = require('../../utils/error-types');

const INBOUND_CONNECTOR_PROPERTY = 'inbound.type';

module.exports = {
  messageTtl: {
    version: '8.6',
    getError: (node) => getInboundConnectorError(node, 'messageTtl', '8.6'),
    getProperty: (node) => getZeebeProperty(node, 'messageTtl'),
    isConnector: (node) => isInboundConnector(node, [
      'io.camunda:webhook:1',
      'io.camunda:connector-rabbitmq-inbound:1',
      'io.camunda:http-polling:1',
      'io.camunda:connector-kafka-inbound:1',
      'io.camunda:slack-webhook:1',
      'io.camunda:aws-sqs-inbound:1',
      'io.camunda:aws-sns-webhook:1'
    ])
  },
  consumeUnmatchedEvents: {
    version: '8.6',
    getError: (node) => getInboundConnectorError(node, 'consumeUnmatchedEvents', '8.6'),
    getProperty: (node) => getZeebeProperty(node, 'consumeUnmatchedEvents'),
    isConnector: (node) => isInboundConnector(node, [
      'io.camunda:webhook:1',
      'io.camunda:connector-rabbitmq-inbound:1',
      'io.camunda:http-polling:1',
      'io.camunda:connector-kafka-inbound:1',
      'io.camunda:slack-webhook:1',
      'io.camunda:aws-sqs-inbound:1',
      'io.camunda:aws-sns-webhook:1'
    ])
  },
  deduplicationModeManualFlag: {
    version: '8.6',
    getError: (node) => getInboundConnectorError(node, 'deduplicationModeManualFlag', '8.6'),
    getProperty: (node) => getZeebeProperty(node, 'deduplicationModeManualFlag'),
    isConnector: (node) => isInboundConnector(node, [
      'io.camunda:connector-rabbitmq-inbound:1',
      'io.camunda:http-polling:1',
      'io.camunda:connector-kafka-inbound:1',
      'io.camunda:aws-sqs-inbound:1'
    ])
  }
};

function isInboundConnector(node, names) {
  const zeebeProperty = getZeebeProperty(node, INBOUND_CONNECTOR_PROPERTY);

  return zeebeProperty && names.includes(zeebeProperty.get('value'));
}

function getZeebeProperty(node, propertyName) {
  const zeebeProperties = findExtensionElement(node, 'kunpeng:Properties');

  if (!zeebeProperties) {
    return false;
  }

  return zeebeProperties.get('properties').find(property => {
    return property.get('name') === propertyName;
  });
}

function getInboundConnectorError(node, propertyName, allowedVersion) {
  const property = getZeebeProperty(node, propertyName);

  const connectorProperty = getZeebeProperty(node, INBOUND_CONNECTOR_PROPERTY);

  const path = getPath(property, node);

  return {
    message: `Connector property <name> with value <${ propertyName }> only allowed by Camunda ${ allowedVersion } or newer.`,
    path: pathConcat(path || [], 'name'),
    data: {
      type: ERROR_TYPES.CONNECTORS_PROPERTY_VALUE_NOT_ALLOWED,
      node: property,
      parentNode: node,
      property: 'name',
      allowedVersion,
      connectorProperty: {
        node: connectorProperty,
        properties: [ 'name', 'value' ]
      }
    }
  };
}