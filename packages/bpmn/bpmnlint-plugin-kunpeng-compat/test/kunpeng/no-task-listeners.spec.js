const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-task-listeners');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'user task without task listeners',
    config: { version: '8.6' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1" />
    `))
  }
];

const invalid = [
  {
    name: 'no task listeners (Camunda 8.6)',
    config: { version: '8.6' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskListeners>
            <kunpeng:taskListener eventType="start" type="com.example.StartListener" />
          </kunpeng:taskListeners>
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Extension element of type <kunpeng:TaskListeners> only allowed by Camunda 8.8',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'UserTask_1',
        parentNode: null,
        extensionElement: 'kunpeng:TaskListeners',
        allowedVersion: '8.8'
      }
    }
  },
  {
    name: 'no task listeners (Camunda 8.6)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskListeners>
            <kunpeng:taskListener eventType="start" type="com.example.StartListener" />
          </kunpeng:taskListeners>
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Extension element of type <kunpeng:TaskListeners> only allowed by Camunda 8.8',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'UserTask_1',
        parentNode: null,
        extensionElement: 'kunpeng:TaskListeners',
        allowedVersion: '8.8'
      }
    }
  }
];

RuleTester.verify('no-task-listeners', rule, {
  valid,
  invalid
});