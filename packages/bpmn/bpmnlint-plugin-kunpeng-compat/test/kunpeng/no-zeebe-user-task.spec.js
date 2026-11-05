const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-zeebe-user-task');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'user task without Zeebe user task',
    config: { version: '8.4' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1" />
    `))
  }
];

const invalid = [
  {
    name: 'no zeebe user task (Camunda 8.4)',
    config: { version: '8.4' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:userTask />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Extension element of type <kunpeng:UserTask> only allowed by Camunda 8.5',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'UserTask_1',
        parentNode: null,
        extensionElement: 'kunpeng:UserTask',
        allowedVersion: '8.5'
      }
    }
  }
];

RuleTester.verify('no-zeebe-user-task', rule, {
  valid,
  invalid
});