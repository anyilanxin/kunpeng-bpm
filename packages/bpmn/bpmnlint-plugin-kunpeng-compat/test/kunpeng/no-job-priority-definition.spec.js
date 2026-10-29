const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-job-priority-definition');

const {
  createModdle,
  createProcess,
  createDefinitions
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'service task without job priority definition (executable)',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskDefinition type="foo" />
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'service task with job priority definition (non-executable)',
    config: { version: '8.9' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="false">
        <bpmn:serviceTask id="ServiceTask_1">
          <bpmn:extensionElements>
            <kunpeng:taskDefinition type="foo" />
            <kunpeng:jobPriorityDefinition priority="90" />
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:process>
    `))
  },
  {
    name: 'process with job priority definition (non-executable)',
    config: { version: '8.9' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="false">
        <bpmn:extensionElements>
          <kunpeng:jobPriorityDefinition priority="50" />
        </bpmn:extensionElements>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'service task with job priority definition (Camunda 8.9)',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskDefinition type="foo" />
          <kunpeng:jobPriorityDefinition priority="90" />
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Extension element of type <kunpeng:JobPriorityDefinition> only allowed by Camunda 8.10',
      path: [
        'extensionElements',
        'values',
        1
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'ServiceTask_1',
        parentNode: null,
        extensionElement: 'kunpeng:JobPriorityDefinition',
        allowedVersion: '8.10'
      }
    }
  },
  {
    name: 'process with job priority definition (Camunda 8.9)',
    config: { version: '8.9' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:extensionElements>
          <kunpeng:jobPriorityDefinition priority="50" />
        </bpmn:extensionElements>
      </bpmn:process>
    `)),
    report: {
      id: 'Process_1',
      message: 'Extension element of type <kunpeng:JobPriorityDefinition> only allowed by Camunda 8.10',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'Process_1',
        parentNode: null,
        extensionElement: 'kunpeng:JobPriorityDefinition',
        allowedVersion: '8.10'
      }
    }
  }
];

RuleTester.verify('no-job-priority-definition', rule, {
  valid,
  invalid
});
