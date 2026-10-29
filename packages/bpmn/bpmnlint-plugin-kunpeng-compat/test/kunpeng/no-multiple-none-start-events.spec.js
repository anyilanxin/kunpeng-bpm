const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-multiple-none-start-events');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'single none start event',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1" />
    `))
  },
  {
    name: 'multiple non-none start events',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1" />
      <bpmn:startEvent id="StartEvent_2">
        <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
      </bpmn:startEvent>
      <bpmn:startEvent id="StartEvent_3">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
      </bpmn:startEvent>
    `))
  },
  {
    name: 'multiple none start events (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:startEvent id="StartEvent_1" />
        <bpmn:startEvent id="StartEvent_2" />
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'multiple none start events',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1" />
      <bpmn:startEvent id="StartEvent_2" />
    `)),
    report: [
      {
        id: 'StartEvent_1',
        message: 'Multiple elements of type <bpmn:StartEvent> with no event definition not allowed as children of <bpmn:Process>',
        path: null,
        data: {
          type: ERROR_TYPES.ELEMENT_MULTIPLE_NOT_ALLOWED,
          node: 'StartEvent_1',
          parent: null
        }
      },
      {
        id: 'StartEvent_2',
        message: 'Multiple elements of type <bpmn:StartEvent> with no event definition not allowed as children of <bpmn:Process>',
        path: null,
        data: {
          type: ERROR_TYPES.ELEMENT_MULTIPLE_NOT_ALLOWED,
          node: 'StartEvent_2',
          parent: null
        }
      }
    ]
  },
];

RuleTester.verify('no-multiple-none-start-events', rule, {
  valid,
  invalid
});