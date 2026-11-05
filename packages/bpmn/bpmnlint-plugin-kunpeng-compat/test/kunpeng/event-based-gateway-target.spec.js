const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/event-based-gateway-target');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'task',
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
    `))
  },
  {
    name: 'receive task',
    moddleElement: createModdle(createProcess(`
      <bpmn:receiveTask id="ReceiveTask_1" />
    `))
  },
  {
    name: 'receive task (exclusive gateway)',
    moddleElement: createModdle(createProcess(`
      <bpmn:exclusiveGateway id="ExclusiveGateway_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="ExclusiveGateway_1" targetRef="ReceiveTask_1" />
      <bpmn:receiveTask id="ReceiveTask_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:receiveTask>
    `))
  },
  {
    name: 'receive task (event-based gateway) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="EventBasedGateway_1" targetRef="ReceiveTask_1" />
        <bpmn:receiveTask id="ReceiveTask_1">
          <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
        </bpmn:receiveTask>
        <bpmn:eventBasedGateway id="EventBasedGateway_1">
          <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        </bpmn:eventBasedGateway>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'receive task (event-based gateway)',
    moddleElement: createModdle(createProcess(`
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="EventBasedGateway_1" targetRef="ReceiveTask_1" />
      <bpmn:receiveTask id="ReceiveTask_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:receiveTask>
      <bpmn:eventBasedGateway id="EventBasedGateway_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
      </bpmn:eventBasedGateway>
    `)),
    report: {
      id: 'ReceiveTask_1',
      message: 'Element of type <bpmn:ReceiveTask> not allowed as event-based gateway target',
      path: null,
      data: {
        type: ERROR_TYPES.EVENT_BASED_GATEWAY_TARGET_NOT_ALLOWED,
        node: 'ReceiveTask_1',
        parentNode: null
      }
    }
  }
];

RuleTester.verify('event-based-gateway-target', rule, {
  valid,
  invalid
});