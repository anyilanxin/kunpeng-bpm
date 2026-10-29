const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('bpmnlint/rules/start-event-required');

const {
  createModdle,
  createProcess
} = require('../../helper');

const valid = [
  {
    name: 'start event exists',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
      </bpmn:startEvent>
    `))
  },
];

const invalid = [
  {
    name: 'empty process',
    moddleElement: createModdle(createProcess('')),
    report: {
      id: 'Process_1',
      message: 'Process is missing start event',
    }
  }
];

RuleTester.verify('start-event-required', rule, {
  valid,
  invalid
});