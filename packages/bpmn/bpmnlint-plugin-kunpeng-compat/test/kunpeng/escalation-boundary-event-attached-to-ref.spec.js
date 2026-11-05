const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/escalation-boundary-event-attached-to-ref');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'escalation boundary event (attached to call activity)',
    moddleElement: createModdle(createProcess(`
      <bpmn:callActivity id="CallActivity_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="CallActivity_1">
        <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
      </bpmn:boundaryEvent>
  `))
  },
  {
    name: 'escalation boundary event (attached to ad-hoc sub process)',
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AdHocSubProcess_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="AdHocSubProcess_1">
        <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
      </bpmn:boundaryEvent>
  `))
  },
  {
    name: 'escalation boundary event (attached to sub process)',
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="SubProcess_1">
        <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
      </bpmn:boundaryEvent>
  `))
  },
  {
    name: 'escalation boundary event (attached to transaction)',
    moddleElement: createModdle(createProcess(`
      <bpmn:transaction id="Transaction_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Transaction_1">
        <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
      </bpmn:boundaryEvent>
  `))
  },
  {
    name: 'task',
    moddleElement: createModdle(createProcess('<bpmn:task id="Task_1" />'))
  },
  {
    name: 'escalation boundary event (attached to task) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:task id="Task_1" />
        <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
          <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
        </bpmn:boundaryEvent>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'escalation boundary event (attached to task)',
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Element of type <bpmn:BoundaryEvent> with event definition of type <bpmn:EscalationEventDefinition> is not allowed to be attached to element of type <bpmn:Task>',
      path: null,
      data: {
        type: ERROR_TYPES.ATTACHED_TO_REF_ELEMENT_TYPE_NOT_ALLOWED,
        node: 'BoundaryEvent_1',
        parentNode: null,
        attachedToRef: 'Task_1'
      }
    }
  }
];

RuleTester.verify('escalation-boundary-event-attached-to-ref', rule, {
  valid,
  invalid
});