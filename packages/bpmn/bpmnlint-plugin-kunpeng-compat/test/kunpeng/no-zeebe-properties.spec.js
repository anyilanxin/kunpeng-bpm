const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-zeebe-properties');

const {
  createModdle,
  createProcess,
  createDefinitions
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
    name: 'service task (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:serviceTask id="ServiceTask_1">
          <bpmn:extensionElements>
            <kunpeng:properties>
              <kunpeng:property name="foo" value="bar" />
            </kunpeng:properties>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'service task',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="foo" value="bar" />
          </kunpeng:properties>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Extension element of type <kunpeng:Properties> only allowed by Camunda 8.1',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'ServiceTask_1',
        parentNode: null,
        extensionElement: 'kunpeng:Properties',
        allowedVersion: '8.1'
      },
      paths: [
        [ 'extensionElements', 'values', 0, 'properties', 0, 'name' ]
      ]
    }
  }
];

RuleTester.verify('no-zeebe-properties', rule, {
  valid,
  invalid
});