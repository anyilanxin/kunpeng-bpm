const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/message-reference');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'start event',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:messageEventDefinition id="MessageEventDefinition_1" messageRef="Message_1" />
        </bpmn:startEvent>
      </bpmn:process>
      <bpmn:message id="Message_1" name="foo" />
    `))
  },
  {
    name: 'receive task',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:receiveTask id="ReceiveTask_1" messageRef="Message_1" />
      </bpmn:process>
      <bpmn:message id="Message_1" name="foo" />
    `))
  },
  {
    name: 'start event (error)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:errorEventDefinition id="ErrorEventDefinition_1" />
      </bpmn:startEvent>
    `))
  },
  {
    name: 'start event',
    moddleElement: createModdle(createProcess('<bpmn:startEvent id="StartEvent_1" />'))
  },
  {
    name: 'task',
    moddleElement: createModdle(createProcess('<bpmn:task id="Task_1" />'))
  },
  {
    name: 'message start event (no message reference) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
        </bpmn:startEvent>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'message start event (no message reference)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:MessageEventDefinition> must have property <messageRef>',
      path: [
        'eventDefinitions',
        0,
        'messageRef'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'MessageEventDefinition_1',
        parentNode: 'StartEvent_1',
        requiredProperty: 'messageRef'
      }
    }
  },
  {
    name: 'message start event (no message name)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:messageEventDefinition id="MessageEventDefinition_1" messageRef="Message_1" />
        </bpmn:startEvent>
      </bpmn:process>
      <bpmn:message id="Message_1" />
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:Message> must have property <name>',
      path: [
        'eventDefinitions',
        0,
        'messageRef',
        'name'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'Message_1',
        parentNode: 'StartEvent_1',
        requiredProperty: 'name'
      }
    }
  },
  {
    name: 'receive task (no message reference)',
    moddleElement: createModdle(createProcess(`
      <bpmn:receiveTask id="ReceiveTask_1" />
    `)),
    report: {
      id: 'ReceiveTask_1',
      message: 'Element of type <bpmn:ReceiveTask> must have property <messageRef>',
      path: [
        'messageRef'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'ReceiveTask_1',
        parentNode: null,
        requiredProperty: 'messageRef'
      }
    }
  },
  {
    name: 'receive task (no message name)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:receiveTask id="ReceiveTask_1" messageRef="Message_1" />
      </bpmn:process>
      <bpmn:message id="Message_1" />
    `)),
    report: {
      id: 'ReceiveTask_1',
      message: 'Element of type <bpmn:Message> must have property <name>',
      path: [
        'messageRef',
        'name'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'Message_1',
        parentNode: 'ReceiveTask_1',
        requiredProperty: 'name'
      }
    }
  }
];

RuleTester.verify('message-reference', rule, {
  valid,
  invalid
});