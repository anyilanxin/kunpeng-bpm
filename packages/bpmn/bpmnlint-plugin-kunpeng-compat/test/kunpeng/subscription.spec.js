const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/subscription');

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
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:messageEventDefinition id="MessageEventDefinition_1" messageRef="Message_1" />
        </bpmn:startEvent>
      </bpmn:process>
      <bpmn:message id="Message_1" name="Message_1" />
    `))
  },
  {
    name: 'start event (event sub process)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
          <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
            <bpmn:messageEventDefinition id="MessageEventDefinition_1" messageRef="Message_1" />
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:process>
      <bpmn:message id="Message_1" name="Message_1">
        <bpmn:extensionElements>
          <kunpeng:subscription correlationKey="foo" />
        </bpmn:extensionElements>
      </bpmn:message>
    `))
  },
  {
    name: 'receive task',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:receiveTask id="ReceiveTask_1" messageRef="Message_1" />
      </bpmn:process>
      <bpmn:message id="Message_1" name="Message_1">
        <bpmn:extensionElements>
          <kunpeng:subscription correlationKey="foo" />
        </bpmn:extensionElements>
      </bpmn:message>
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
    name: 'message start event (no subscription) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
          <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
            <bpmn:messageEventDefinition id="MessageEventDefinition_1" messageRef="Message_1" />
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:process>
      <bpmn:message id="Message_1" name="Message_1" />
    `))
  }
];

const invalid = [
  {
    name: 'message start event (no subscription)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
          <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
            <bpmn:messageEventDefinition id="MessageEventDefinition_1" messageRef="Message_1" />
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:process>
      <bpmn:message id="Message_1" name="Message_1" />
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:Message> must have one extension element of type <kunpeng:Subscription>',
      path: [
        'rootElements',
        1
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_REQUIRED,
        node: 'Message_1',
        parentNode: 'StartEvent_1',
        requiredExtensionElement: 'kunpeng:Subscription'
      }
    }
  },
  {
    name: 'message start event (no correlation key)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
          <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
            <bpmn:messageEventDefinition id="MessageEventDefinition_1" messageRef="Message_1" />
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:process>
      <bpmn:message id="Message_1" name="Message_1">
        <bpmn:extensionElements>
          <kunpeng:subscription />
        </bpmn:extensionElements>
      </bpmn:message>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <kunpeng:Subscription> must have property <correlationKey>',
      path: [
        'eventDefinitions',
        0,
        'messageRef',
        'extensionElements',
        'values',
        0,
        'correlationKey'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:Subscription',
        parentNode: 'StartEvent_1',
        requiredProperty: 'correlationKey'
      }
    }
  },
  {
    name: 'receive task (no subscription)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:receiveTask id="ReceiveTask_1" messageRef="Message_1" />
      </bpmn:process>
      <bpmn:message id="Message_1" name="Message_1" />
    `)),
    report: {
      id: 'ReceiveTask_1',
      message: 'Element of type <bpmn:Message> must have one extension element of type <kunpeng:Subscription>',
      path: [
        'rootElements',
        1
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_REQUIRED,
        node: 'Message_1',
        parentNode: 'ReceiveTask_1',
        requiredExtensionElement: 'kunpeng:Subscription'
      }
    }
  },
  {
    name: 'receive task (no correlation key)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:receiveTask id="ReceiveTask_1" messageRef="Message_1" />
      </bpmn:process>
      <bpmn:message id="Message_1" name="Message_1">
        <bpmn:extensionElements>
          <kunpeng:subscription />
        </bpmn:extensionElements>
      </bpmn:message>
    `)),
    report: {
      id: 'ReceiveTask_1',
      message: 'Element of type <kunpeng:Subscription> must have property <correlationKey>',
      path: [
        'messageRef',
        'extensionElements',
        'values',
        0,
        'correlationKey'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:Subscription',
        parentNode: 'ReceiveTask_1',
        requiredProperty: 'correlationKey'
      }
    }
  }
];

RuleTester.verify('subscription', rule, {
  valid,
  invalid
});