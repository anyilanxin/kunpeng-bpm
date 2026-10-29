const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-loop');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'no loop',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:exclusiveGateway id="ExclusiveGateway_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
        <bpmn:incoming>SequenceFlow_5</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_3</bpmn:outgoing>
      </bpmn:serviceTask>
      <bpmn:exclusiveGateway id="ExclusiveGateway_2">
        <bpmn:incoming>SequenceFlow_3</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_5</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_4</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_4</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="ExclusiveGateway_1" />
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ExclusiveGateway_1" targetRef="ServiceTask_1" />
      <bpmn:sequenceFlow id="SequenceFlow_3" sourceRef="ServiceTask_1" targetRef="ExclusiveGateway_2" />
      <bpmn:sequenceFlow id="SequenceFlow_4" sourceRef="ExclusiveGateway_2" targetRef="EndEvent_1" />
      <bpmn:sequenceFlow id="SequenceFlow_5" sourceRef="ExclusiveGateway_2" targetRef="ExclusiveGateway_1" />
    `))
  },
  {
    name: 'ignored loop',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:exclusiveGateway id="ExclusiveGateway_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
        <bpmn:incoming>SequenceFlow_4</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:exclusiveGateway id="ExclusiveGateway_2">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_4</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_3</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_3</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="ExclusiveGateway_1" />
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ExclusiveGateway_1" targetRef="ExclusiveGateway_2" />
      <bpmn:sequenceFlow id="SequenceFlow_3" sourceRef="ExclusiveGateway_2" targetRef="EndEvent_1" />
      <bpmn:sequenceFlow id="SequenceFlow_4" sourceRef="ExclusiveGateway_2" targetRef="ExclusiveGateway_1" />
    `))
  },
  {
    name: 'call activity',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        </bpmn:startEvent>
        <bpmn:manualTask id="ManualTask_1">
          <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
          <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
        </bpmn:manualTask>
        <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="ManualTask_1" />
        <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ManualTask_1" targetRef="CallActivity_1" />
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:incoming>SequenceFlow_3</bpmn:incoming>
        </bpmn:endEvent>
        <bpmn:sequenceFlow id="SequenceFlow_3" sourceRef="CallActivity_1" targetRef="EndEvent_1" />
        <bpmn:callActivity id="CallActivity_1">
          <bpmn:extensionElements>
            <kunpeng:calledElement processId="Process_2" propagateAllChildVariables="false" />
          </bpmn:extensionElements>
          <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
          <bpmn:outgoing>SequenceFlow_3</bpmn:outgoing>
        </bpmn:callActivity>
      </bpmn:process>
    `))
  },
  {
    name: 'simple loop (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        </bpmn:startEvent>
        <bpmn:exclusiveGateway id="ExclusiveGateway_1">
          <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
          <bpmn:incoming>SequenceFlow_5</bpmn:incoming>
          <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
        </bpmn:exclusiveGateway>
        <bpmn:task id="Task_1">
          <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
          <bpmn:outgoing>SequenceFlow_3</bpmn:outgoing>
        </bpmn:task>
        <bpmn:exclusiveGateway id="ExclusiveGateway_2">
          <bpmn:incoming>SequenceFlow_3</bpmn:incoming>
          <bpmn:outgoing>SequenceFlow_5</bpmn:outgoing>
          <bpmn:outgoing>SequenceFlow_4</bpmn:outgoing>
        </bpmn:exclusiveGateway>
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:incoming>SequenceFlow_4</bpmn:incoming>
        </bpmn:endEvent>
        <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="ExclusiveGateway_1" />
        <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ExclusiveGateway_1" targetRef="Task_1" />
        <bpmn:sequenceFlow id="SequenceFlow_3" sourceRef="Task_1" targetRef="ExclusiveGateway_2" />
        <bpmn:sequenceFlow id="SequenceFlow_5" sourceRef="ExclusiveGateway_2" targetRef="ExclusiveGateway_1" />
        <bpmn:sequenceFlow id="SequenceFlow_4" sourceRef="ExclusiveGateway_2" targetRef="EndEvent_1" />
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'simple loop',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:exclusiveGateway id="ExclusiveGateway_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
        <bpmn:incoming>SequenceFlow_5</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:task id="Task_1">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_3</bpmn:outgoing>
      </bpmn:task>
      <bpmn:exclusiveGateway id="ExclusiveGateway_2">
        <bpmn:incoming>SequenceFlow_3</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_5</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_4</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_4</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="ExclusiveGateway_1" />
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ExclusiveGateway_1" targetRef="Task_1" />
      <bpmn:sequenceFlow id="SequenceFlow_3" sourceRef="Task_1" targetRef="ExclusiveGateway_2" />
      <bpmn:sequenceFlow id="SequenceFlow_5" sourceRef="ExclusiveGateway_2" targetRef="ExclusiveGateway_1" />
      <bpmn:sequenceFlow id="SequenceFlow_4" sourceRef="ExclusiveGateway_2" targetRef="EndEvent_1" />
    `)),
    report: {
      id: 'Process_1',
      message: 'Loop detected: Task_1 -> ExclusiveGateway_2 -> ExclusiveGateway_1 -> Task_1',
      path: null,
      data: {
        type: ERROR_TYPES.LOOP_NOT_ALLOWED,
        node: 'Process_1',
        parentNode: null,
        elements: [
          'Task_1',
          'ExclusiveGateway_2',
          'ExclusiveGateway_1'
        ]
      }
    }
  },
  {
    name: 'sub-process loop',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
      </bpmn:startEvent>
      <bpmn:exclusiveGateway id="ExclusiveGateway_1">
        <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
        <bpmn:incoming>SequenceFlow_5</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:subProcess id="SubProcess_1">
        <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_3</bpmn:outgoing>
        <bpmn:startEvent id="StartEvent_2">
          <bpmn:outgoing>SequenceFlow_6</bpmn:outgoing>
        </bpmn:startEvent>
        <bpmn:task id="Task_1">
          <bpmn:incoming>SequenceFlow_6</bpmn:incoming>
          <bpmn:outgoing>SequenceFlow_7</bpmn:outgoing>
        </bpmn:task>
        <bpmn:endEvent id="EndEvent_2">
          <bpmn:incoming>SequenceFlow_7</bpmn:incoming>
        </bpmn:endEvent>
        <bpmn:sequenceFlow id="SequenceFlow_6" sourceRef="StartEvent_2" targetRef="Task_1" />
        <bpmn:sequenceFlow id="SequenceFlow_7" sourceRef="Task_1" targetRef="EndEvent_2" />
      </bpmn:subProcess>
      <bpmn:exclusiveGateway id="ExclusiveGateway_2">
        <bpmn:incoming>SequenceFlow_3</bpmn:incoming>
        <bpmn:outgoing>SequenceFlow_5</bpmn:outgoing>
        <bpmn:outgoing>SequenceFlow_4</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:incoming>SequenceFlow_4</bpmn:incoming>
      </bpmn:endEvent>
      <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="ExclusiveGateway_1" />
      <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ExclusiveGateway_1" targetRef="SubProcess_1" />
      <bpmn:sequenceFlow id="SequenceFlow_3" sourceRef="SubProcess_1" targetRef="ExclusiveGateway_2" />
      <bpmn:sequenceFlow id="SequenceFlow_5" sourceRef="ExclusiveGateway_2" targetRef="ExclusiveGateway_1" />
      <bpmn:sequenceFlow id="SequenceFlow_4" sourceRef="ExclusiveGateway_2" targetRef="EndEvent_1" />
    `)),
    report: {
      id: 'Process_1',
      message: 'Loop detected: Task_1 -> EndEvent_2 -> ExclusiveGateway_2 -> ExclusiveGateway_1 -> SubProcess_1 -> StartEvent_2 -> Task_1',
      path: null,
      data: {
        type: ERROR_TYPES.LOOP_NOT_ALLOWED,
        node: 'Process_1',
        parentNode: null,
        elements: [
          'Task_1',
          'EndEvent_2',
          'ExclusiveGateway_2',
          'ExclusiveGateway_1',
          'SubProcess_1',
          'StartEvent_2',
        ]
      }
    }
  },
  {
    name: 'call activity loop',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        </bpmn:startEvent>
        <bpmn:manualTask id="ManualTask_1">
          <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
          <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
        </bpmn:manualTask>
        <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="ManualTask_1" />
        <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="ManualTask_1" targetRef="CallActivity_1" />
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:incoming>SequenceFlow_3</bpmn:incoming>
        </bpmn:endEvent>
        <bpmn:sequenceFlow id="SequenceFlow_3" sourceRef="CallActivity_1" targetRef="EndEvent_1" />
        <bpmn:callActivity id="CallActivity_1">
          <bpmn:extensionElements>
            <kunpeng:calledElement processId="Process_1" propagateAllChildVariables="false" />
          </bpmn:extensionElements>
          <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
          <bpmn:outgoing>SequenceFlow_3</bpmn:outgoing>
        </bpmn:callActivity>
      </bpmn:process>
    `)),
    report: {
      id: 'Process_1',
      message: 'Loop detected: ManualTask_1 -> CallActivity_1 -> StartEvent_1 -> ManualTask_1',
      path: null,
      data: {
        type: ERROR_TYPES.LOOP_NOT_ALLOWED,
        node: 'Process_1',
        parentNode: null,
        elements: [
          'ManualTask_1',
          'CallActivity_1',
          'StartEvent_1',
        ]
      }
    }
  },
  {
    name: '2 loops, shortest ignored',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:task id="Task_1">
          <bpmn:outgoing>Flow_0ytl4pq</bpmn:outgoing>
        </bpmn:task>
        <bpmn:exclusiveGateway id="Gateway_1">
          <bpmn:incoming>Flow_0ytl4pq</bpmn:incoming>
          <bpmn:incoming>Flow_0wqka6l</bpmn:incoming>
          <bpmn:outgoing>Flow_1u6nw5j</bpmn:outgoing>
          <bpmn:outgoing>Flow_12khikv</bpmn:outgoing>
        </bpmn:exclusiveGateway>
        <bpmn:sequenceFlow id="Flow_0ytl4pq" sourceRef="Task_1" targetRef="Gateway_1" />
        <bpmn:exclusiveGateway id="Gateway_2">
          <bpmn:incoming>Flow_1u6nw5j</bpmn:incoming>
          <bpmn:incoming>Flow_0uw5w0n</bpmn:incoming>
          <bpmn:outgoing>Flow_0wqka6l</bpmn:outgoing>
        </bpmn:exclusiveGateway>
        <bpmn:sequenceFlow id="Flow_1u6nw5j" sourceRef="Gateway_1" targetRef="Gateway_2" />
        <bpmn:task id="Task_2">
          <bpmn:incoming>Flow_12khikv</bpmn:incoming>
          <bpmn:outgoing>Flow_0jtp70h</bpmn:outgoing>
        </bpmn:task>
        <bpmn:sequenceFlow id="Flow_12khikv" sourceRef="Gateway_1" targetRef="Task_2" />
        <bpmn:task id="Task_3">
          <bpmn:incoming>Flow_0jtp70h</bpmn:incoming>
          <bpmn:outgoing>Flow_0uw5w0n</bpmn:outgoing>
        </bpmn:task>
        <bpmn:sequenceFlow id="Flow_0jtp70h" sourceRef="Task_2" targetRef="Task_3" />
        <bpmn:sequenceFlow id="Flow_0uw5w0n" sourceRef="Task_3" targetRef="Gateway_2" />
        <bpmn:sequenceFlow id="Flow_0wqka6l" sourceRef="Gateway_2" targetRef="Gateway_1" />
      </bpmn:process>
    `)),
    report: {
      id: 'Process_1',
      message: 'Loop detected: Task_2 -> Task_3 -> Gateway_2 -> Gateway_1 -> Task_2',
      path: null,
      data: {
        type: ERROR_TYPES.LOOP_NOT_ALLOWED,
        node: 'Process_1',
        parentNode: null,
        elements: [
          'Task_2',
          'Task_3',
          'Gateway_2',
          'Gateway_1'
        ]
      }
    }
  },
  {
    name: 'Single element loop',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:task id="Task_1">
          <bpmn:incoming>Flow_18rglkr</bpmn:incoming>
          <bpmn:outgoing>Flow_18rglkr</bpmn:outgoing>
        </bpmn:task>
        <bpmn:sequenceFlow id="Flow_18rglkr" sourceRef="Task_1" targetRef="Task_1" />
      </bpmn:process>
    `)),
    report: {
      id: 'Process_1',
      message: 'Loop detected: Task_1 -> Task_1',
      path: null,
      data: {
        type: ERROR_TYPES.LOOP_NOT_ALLOWED,
        node: 'Process_1',
        parentNode: null,
        elements: [
          'Task_1'
        ]
      }
    }
  },
  {
    name: 'Multiple Loops',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:task id="Task_1">
          <bpmn:incoming>Flow_18rglkr</bpmn:incoming>
          <bpmn:incoming>Flow_0xockgw</bpmn:incoming>
          <bpmn:outgoing>Flow_18rglkr</bpmn:outgoing>
          <bpmn:outgoing>Flow_0mxutgr</bpmn:outgoing>
        </bpmn:task>
        <bpmn:sequenceFlow id="Flow_18rglkr" sourceRef="Task_1" targetRef="Task_1" />
        <bpmn:task id="Task_2">
          <bpmn:incoming>Flow_0mxutgr</bpmn:incoming>
          <bpmn:outgoing>Flow_12x9u0e</bpmn:outgoing>
        </bpmn:task>
        <bpmn:sequenceFlow id="Flow_0mxutgr" sourceRef="Task_1" targetRef="Task_2" />
        <bpmn:task id="Task_3">
          <bpmn:incoming>Flow_12x9u0e</bpmn:incoming>
          <bpmn:outgoing>Flow_0xockgw</bpmn:outgoing>
        </bpmn:task>
        <bpmn:sequenceFlow id="Flow_12x9u0e" sourceRef="Task_2" targetRef="Task_3" />
        <bpmn:sequenceFlow id="Flow_0xockgw" sourceRef="Task_3" targetRef="Task_1" />
      </bpmn:process>
    `)),
    report: [
      {
        id: 'Process_1',
        message: 'Loop detected: Task_1 -> Task_1',
        path: null,
        data: {
          type: ERROR_TYPES.LOOP_NOT_ALLOWED,
          node: 'Process_1',
          parentNode: null,
          elements: [
            'Task_1'
          ]
        }
      },
      {
        id: 'Process_1',
        message: 'Loop detected: Task_1 -> Task_2 -> Task_3 -> Task_1',
        path: null,
        data: {
          type: ERROR_TYPES.LOOP_NOT_ALLOWED,
          node: 'Process_1',
          parentNode: null,
          elements: [
            'Task_1',
            'Task_2',
            'Task_3'
          ]
        }
      }
    ]
  }
];

RuleTester.verify('no-loop', rule, {
  valid,
  invalid
});