const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/inclusive-gateway');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'inclusive gateway (1 incoming sequence flow)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:inclusiveGateway id="InclusiveGateway_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:inclusiveGateway>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="InclusiveGateway_1" />
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
    name: 'inclusive gateway (2 incoming sequence flows) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        </bpmn:startEvent>
        <bpmn:inclusiveGateway id="InclusiveGateway_1">
          <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
          <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
        </bpmn:inclusiveGateway>
        <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="InclusiveGateway_1" />
        <bpmn:startEvent id="StartEvent_2">
          <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
        </bpmn:startEvent>
        <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="StartEvent_2" targetRef="InclusiveGateway_1" />
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'inclusive gateway (2 incoming sequence flows)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:inclusiveGateway id="InclusiveGateway_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
      </bpmn:inclusiveGateway>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="InclusiveGateway_1" />
      <bpmn:startEvent id="StartEvent_2">
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="StartEvent_2" targetRef="InclusiveGateway_1" />
    `)),
    report: {
      id: 'InclusiveGateway_1',
      message: 'Element of type <bpmn:InclusiveGateway> must have one property <incoming> of type <bpmn:SequenceFlow>',
      path: [
        'incoming'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'InclusiveGateway_1',
        parentNode: null,
        property: 'incoming'
      }
    }
  }
];

RuleTester.verify('inclusive-gateway', rule, {
  valid,
  invalid
});