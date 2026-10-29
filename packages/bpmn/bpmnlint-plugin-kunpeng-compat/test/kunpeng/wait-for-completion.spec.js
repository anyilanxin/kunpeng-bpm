const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/wait-for-completion');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'catch event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1" />
    `))
  },
  {
    name: 'compensation intermediate event: waitForCompletion=true',
    moddleElement: createModdle(createProcess(`
    <bpmn:intermediateThrowEvent id="Event">
      <bpmn:compensateEventDefinition waitForCompletion="true" />
    </bpmn:intermediateThrowEvent>
    `))
  },
  {
    name: 'compensation end event: waitForCompletion=true',
    moddleElement: createModdle(createProcess(`
    <bpmn:endEvent id="Event">
      <bpmn:compensateEventDefinition waitForCompletion="true" />
    </bpmn:endEvent>
    `))
  },
  {
    name: 'compensation intermediate event: waitForCompletion not set (defaults to true)',
    moddleElement: createModdle(createProcess(`
    <bpmn:intermediateThrowEvent id="Event">
      <bpmn:compensateEventDefinition />
    </bpmn:intermediateThrowEvent>
    `))
  },
  {
    name: 'compensation end event: waitForCompletion not set (defaults to true)',
    moddleElement: createModdle(createProcess(`
    <bpmn:endEvent id="Event">
      <bpmn:compensateEventDefinition />
    </bpmn:endEvent>
    `))
  }
];

const invalid = [
  {
    name: 'compensation end event: waitForCompletion=false',
    moddleElement: createModdle(createProcess(`
    <bpmn:endEvent id="Event">
      <bpmn:compensateEventDefinition waitForCompletion="false" />
    </bpmn:endEvent>
    `)),
    report: [
      {
        id: 'Event',
        message: 'Property <waitForCompletion> must have value of <true>',
        path: [
          'eventDefinitions',
          0,
          'waitForCompletion'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_REQUIRED,
          node: 'bpmn:CompensateEventDefinition',
          parentNode: 'Event',
          property: 'waitForCompletion',
          requiredValue: true
        }
      }
    ]
  }
];

RuleTester.verify('wait-for-completion', rule, {
  valid,
  invalid
});