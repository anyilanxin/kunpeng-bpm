const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-execution-listener-headers');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'execution listener without headers',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'user task without execution listener',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1" />
    `))
  },
  {
    name: 'execution listener with headers (non-executable process)',
    config: { version: '8.9' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:userTask id="UserTask_1">
          <bpmn:extensionElements>
            <kunpeng:executionListeners>
              <kunpeng:executionListener eventType="start" type="com.example.StartListener">
                <kunpeng:taskHeaders>
                  <kunpeng:header key="authToken" value="abc" />
                </kunpeng:taskHeaders>
              </kunpeng:executionListener>
            </kunpeng:executionListeners>
          </bpmn:extensionElements>
        </bpmn:userTask>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'execution listener with headers (Camunda 8.9)',
    config: { version: '8.9' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener">
              <kunpeng:taskHeaders>
                <kunpeng:header key="authToken" value="abc" />
              </kunpeng:taskHeaders>
            </kunpeng:executionListener>
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Property <kunpeng:TaskHeaders> of <kunpeng:ExecutionListener> only allowed by Camunda 8.10',
      path: [
        'extensionElements',
        'values',
        0,
        'listeners',
        0,
        'headers'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'kunpeng:ExecutionListener',
        parentNode: 'UserTask_1',
        property: 'headers',
        allowedVersion: '8.10'
      }
    }
  }
];

RuleTester.verify('no-execution-listener-headers', rule, {
  valid,
  invalid
});
