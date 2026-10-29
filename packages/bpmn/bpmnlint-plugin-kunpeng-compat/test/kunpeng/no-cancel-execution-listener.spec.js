const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-cancel-execution-listener');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'process with start and end execution listeners',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:executionListeners>
          <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
          <kunpeng:executionListener eventType="end" type="com.example.EndListener" />
        </kunpeng:executionListeners>
      </bpmn:extensionElements>
    `))
  },
  {
    name: 'process without execution listeners',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(''))
  },
  {
    name: 'cancel execution listener (non-executable process)',
    config: { version: '8.9' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="cancel" type="com.example.CancelListener" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'process with cancel execution listener (Camunda 8.9)',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:executionListeners>
          <kunpeng:executionListener eventType="cancel" type="com.example.CancelListener" />
        </kunpeng:executionListeners>
      </bpmn:extensionElements>
    `)),
    report: {
      id: 'Process_1',
      message: 'Property value of <cancel> only allowed by Camunda 8.10 or newer',
      path: [
        'extensionElements',
        'values',
        0,
        'listeners',
        0,
        'eventType'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:ExecutionListener',
        parentNode: 'Process_1',
        property: 'eventType',
        allowedVersion: '8.10'
      }
    }
  },
  {
    name: 'process with cancel listener mixed with start listener (Camunda 8.9)',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:executionListeners>
          <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
          <kunpeng:executionListener eventType="cancel" type="com.example.CancelListener" />
        </kunpeng:executionListeners>
      </bpmn:extensionElements>
    `)),
    report: {
      id: 'Process_1',
      message: 'Property value of <cancel> only allowed by Camunda 8.10 or newer',
      path: [
        'extensionElements',
        'values',
        0,
        'listeners',
        1,
        'eventType'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:ExecutionListener',
        parentNode: 'Process_1',
        property: 'eventType',
        allowedVersion: '8.10'
      }
    }
  }
];

RuleTester.verify('no-cancel-execution-listener', rule, {
  valid,
  invalid
});
