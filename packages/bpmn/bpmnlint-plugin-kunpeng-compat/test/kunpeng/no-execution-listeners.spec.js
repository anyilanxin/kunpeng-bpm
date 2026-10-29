const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-execution-listeners');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'user task without execution listeners',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1" />
    `))
  }
];

const invalid = [
  {
    name: 'no execution listeners (Camunda 8.5)',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Extension element of type <kunpeng:ExecutionListeners> only allowed by Camunda 8.6',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'UserTask_1',
        parentNode: null,
        extensionElement: 'kunpeng:ExecutionListeners',
        allowedVersion: '8.6'
      }
    }
  }
];

RuleTester.verify('no-execution-listeners', rule, {
  valid,
  invalid
});