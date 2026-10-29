const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/element-type');

const {
  withConfig,
  createModdle,
  createProcess
} = require('../helper');

const valid = [
  ...require('./camunda-cloud-8-8-element-type.spec').valid,
  {
    name: 'conditional boundary event',
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:conditionalEventDefinition id="ConditionalEventDefinition_1">
          <bpmn:condition xsi:type="bpmn:tFormalExpression">=condition</bpmn:condition>
        </bpmn:conditionalEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'conditional intermediate catch event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:conditionalEventDefinition id="ConditionalEventDefinition_1">
          <bpmn:condition xsi:type="bpmn:tFormalExpression">=condition</bpmn:condition>
        </bpmn:conditionalEventDefinition>
      </bpmn:intermediateCatchEvent>
    `))
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
    `))
  }
];

module.exports.valid = valid;

RuleTester.verify('camunda-cloud-8-9-element-type', rule, {
  valid: withConfig(valid, { version: '8.9' }),
  invalid: []
});
