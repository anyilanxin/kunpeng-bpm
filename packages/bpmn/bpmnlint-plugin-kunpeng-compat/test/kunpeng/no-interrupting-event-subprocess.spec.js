const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-interrupting-event-subprocess');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'no start event',
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="SubProcess_1">
        <bpmn:subProcess id="SubProcess_2" triggeredByEvent="true" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'non-interrupting start event',
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="SubProcess_1">
        <bpmn:subProcess id="SubProcess_2" triggeredByEvent="true">
          <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
            <bpmn:timerEventDefinition />
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'regular subprocess (parent)',
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1">
        <bpmn:subProcess id="SubProcess_2" triggeredByEvent="true" />
      </bpmn:subProcess>
    `))
  },
  {
    name: 'regular subprocess (child)',
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="SubProcess_1">
        <bpmn:subProcess id="SubProcess_2" />
      </bpmn:adHocSubProcess>
    `))
  }
];

const invalid = [
  {
    name: 'interrupting start event',
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="SubProcess_1">
        <bpmn:subProcess id="SubProcess_2" triggeredByEvent="true">
          <bpmn:startEvent id="StartEvent_1">
            <bpmn:timerEventDefinition />
          </bpmn:startEvent>
        </bpmn:subProcess>
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Property <isInterrupting> must have value of <false>',
      path: [
        'isInterrupting'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_REQUIRED,
        node: 'StartEvent_1',
        parentNode: null,
        property: 'isInterrupting',
        requiredValue: false
      }
    }
  }
];

RuleTester.verify('no-interrupting-event-subprocess', rule, {
  valid,
  invalid
});