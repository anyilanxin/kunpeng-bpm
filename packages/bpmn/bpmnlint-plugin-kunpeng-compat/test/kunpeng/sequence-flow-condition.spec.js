const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/sequence-flow-condition');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'inclusive gateway (2 outgoing sequence flows with condition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:inclusiveGateway id="InclusiveGateway_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:inclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="InclusiveGateway_1" targetRef="EndEvent_1">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=foo</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
      <bpmn:endEvent id="EndEvent_2">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="InclusiveGateway_1" targetRef="EndEvent_2">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=bar</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
    `))
  },
  {
    name: 'inclusive gateway (2 outgoing sequence flows, 1 default, 1 with condition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:inclusiveGateway id="InclusiveGateway_1" default="SequenceFlow_2">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:inclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="InclusiveGateway_1" targetRef="EndEvent_1">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=foo</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
      <bpmn:endEvent id="EndEvent_2">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="InclusiveGateway_1" targetRef="EndEvent_2" />
    `))
  },
  {
    name: 'exclusive gateway (2 outgoing sequence flows with condition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:exclusiveGateway id="ExclusiveGateway_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_1">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=foo</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
      <bpmn:endEvent id="EndEvent_2">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_2">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=bar</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
    `))
  },
  {
    name: 'exclusive gateway (2 outgoing sequence flows, 1 default, 1 with condition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:exclusiveGateway id="ExclusiveGateway_1" default="SequenceFlow_2">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_1">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=foo</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
      <bpmn:endEvent id="EndEvent_2">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_2" />
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
    name: 'inclusive gateway (2 outgoing sequence flows, one without condition) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:inclusiveGateway id="InclusiveGateway_1">
          <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
          <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
        </bpmn:inclusiveGateway>
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
        </bpmn:endEvent>
        <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="InclusiveGateway_1" targetRef="EndEvent_1">
          <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=foo</bpmn:conditionExpression>
        </bpmn:sequenceFlow>
        <bpmn:endEvent id="EndEvent_2">
          <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
        </bpmn:endEvent>
        <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="InclusiveGateway_1" targetRef="EndEvent_2" />
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'inclusive gateway (2 outgoing sequence flows, one without condition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:inclusiveGateway id="InclusiveGateway_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:inclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="InclusiveGateway_1" targetRef="EndEvent_1">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=foo</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
      <bpmn:endEvent id="EndEvent_2">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="InclusiveGateway_1" targetRef="EndEvent_2" />
    `)),
    report: {
      id: 'SequenceFlow_2',
      message: 'Element of type <bpmn:SequenceFlow> must have property <conditionExpression>',
      path: [
        'conditionExpression'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'SequenceFlow_2',
        parentNode: null,
        requiredProperty: 'conditionExpression'
      }
    }
  },
  {
    name: 'inclusive gateway (2 outgoing sequence flows, 2 without condition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:inclusiveGateway id="InclusiveGateway_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:inclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="InclusiveGateway_1" targetRef="EndEvent_1" />
      <bpmn:endEvent id="EndEvent_2">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="InclusiveGateway_1" targetRef="EndEvent_2" />
    `)),
    report: [
      {
        id: 'SequenceFlow_1',
        message: 'Element of type <bpmn:SequenceFlow> must have property <conditionExpression>',
        path: [
          'conditionExpression'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'SequenceFlow_1',
          parentNode: null,
          requiredProperty: 'conditionExpression'
        }
      },
      {
        id: 'SequenceFlow_2',
        message: 'Element of type <bpmn:SequenceFlow> must have property <conditionExpression>',
        path: [
          'conditionExpression'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'SequenceFlow_2',
          parentNode: null,
          requiredProperty: 'conditionExpression'
        }
      }
    ]
  },
  {
    name: 'exclusive gateway (2 outgoing sequence flows, one without condition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:exclusiveGateway id="ExclusiveGateway_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_1">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=foo</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
      <bpmn:endEvent id="EndEvent_2">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_2" />
    `)),
    report: {
      id: 'SequenceFlow_2',
      message: 'Element of type <bpmn:SequenceFlow> must have property <conditionExpression>',
      path: [
        'conditionExpression'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'SequenceFlow_2',
        parentNode: null,
        requiredProperty: 'conditionExpression'
      }
    }
  },
  {
    name: 'exclusive gateway (2 outgoing sequence flows, 2 without condition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:exclusiveGateway id="ExclusiveGateway_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_1" />
      <bpmn:endEvent id="EndEvent_2">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ExclusiveGateway_1" targetRef="EndEvent_2" />
    `)),
    report: [
      {
        id: 'SequenceFlow_1',
        message: 'Element of type <bpmn:SequenceFlow> must have property <conditionExpression>',
        path: [
          'conditionExpression'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'SequenceFlow_1',
          parentNode: null,
          requiredProperty: 'conditionExpression'
        }
      },
      {
        id: 'SequenceFlow_2',
        message: 'Element of type <bpmn:SequenceFlow> must have property <conditionExpression>',
        path: [
          'conditionExpression'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'SequenceFlow_2',
          parentNode: null,
          requiredProperty: 'conditionExpression'
        }
      }
    ]
  },
  {
    name: 'task (1 outgoing sequence flow with condition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
      </bpmn:task>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="Task_1" targetRef="EndEvent_1">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=foo</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
    `)),
    report: {
      id: 'SequenceFlow_1',
      message: 'Property <conditionExpression> only allowed if source is of type <bpmn:ExclusiveGateway> or <bpmn:InclusiveGateway>',
      path: [
        'conditionExpression'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'SequenceFlow_1',
        parentNode: null,
        property: 'conditionExpression'
      }
    }
  }
];

RuleTester.verify('sequence-flow-condition', rule, {
  valid,
  invalid
});