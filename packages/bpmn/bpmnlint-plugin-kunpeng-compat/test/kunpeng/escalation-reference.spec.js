const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/escalation-reference');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'escalation start event (no escalation reference)',
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
        </bpmn:startEvent>
      </bpmn:subProcess>
    `))
  },
  {
    name: 'escalation end event',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" escalationRef="Escalation_1" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:escalation id="Escalation_1" escalationCode="foo" />
    `))
  },
  {
    name: 'escalation boundary event',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:callActivity id="CallActivity_1" />
        <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="CallActivity_1">
          <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" escalationRef="Escalation_1" />
        </bpmn:boundaryEvent>
      </bpmn:process>
      <bpmn:escalation id="Escalation_1" escalationCode="foo" />
    `))
  },
  {
    name: 'escalation boundary event (no escalation reference)',
    moddleElement: createModdle(createProcess(`
      <bpmn:callActivity id="CallActivity_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="CallActivity_1">
        <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'end event (message)',
    moddleElement: createModdle(createProcess(`
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
      </bpmn:endEvent>
    `))
  },
  {
    name: 'end event',
    moddleElement: createModdle(createProcess('<bpmn:endEvent id="EndEvent_1" />'))
  },
  {
    name: 'task',
    moddleElement: createModdle(createProcess('<bpmn:task id="Task_1" />'))
  },
  {
    name: 'escalation end event (no escalation reference) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
        </bpmn:endEvent>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'escalation end event (no escalation code)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" escalationRef="Escalation_1" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:escalation id="Escalation_1" />
    `)),
    report: {
      id: 'EndEvent_1',
      message: 'Element of type <bpmn:Escalation> must have property <escalationCode>',
      path: [
        'eventDefinitions',
        0,
        'escalationRef',
        'escalationCode'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'Escalation_1',
        parentNode: 'EndEvent_1',
        requiredProperty: 'escalationCode'
      }
    }
  }
];

RuleTester.verify('escalation-reference', rule, {
  valid,
  invalid
});