const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/priority-definition');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'user task with valid priority (integer)',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:PriorityDefinition priority="50" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'user task with priority as expression',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:PriorityDefinition priority="=someExpression" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  }
];

const invalid = [
  {
    name: 'user task with invalid priority (non-integer string)',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:PriorityDefinition priority="invalid" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Expression value of <invalid> not allowed',
      path: [
        'extensionElements',
        'values',
        0,
        'priority'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'kunpeng:PriorityDefinition',
        parentNode: 'UserTask_1',
        property: 'priority'
      }
    }
  },
  {
    name: 'user task with invalid priority (floating-point number)',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:PriorityDefinition priority="100.2" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Expression value of <100.2> not allowed',
      path: [
        'extensionElements',
        'values',
        0,
        'priority'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'kunpeng:PriorityDefinition',
        parentNode: 'UserTask_1',
        property: 'priority'
      }
    }
  }
];

RuleTester.verify('priority-definition', rule, {
  valid,
  invalid
});
