const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-candidate-users');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'user task',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:assignmentDefinition candidateGroups="foo" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'user task (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:userTask id="UserTask_1">
          <bpmn:extensionElements>
            <kunpeng:assignmentDefinition candidateUsers="foo" />
          </bpmn:extensionElements>
        </bpmn:userTask>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'user task',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:assignmentDefinition candidateUsers="foo" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Property <candidateUsers> only allowed by Camunda 8.2 or newer',
      path: [
        'extensionElements',
        'values',
        0,
        'candidateUsers'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'kunpeng:AssignmentDefinition',
        parentNode: 'UserTask_1',
        property: 'candidateUsers',
        allowedVersion: '8.2'
      }
    }
  }
];

RuleTester.verify('no-candidate-users', rule, {
  valid,
  invalid
});