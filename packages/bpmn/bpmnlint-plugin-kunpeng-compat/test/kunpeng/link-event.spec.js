const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/link-event');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'escalation event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:escalationEventDefinition id="EscalationEventDefinition_1" />
      </bpmn:intermediateCatchEvent>
    `))
  },
  {
    name: 'link catch events',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:linkEventDefinition id="LinkEventDefinition_1" name="foo" />
      </bpmn:intermediateCatchEvent>
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_2">
        <bpmn:linkEventDefinition id="LinkEventDefinition_2" name="bar" />
      </bpmn:intermediateCatchEvent>
    `))
  },
  {
    name: 'link catch event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:linkEventDefinition id="LinkEventDefinition_1" name="foo" />
      </bpmn:intermediateCatchEvent>
    `))
  },
  {
    name: 'link throw event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateThrowEvent id="IntermediateThrowEvent_1">
        <bpmn:linkEventDefinition id="LinkEventDefinition_1" name="foo" />
      </bpmn:intermediateThrowEvent>
    `))
  },
  {
    name: 'start event',
    moddleElement: createModdle(createProcess('<bpmn:startEvent id="StartEvent_1" />'))
  },
  {
    name: 'task',
    moddleElement: createModdle(createProcess('<bpmn:task id="Task_1" />'))
  },
  {
    name: 'link catch events (duplicate name) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
          <bpmn:linkEventDefinition id="LinkEventDefinition_1" name="foo" />
        </bpmn:intermediateCatchEvent>
        <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_2">
          <bpmn:linkEventDefinition id="LinkEventDefinition_2" name="foo" />
        </bpmn:intermediateCatchEvent>
      </bpmn:process>
    `))
  },
  {
    name: 'link catch event (no name) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
          <bpmn:linkEventDefinition id="LinkEventDefinition_1" />
        </bpmn:intermediateCatchEvent>
      </bpmn:process>
    `))
  },
  {
    name: 'link throw event (no name) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:intermediateThrowEvent id="IntermediateThrowEvent_1">
          <bpmn:linkEventDefinition id="LinkEventDefinition_1" />
        </bpmn:intermediateThrowEvent>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'link catch events (duplicate name)',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:linkEventDefinition id="LinkEventDefinition_1" name="foo" />
      </bpmn:intermediateCatchEvent>
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_2">
        <bpmn:linkEventDefinition id="LinkEventDefinition_2" name="foo" />
      </bpmn:intermediateCatchEvent>
    `)),
    report: [
      {
        id: 'IntermediateCatchEvent_1',
        message: 'Property of type <bpmn:LinkEventDefinition> has property <name> with duplicate value of <foo>',
        path: [
          'eventDefinitions',
          0,
          'name'
        ],
        data: {
          type: ERROR_TYPES.ELEMENT_PROPERTY_VALUE_DUPLICATED,
          node: 'LinkEventDefinition_1',
          parentNode: 'IntermediateCatchEvent_1',
          duplicatedProperty: 'name',
          duplicatedPropertyValue: 'foo'
        },
      },
      {
        id: 'IntermediateCatchEvent_2',
        message: 'Property of type <bpmn:LinkEventDefinition> has property <name> with duplicate value of <foo>',
        path: [
          'eventDefinitions',
          0,
          'name'
        ],
        data: {
          type: ERROR_TYPES.ELEMENT_PROPERTY_VALUE_DUPLICATED,
          node: 'LinkEventDefinition_2',
          parentNode: 'IntermediateCatchEvent_2',
          duplicatedProperty: 'name',
          duplicatedPropertyValue: 'foo'
        },
      }
    ]
  },
  {
    name: 'link catch event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:linkEventDefinition id="LinkEventDefinition_1" />
      </bpmn:intermediateCatchEvent>
    `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Element of type <bpmn:LinkEventDefinition> must have property <name>',
      path: [
        'eventDefinitions',
        0,
        'name'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'LinkEventDefinition_1',
        parentNode: 'IntermediateCatchEvent_1',
        requiredProperty: 'name'
      },
    }
  },
  {
    name: 'link throw event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateThrowEvent id="IntermediateThrowEvent_1">
        <bpmn:linkEventDefinition id="LinkEventDefinition_1" />
      </bpmn:intermediateThrowEvent>
    `)),
    report: {
      id: 'IntermediateThrowEvent_1',
      message: 'Element of type <bpmn:LinkEventDefinition> must have property <name>',
      path: [
        'eventDefinitions',
        0,
        'name'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'LinkEventDefinition_1',
        parentNode: 'IntermediateThrowEvent_1',
        requiredProperty: 'name'
      },
    }
  },
  {
    name: 'link catch events (missing name, no duplicate name)',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:linkEventDefinition id="LinkEventDefinition_1" />
      </bpmn:intermediateCatchEvent>
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_2">
        <bpmn:linkEventDefinition id="LinkEventDefinition_2" name="foo" />
      </bpmn:intermediateCatchEvent>
    `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Element of type <bpmn:LinkEventDefinition> must have property <name>',
      path: [
        'eventDefinitions',
        0,
        'name'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'LinkEventDefinition_1',
        parentNode: 'IntermediateCatchEvent_1',
        requiredProperty: 'name'
      },
    }
  }
];

RuleTester.verify('link-event', rule, {
  valid,
  invalid
});