const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/connector-properties');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');


const valid = [
  {
    name: 'Inbound connector with <deduplicationModeManualFlag> (Camunda 8.6)',
    config: { version: '8.6' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="inbound.type" value="io.camunda:connector-rabbitmq-inbound:1" />
            <kunpeng:property name="deduplicationModeManualFlag" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `))
  },
  {
    name: 'Inbound connector with <deduplicationModeManualFlag> (Camunda 8.5) (non-executable process)',
    config: { version: '8.5' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="false">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:extensionElements>
            <kunpeng:properties>
              <kunpeng:property name="inbound.type" value="io.camunda:connector-rabbitmq-inbound:1" />
              <kunpeng:property name="deduplicationModeManualFlag" value="true" />
            </kunpeng:properties>
          </bpmn:extensionElements>
        </bpmn:startEvent>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'Inbound connector with <messageTtl> (Camunda 8.5)',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="inbound.type" value="io.camunda:connector-rabbitmq-inbound:1" />
            <kunpeng:property name="messageTtl" value="1" />
          </kunpeng:properties>
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Connector property <name> with value <messageTtl> only allowed by Camunda 8.6 or newer.',
      path: [
        'extensionElements',
        'values',
        0,
        'properties',
        1,
        'name'
      ],
      data: {
        type: ERROR_TYPES.CONNECTORS_PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Property',
        parentNode: 'StartEvent_1',
        property: 'name',
        allowedVersion: '8.6',
        connectorProperty: {
          node: 'kunpeng:Property',
          properties: [ 'name', 'value' ]
        }
      }
    }
  },
  {
    name: 'Inbound connector with <consumeUnmatchedEvents> (Camunda 8.5)',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="inbound.type" value="io.camunda:connector-rabbitmq-inbound:1" />
            <kunpeng:property name="consumeUnmatchedEvents" value="1" />
          </kunpeng:properties>
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Connector property <name> with value <consumeUnmatchedEvents> only allowed by Camunda 8.6 or newer.',
      path: [
        'extensionElements',
        'values',
        0,
        'properties',
        1,
        'name'
      ],
      data: {
        type: ERROR_TYPES.CONNECTORS_PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Property',
        parentNode: 'StartEvent_1',
        property: 'name',
        allowedVersion: '8.6',
        connectorProperty: {
          node: 'kunpeng:Property',
          properties: [ 'name', 'value' ]
        }
      }
    }
  },
  {
    name: 'Inbound connector with <deduplicationModeManualFlag> (Camunda 8.5)',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="inbound.type" value="io.camunda:connector-rabbitmq-inbound:1" />
            <kunpeng:property name="deduplicationModeManualFlag" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Connector property <name> with value <deduplicationModeManualFlag> only allowed by Camunda 8.6 or newer.',
      path: [
        'extensionElements',
        'values',
        0,
        'properties',
        1,
        'name'
      ],
      data: {
        type: ERROR_TYPES.CONNECTORS_PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Property',
        parentNode: 'StartEvent_1',
        property: 'name',
        allowedVersion: '8.6',
        connectorProperty: {
          node: 'kunpeng:Property',
          properties: [ 'name', 'value' ]
        }
      }
    }
  }
];

RuleTester.verify('connector properties', rule, {
  valid,
  invalid
});
