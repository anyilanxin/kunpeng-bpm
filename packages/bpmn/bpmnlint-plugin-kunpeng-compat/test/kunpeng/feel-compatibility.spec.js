const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/feel-compatibility');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'from json (no version configured)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input source="=from json(input)" target="InputVariable_1" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'from json on expression (available engine version)',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:exclusiveGateway id="Gateway_1">
        <bpmn:outgoing>Flow_1</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:task id="Task_1">
        <bpmn:incoming>Flow_1</bpmn:incoming>
      </bpmn:task>
      <bpmn:sequenceFlow id="Flow_1" sourceRef="Gateway_1" targetRef="Task_1">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=from json("true")</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
    `))
  },
  {
    name: 'from json (available engine version)',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input source="=from json(input)" target="InputVariable_1" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'from json (invalid FEEL syntax)',
    config: { version: '8.6' },
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input source="=from json(" target="InputVariable_1" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'from json (non-executable process)',
    config: { version: '8.6' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:serviceTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:input source="=from json(input)" target="InputVariable_1" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'from json (engine version too old)',
    config: { version: '8.6' },
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input source="=from json(input)" target="InputVariable_1" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'Task_1',
      message: 'FEEL function <from json> requires Camunda >=8.9',
      path: [
        'extensionElements',
        'values',
        0,
        'inputParameters',
        0,
        'source'
      ],
      data: {
        type: ERROR_TYPES.FEEL_EXPRESSION_UNSUPPORTED_FUNCTION,
        node: 'kunpeng:Input',
        parentNode: 'Task_1',
        property: 'source'
      }
    }
  },
  {
    name: 'from json on expression (engine version too old)',
    config: { version: '8.6' },
    moddleElement: createModdle(createProcess(`
      <bpmn:exclusiveGateway id="Gateway_1">
        <bpmn:outgoing>Flow_1</bpmn:outgoing>
      </bpmn:exclusiveGateway>
      <bpmn:task id="Task_1">
        <bpmn:incoming>Flow_1</bpmn:incoming>
      </bpmn:task>
      <bpmn:sequenceFlow id="Flow_1" sourceRef="Gateway_1" targetRef="Task_1">
        <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=from json("true")</bpmn:conditionExpression>
      </bpmn:sequenceFlow>
    `)),
    report: {
      id: 'Flow_1',
      message: 'FEEL function <from json> requires Camunda >=8.9',
      path: [
        'conditionExpression'
      ],
      data: {
        type: ERROR_TYPES.FEEL_EXPRESSION_UNSUPPORTED_FUNCTION,
        node: 'Flow_1',
        parentNode: 'Flow_1',
        property: 'conditionExpression'
      }
    }
  },
];

RuleTester.verify('feel-compatibility', rule, {
  valid,
  invalid
});
