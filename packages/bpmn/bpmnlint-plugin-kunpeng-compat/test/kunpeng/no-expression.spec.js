const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-expression');

const {
  createDefinitions,
  createModdle
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'error throw event (error code as expression)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="Event">
          <bpmn:errorEventDefinition id="ErrorEventDefinition" errorRef="Error" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:error id="Error" name="Error" errorCode="=myCode" />
    `))
  },
  {
    name: 'error throw event (plain error code Camunda 8.2)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="Event">
          <bpmn:errorEventDefinition id="ErrorEventDefinition" errorRef="Error" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:error id="Error" name="Error" errorCode="myCode" />
    `))
  },
  {
    name: 'error throw event (plain error code Camunda 8.1)',
    config: { version: '8.1' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="Event">
          <bpmn:errorEventDefinition id="ErrorEventDefinition" errorRef="Error" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:error id="Error" name="Error" errorCode="myCode" />
    `))
  },
  {
    name: 'escalation throw event (escalation code as expression)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="Event">
          <bpmn:escalationEventDefinition id="EscalationEventDefinition" escalationRef="Escalation" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:escalation id="Escalation" name="Escalation" escalationCode="=myCode" />
    `))
  },
  {
    name: 'error start event (static expression-like error code) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:subProcess id="EventSubProcess" triggeredByEvent="true">
          <bpmn:startEvent id="Event">
            <bpmn:errorEventDefinition id="ErrorEventDefinition_1" errorRef="Error_1"/>
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:process>
      <bpmn:error id="Error_1" name="Error_1" errorCode="=myCode" />
    `))
  },
  {
    name: 'error throw event (unknown version)',
    config: { version: '0.0' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="Event">
          <bpmn:errorEventDefinition id="ErrorEventDefinition" errorRef="Error" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:error id="Error" name="Error" errorCode="=myCode" />
    `))
  },
];

const invalid = [
  {
    name: 'error throw event (error code as expression Camunda 8.1)',
    config: { version: '8.1' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="Event">
          <bpmn:errorEventDefinition id="ErrorEventDefinition" errorRef="Error" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:error id="Error" name="Error" errorCode="=myCode" />
    `)),
    report: {
      id: 'Event',
      message: 'Expression statement <=myCode> only supported by Camunda 8.2 or newer',
      path: [
        'rootElements',
        1,
        'errorCode'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_NOT_ALLOWED,
        node: 'Error',
        parentNode: 'Event',
        property: 'errorCode',
        allowedVersion: '8.2'
      }
    }
  },
  {
    name: 'error throw event (error code as expression Camunda 8.1, truncated)',
    config: { version: '8.1' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="Event">
          <bpmn:errorEventDefinition id="ErrorEventDefinition" errorRef="Error" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:error id="Error" name="Error" errorCode="=very very very long expression" />
    `)),
    report: {
      id: 'Event',
      message: 'Expression statement <=very very...> only supported by Camunda 8.2 or newer',
      path: [
        'rootElements',
        1,
        'errorCode'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_NOT_ALLOWED,
        node: 'Error',
        parentNode: 'Event',
        property: 'errorCode',
        allowedVersion: '8.2'
      }
    }
  },
  {
    name: 'error start event (static expression-like error code)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:subProcess id="EventSubProcess" triggeredByEvent="true">
          <bpmn:startEvent id="Event">
            <bpmn:errorEventDefinition id="ErrorEventDefinition_1" errorRef="Error_1"/>
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:process>
      <bpmn:error id="Error_1" name="Error_1" errorCode="=myCode" />
    `)),
    report: {
      id: 'Event',
      message: 'Expression statement <=myCode> not supported',
      path: [
        'rootElements',
        1,
        'errorCode'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_NOT_ALLOWED,
        node: 'Error_1',
        parentNode: 'Event',
        property: 'errorCode'
      }
    }
  },
  {
    name: 'error boundary event (static expression-like error code)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:Task id="Task_1" />
        <bpmn:boundaryEvent id="Event" attachedToRef="Task_1">
          <bpmn:errorEventDefinition id="ErrorEventDefinition_1" errorRef="Error_1"/>
        </bpmn:boundaryEvent>
      </bpmn:process>
      <bpmn:error id="Error_1" name="Error_1" errorCode="=myCode" />
    `)),
    report: {
      id: 'Event',
      message: 'Expression statement <=myCode> not supported',
      path: [
        'rootElements',
        1,
        'errorCode'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_NOT_ALLOWED,
        node: 'Error_1',
        parentNode: 'Event',
        property: 'errorCode'
      }
    }
  },
  {
    name: 'escalation start event (static expression-like escalation code)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:subProcess id="EventSubProcess" triggeredByEvent="true">
          <bpmn:startEvent id="Event">
            <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" escalationRef="Escalation_1" />
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:process>
      <bpmn:escalation id="Escalation_1" name="Escalation_1" escalationCode="=myCode" />
    `)),
    report: {
      id: 'Event',
      message: 'Expression statement <=myCode> not supported',
      path: [
        'rootElements',
        1,
        'escalationCode'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_NOT_ALLOWED,
        node: 'Escalation_1',
        parentNode: 'Event',
        property: 'escalationCode'
      }
    }
  },
  {
    name: 'escalation boundary event (static expression-like escalation code)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:task id="Task_1" />
        <bpmn:boundaryEvent id="Event" attachedToRef="Task_1">
          <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" escalationRef="Escalation_1" />
        </bpmn:boundaryEvent>
      </bpmn:process>
      <bpmn:escalation id="Escalation_1" name="Escalation_1" escalationCode="=myCode" />
    `)),
    report: {
      id: 'Event',
      message: 'Expression statement <=myCode> not supported',
      path: [
        'rootElements',
        1,
        'escalationCode'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_NOT_ALLOWED,
        node: 'Escalation_1',
        parentNode: 'Event',
        property: 'escalationCode'
      }
    }
  }
];

RuleTester.verify('no-expression', rule, {
  valid,
  invalid
});
