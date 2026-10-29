const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-propagate-all-parent-variables');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'call activity',
    moddleElement: createModdle(createProcess(`
        <bpmn:callActivity id="CallActivity_1">
          <bpmn:extensionElements>
            <kunpeng:calledElement processId="foo" />
          </bpmn:extensionElements>
        </bpmn:callActivity>
    `))
  },
  {
    name: 'call activity (propertgateAllParentVariables = true)',
    moddleElement: createModdle(createProcess(`
        <bpmn:callActivity id="CallActivity_1">
          <bpmn:extensionElements>
            <kunpeng:calledElement processId="foo" propagateAllParentVariables="true" />
          </bpmn:extensionElements>
        </bpmn:callActivity>
    `))
  },
  {
    name: 'call activity (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:callActivity id="CallActivity_1">
          <bpmn:extensionElements>
            <kunpeng:calledElement processId="foo" propagateAllParentVariables="false" />
          </bpmn:extensionElements>
        </bpmn:callActivity>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'call activity (propertgateAllParentVariables = false)',
    moddleElement: createModdle(createProcess(`
      <bpmn:callActivity id="CallActivity_1">
        <bpmn:extensionElements>
          <kunpeng:calledElement processId="foo" propagateAllParentVariables="false" />
        </bpmn:extensionElements>
      </bpmn:callActivity>
    `)),
    report: {
      id: 'CallActivity_1',
      message: 'Property value of <false> only allowed by Camunda 8.2 or newer',
      path:  [
        'extensionElements',
        'values',
        0,
        'propagateAllParentVariables'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:CalledElement',
        parentNode: 'CallActivity_1',
        property: 'propagateAllParentVariables',
        allowedVersion: '8.2'
      }
    }
  }
];

RuleTester.verify('no-propagate-all-parent-variables', rule, {
  valid,
  invalid
});