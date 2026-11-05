const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-business-id');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'call activity without business ID',
    moddleElement: createModdle(createProcess(`
      <bpmn:callActivity id="CallActivity_1">
        <bpmn:extensionElements>
          <kunpeng:calledElement processId="foo" />
        </bpmn:extensionElements>
      </bpmn:callActivity>
    `))
  },
  {
    name: 'business ID (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:callActivity id="CallActivity_1">
          <bpmn:extensionElements>
            <kunpeng:calledElement processId="foo" businessId="=order.customerId" />
          </bpmn:extensionElements>
        </bpmn:callActivity>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'business ID (expression)',
    moddleElement: createModdle(createProcess(`
      <bpmn:callActivity id="CallActivity_1">
        <bpmn:extensionElements>
          <kunpeng:calledElement processId="foo" businessId="=order.customerId" />
        </bpmn:extensionElements>
      </bpmn:callActivity>
    `)),
    report: {
      id: 'CallActivity_1',
      message: 'Property <businessId> only allowed by Camunda 8.10 or newer',
      path: [
        'extensionElements',
        'values',
        0,
        'businessId'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'kunpeng:CalledElement',
        parentNode: 'CallActivity_1',
        property: 'businessId',
        allowedVersion: '8.10'
      }
    }
  },
  {
    name: 'business ID (empty null override)',
    moddleElement: createModdle(createProcess(`
      <bpmn:callActivity id="CallActivity_1">
        <bpmn:extensionElements>
          <kunpeng:calledElement processId="foo" businessId="" />
        </bpmn:extensionElements>
      </bpmn:callActivity>
    `)),
    report: {
      id: 'CallActivity_1',
      message: 'Property <businessId> only allowed by Camunda 8.10 or newer',
      path: [
        'extensionElements',
        'values',
        0,
        'businessId'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'kunpeng:CalledElement',
        parentNode: 'CallActivity_1',
        property: 'businessId',
        allowedVersion: '8.10'
      }
    }
  }
];

RuleTester.verify('no-business-id', rule, {
  valid,
  invalid
});
