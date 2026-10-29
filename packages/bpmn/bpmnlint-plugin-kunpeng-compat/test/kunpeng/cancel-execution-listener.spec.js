const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/cancel-execution-listener');

const {
  createModdle,
  createProcess,
  createDefinitions
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: '`cancel` execution listener on process',
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:executionListeners>
          <kunpeng:executionListener eventType="cancel" type="foo" />
        </kunpeng:executionListeners>
      </bpmn:extensionElements>
    `))
  },
  {
    name: '`cancel` execution listener on participant',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:collaboration id="Collaboration_1">
        <bpmn:participant id="Participant_1" processRef="Process_1" />
      </bpmn:collaboration>
      <bpmn:process id="Process_1" isExecutable="false">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="cancel" type="foo" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:process>
    `))
  },
];

const invalid = [
  {
    name: '`cancel` execution listener on task',
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="cancel" type="foo" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:task>
    `)),
    report: {
      id: 'Task_1',
      message: 'Property value of <cancel> not allowed',
      path: [
        'extensionElements',
        'values',
        0,
        'listeners',
        0,
        'eventType'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:ExecutionListener',
        parentNode: 'Task_1',
        property: 'eventType'
      }
    }
  }
];

RuleTester.verify('cancel-execution-listener', rule, {
  valid,
  invalid
});
