const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/element-type');

const {
  withConfig,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  ...require('./camunda-cloud-8-7-element-type.spec').valid
];

module.exports.valid = valid;

const invalid = [
  {
    name: 'conditional boundary event',
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:conditionalEventDefinition id="ConditionalEventDefinition_1">
          <bpmn:condition xsi:type="bpmn:tFormalExpression">=condition</bpmn:condition>
        </bpmn:conditionalEventDefinition>
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Element of type <bpmn:BoundaryEvent> with event definition of type <bpmn:ConditionalEventDefinition> only allowed by Camunda 8.9 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'BoundaryEvent_1',
        parentNode: null,
        eventDefinition: 'ConditionalEventDefinition_1',
        allowedVersion: '8.9'
      }
    }
  },
  {
    name: 'conditional intermediate catch event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:conditionalEventDefinition id="ConditionalEventDefinition_1">
          <bpmn:condition xsi:type="bpmn:tFormalExpression">=condition</bpmn:condition>
        </bpmn:conditionalEventDefinition>
      </bpmn:intermediateCatchEvent>
    `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Element of type <bpmn:IntermediateCatchEvent> with event definition of type <bpmn:ConditionalEventDefinition> only allowed by Camunda 8.9 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'IntermediateCatchEvent_1',
        parentNode: null,
        eventDefinition: 'ConditionalEventDefinition_1',
        allowedVersion: '8.9'
      }
    }
  },
  {
    name: 'conditional start event',
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="EventSubProcess" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:conditionalEventDefinition id="ConditionalEventDefinition_1">
            <bpmn:condition xsi:type="bpmn:tFormalExpression">=condition</bpmn:condition>
          </bpmn:conditionalEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:StartEvent> with event definition of type <bpmn:ConditionalEventDefinition> only allowed by Camunda 8.9 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'StartEvent_1',
        parentNode: null,
        eventDefinition: 'ConditionalEventDefinition_1',
        allowedVersion: '8.9'
      }
    }
  }
];

RuleTester.verify('camunda-cloud-8-8-element-type', rule, {
  valid: withConfig(valid, { version: '8.8' }),
  invalid: withConfig(invalid, { version: '8.8' })
});
