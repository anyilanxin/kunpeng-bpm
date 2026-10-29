const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-priority-definition');

const {
  createModdle,
  createProcess,
  createDefinitions
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'user task without priority definition',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1" />
    `))
  },
  {
    name: 'user task with priority definition (Camunda 8.6)',
    config: { version: '8.6' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:userTask id="UserTask_1">
          <bpmn:extensionElements>
            <kunpeng:PriorityDefinition priority="50" />
          </bpmn:extensionElements>
        </bpmn:userTask>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'user task with priority definition (Camunda 8.5)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:userTask id="UserTask_1">
          <bpmn:extensionElements>
            <kunpeng:PriorityDefinition priority="50" />
          </bpmn:extensionElements>
        </bpmn:userTask>
      </bpmn:process>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Extension element of type <kunpeng:PriorityDefinition> only allowed by Camunda 8.6',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'UserTask_1',
        parentNode: null,
        extensionElement: 'kunpeng:PriorityDefinition',
        allowedVersion: '8.6'
      }
    }
  }
];

RuleTester.verify('no-priority-definition', rule, {
  valid,
  invalid
});
