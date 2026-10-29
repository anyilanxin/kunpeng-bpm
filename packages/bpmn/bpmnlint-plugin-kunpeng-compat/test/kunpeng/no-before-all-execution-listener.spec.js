const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-before-all-execution-listener');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'no `beforeAll` listener',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
            <kunpeng:executionListener eventType="end" type="com.example.EndListener" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  }
];

const invalid = [
  {
    name: '`beforeAll` execution listener on multi-instance element',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="beforeAll" type="mi-body-init" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
        <bpmn:multiInstanceLoopCharacteristics />
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Property <eventType> of <kunpeng:ExecutionListener> with value <beforeAll> only allowed by Camunda 8.10 or newer',
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
        parentNode: 'ServiceTask_1',
        property: 'eventType',
        allowedVersion: '8.10'
      }
    }
  }
];

RuleTester.verify('no-before-all-execution-listener', rule, {
  valid,
  invalid
});
