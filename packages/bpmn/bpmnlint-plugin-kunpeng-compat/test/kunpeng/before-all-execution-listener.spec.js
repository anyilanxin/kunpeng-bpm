const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/before-all-execution-listener');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: '`beforeAll` execution listener on multi-instance service task',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="beforeAll" type="mi-body-init" />
            <kunpeng:executionListener eventType="start" type="mi-entry-start" />
            <kunpeng:executionListener eventType="end" type="mi-entry-end" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
        <bpmn:multiInstanceLoopCharacteristics />
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'no `beforeAll` listeners on non-multi-instance task',
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
  },
];

const invalid = [
  {
    name: '`beforeAll` execution listener on non-multi-instance task',
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="beforeAll" type="mi-body-init" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:task>
    `)),
    report: {
      id: 'Task_1',
      message: 'Property <eventType> of <kunpeng:ExecutionListener> with value <beforeAll> only allowed on multi-instance elements',
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
        parentNode: 'Task_1',
        property: 'eventType'
      }
    }
  }
];

RuleTester.verify('before-all-execution-listener', rule, {
  valid,
  invalid
});
