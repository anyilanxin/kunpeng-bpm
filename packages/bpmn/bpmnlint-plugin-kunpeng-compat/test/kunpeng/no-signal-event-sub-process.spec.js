const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-signal-event-sub-process');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'signal start event',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
      </bpmn:startEvent>
    `))
  },
  {
    name: 'signal start event child of sub process (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
          <bpmn:startEvent id="StartEvent_1">
            <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'signal start event child of sub process',
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:StartEvent> with event definition of type <bpmn:SignalEventDefinition> not allowed as child of <bpmn:SubProcess>',
      path: null,
      data: {
        type: ERROR_TYPES.CHILD_ELEMENT_TYPE_NOT_ALLOWED,
        node: 'StartEvent_1',
        parentNode: null,
        eventDefinition: 'SignalEventDefinition_1',
        parent: 'SubProcess_1',
        allowedVersion: '8.3'
      }
    }
  }
];

RuleTester.verify('no-signal-event-sub-process', rule, {
  valid,
  invalid
});