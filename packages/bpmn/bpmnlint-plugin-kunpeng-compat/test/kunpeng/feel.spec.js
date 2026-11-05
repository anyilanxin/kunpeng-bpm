const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/feel');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'valid FEEL expression (string property)',
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:taskDefinition retries="=5" />
      </bpmn:extensionElements>
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:output source="=source" target="OutputVariable_1" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'valid FEEL expression (bpmn:Expression property)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">=cycle(duration("PT1S"))</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `))
  },
  {
    name: 'static value',
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:taskDefinition retries="5" />
      </bpmn:extensionElements>
      <bpmn:serviceTask id="Task_1" />
    `))
  },
  {
    name: 'backticks',
    moddleElement: createModdle(createProcess(`
     <bpmn:serviceTask id="Task_1">
      <bpmn:extensionElements>
        <kunpeng:ioMapping>
          <kunpeng:input source="=\`backticks\`" target="InputVariable_1" />
        </kunpeng:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    `))
  },
  {
    name: 'multiline',
    moddleElement: createModdle(createProcess(`
     <bpmn:serviceTask id="Task_1">
      <bpmn:extensionElements>
        <kunpeng:ioMapping>
          <kunpeng:input source="=&#34;multiline&#10;string&#34;" target="InputVariable_1" />
        </kunpeng:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    `))
  },
  {
    name: 'get or else (unparsable feel extensions)',
    moddleElement: createModdle(createProcess(`
     <bpmn:serviceTask id="Task_1">
      <bpmn:extensionElements>
        <kunpeng:ioMapping>
          <kunpeng:input source="=get or else(default, value)" target="InputVariable_1" />
        </kunpeng:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    `))
  },
  {
    name: 'invalid FEEL expression (string property) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:serviceTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="==..." target="OutputVariable_1" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:process>
    `))
  },
  {
    name: 'name with FEEL-like expression (ignored)',
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" name="==...foo" />
    `))
  },
  {
    name: 'input target with FEEL-like expression (ignored)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target="=...foo" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'output target with FEEL-like expression (ignored)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:output target="=...foo" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'task header key and value with FEEL-like expression (ignored)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="==...foo" value="==...foo" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'zeebe property name and value with FEEL-like expression (ignored)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="==...foo" value="==...foo" />
          </kunpeng:properties>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'called decision resultVariable with FEEL-like expression (ignored)',
    moddleElement: createModdle(createProcess(`
      <bpmn:businessRuleTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:calledDecision decisionId="myDecision" resultVariable="==...foo" />
        </bpmn:extensionElements>
      </bpmn:businessRuleTask>
    `))
  },
  {
    name: 'script resultVariable with FEEL-like expression (ignored)',
    moddleElement: createModdle(createProcess(`
      <bpmn:scriptTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:script expression="=1+1" resultVariable="==...foo" />
        </bpmn:extensionElements>
      </bpmn:scriptTask>
    `))
  }
];

const invalid = [
  {
    name: 'invalid FEEL expression (string property) (task)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:output source="==..." target="OutputVariable_1" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'Task_1',
      message: 'Property <source> is not a valid FEEL expression',
      path: [
        'extensionElements',
        'values',
        0,
        'outputParameters',
        0,
        'source'
      ],
      data: {
        type: ERROR_TYPES.FEEL_EXPRESSION_INVALID,
        node: 'kunpeng:Output',
        parentNode: 'Task_1',
        property: 'source'
      }
    }
  },
  {
    name: 'invalid FEEL expression (bpmn:Expression property) (start event)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">=cycle(duration("PT1S")</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Property <timeCycle> is not a valid FEEL expression',
      path: [
        'eventDefinitions',
        0,
        'timeCycle'
      ],
      data: {
        type: ERROR_TYPES.FEEL_EXPRESSION_INVALID,
        node: 'TimerEventDefinition_1',
        parentNode: 'StartEvent_1',
        property: 'timeCycle'
      }
    }
  },
  {
    name: 'invalid FEEL expression (string property) (process)',
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:executionListeners>
          <kunpeng:executionListener eventType="start" type="=1 >" />
        </kunpeng:executionListeners>
      </bpmn:extensionElements>
    `)),
    report: {
      id: 'Process_1',
      message: 'Property <type> is not a valid FEEL expression',
      path: [
        'extensionElements',
        'values',
        0,
        'listeners',
        0,
        'type'
      ],
      data: {
        type: ERROR_TYPES.FEEL_EXPRESSION_INVALID,
        node: 'kunpeng:ExecutionListener',
        parentNode: 'Process_1',
        property: 'type'
      }
    }
  }
];

RuleTester.verify('feel', rule, {
  valid,
  invalid
});