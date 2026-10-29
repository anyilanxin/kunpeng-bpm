const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/user-task-definition');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'user task (form key) (Camunda 8.0)',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'user task (no form key) (non-executable process)',
    config: { version: '8.3' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:userTask id="UserTask_1" />
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'user task (no form definition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1" />
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <bpmn:UserTask> must have one extension element of type <kunpeng:FormDefinition>',
      path: [],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_REQUIRED,
        node: 'UserTask_1',
        parentNode: null,
        requiredExtensionElement: 'kunpeng:FormDefinition'
      }
    }
  }
];

RuleTester.verify('user-task-definition', rule, {
  valid,
  invalid
});