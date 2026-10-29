const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-template');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'service task',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1" />
    `))
  },
  {
    name: 'service task (template) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:serviceTask id="ServiceTask_1" kunpeng:modelerTemplate="foo" />
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'service task (template)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1" kunpeng:modelerTemplate="foo" />
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Property <modelerTemplate> only allowed by Camunda 8.0 or newer',
      path: [
        'modelerTemplate'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'ServiceTask_1',
        parentNode: null,
        property: 'modelerTemplate',
        allowedVersion: '8.0'
      }
    }
  },
  {
    name: 'service task (REST connector)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1" kunpeng:modelerTemplate="io.camunda.connectors.HttpJson.v1.noAuth" />
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Property <modelerTemplate> only allowed by Camunda 8.0 or newer',
      path: [
        'modelerTemplate'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'ServiceTask_1',
        parentNode: null,
        property: 'modelerTemplate',
        allowedVersion: '8.0'
      }
    }
  }
];

RuleTester.verify('no-template', rule, {
  valid,
  invalid
});