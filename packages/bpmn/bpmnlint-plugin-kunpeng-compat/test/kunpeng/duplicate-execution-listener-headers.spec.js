const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/duplicate-execution-listener-headers');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'execution listener with unique header keys',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener">
              <kunpeng:taskHeaders>
                <kunpeng:header key="authToken" value="abc" />
                <kunpeng:header key="endpoint" value="endpointValue" />
              </kunpeng:taskHeaders>
            </kunpeng:executionListener>
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'execution listener without headers',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'no execution listeners',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1" />
    `))
  },
  {
    name: 'same header key across different listeners (allowed)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener">
              <kunpeng:taskHeaders>
                <kunpeng:header key="authToken" value="abc" />
              </kunpeng:taskHeaders>
            </kunpeng:executionListener>
            <kunpeng:executionListener eventType="end" type="com.example.EndListener">
              <kunpeng:taskHeaders>
                <kunpeng:header key="authToken" value="def" />
              </kunpeng:taskHeaders>
            </kunpeng:executionListener>
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'execution listener with duplicate header keys (non-executable process)',
    config: { version: '8.9' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:serviceTask id="ServiceTask_1">
          <bpmn:extensionElements>
            <kunpeng:executionListeners>
              <kunpeng:executionListener eventType="start" type="com.example.StartListener">
                <kunpeng:taskHeaders>
                  <kunpeng:header key="authToken" value="abc" />
                  <kunpeng:header key="authToken" value="def" />
                </kunpeng:taskHeaders>
              </kunpeng:executionListener>
            </kunpeng:executionListeners>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'execution listener with duplicate header keys',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener">
              <kunpeng:taskHeaders>
                <kunpeng:header key="authToken" value="abc" />
                <kunpeng:header key="authToken" value="def" />
              </kunpeng:taskHeaders>
            </kunpeng:executionListener>
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <authToken>',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 0, 'listeners', 0, 'headers', 'values', 0, 'key' ],
        [ 'extensionElements', 'values', 0, 'listeners', 0, 'headers', 'values', 1, 'key' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
        node: 'kunpeng:TaskHeaders',
        parentNode: 'ServiceTask_1',
        duplicatedProperty: 'key',
        duplicatedPropertyValue: 'authToken',
        properties: [
          'kunpeng:Header',
          'kunpeng:Header'
        ],
        propertiesName: 'values'
      }
    }
  },
  {
    name: 'execution listener with multiple duplicate header keys',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener">
              <kunpeng:taskHeaders>
                <kunpeng:header key="authToken" value="abc" />
                <kunpeng:header key="authToken" value="def" />
                <kunpeng:header key="endpoint" value="endpointValue1" />
                <kunpeng:header key="endpoint" value="endpointValue2" />
              </kunpeng:taskHeaders>
            </kunpeng:executionListener>
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: [
      {
        id: 'ServiceTask_1',
        message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <authToken>',
        path: null,
        paths: [
          [ 'extensionElements', 'values', 0, 'listeners', 0, 'headers', 'values', 0, 'key' ],
          [ 'extensionElements', 'values', 0, 'listeners', 0, 'headers', 'values', 1, 'key' ]
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
          node: 'kunpeng:TaskHeaders',
          parentNode: 'ServiceTask_1',
          duplicatedProperty: 'key',
          duplicatedPropertyValue: 'authToken',
          properties: [
            'kunpeng:Header',
            'kunpeng:Header'
          ],
          propertiesName: 'values'
        }
      },
      {
        id: 'ServiceTask_1',
        message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <endpoint>',
        path: null,
        paths: [
          [ 'extensionElements', 'values', 0, 'listeners', 0, 'headers', 'values', 2, 'key' ],
          [ 'extensionElements', 'values', 0, 'listeners', 0, 'headers', 'values', 3, 'key' ]
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
          node: 'kunpeng:TaskHeaders',
          parentNode: 'ServiceTask_1',
          duplicatedProperty: 'key',
          duplicatedPropertyValue: 'endpoint',
          properties: [
            'kunpeng:Header',
            'kunpeng:Header'
          ],
          propertiesName: 'values'
        }
      }
    ]
  }
];

RuleTester.verify('duplicate-execution-listener-headers', rule, {
  valid,
  invalid
});
