const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/element-type');

const {
  withConfig,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  ...require('./camunda-cloud-8-0-element-type.spec').valid,
  {
    name: 'inclusive gateway',
    moddleElement: createModdle(createProcess(`
      <bpmn:inclusiveGateway id="InclusiveGateway_1" />
    `))
  },
  {
    name: 'Terminate end event',
    moddleElement: createModdle(createProcess(`
      <bpmn:endEvent id="Event_1qpo2zy">
        <bpmn:terminateEventDefinition id="TerminateEventDefinition_0c6uql1" />
      </bpmn:endEvent>
    `))
  }
];

module.exports.valid = valid;

const invalid = [
  {
    name: 'boundary event (no event definition)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="ServiceTask_1" />
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Element of type <bpmn:BoundaryEvent> with no event definition not allowed',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'BoundaryEvent_1',
        parentNode: null
      }
    }
  },
  {
    name: 'complex gateway',
    moddleElement: createModdle(createProcess('<bpmn:complexGateway id="ComplexGateway_1" />')),
    report: {
      id: 'ComplexGateway_1',
      message: 'Element of type <bpmn:ComplexGateway> not allowed',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'ComplexGateway_1',
        parentNode: null
      }
    }
  },
  {
    name: 'intermediate catch event',
    moddleElement: createModdle(createProcess('<bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1" />')),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Element of type <bpmn:IntermediateCatchEvent> with no event definition not allowed',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'IntermediateCatchEvent_1',
        parentNode: null
      }
    }
  },
  {
    name: 'task',
    moddleElement: createModdle(createProcess('<bpmn:task id="Task_1" />')),
    report: {
      id: 'Task_1',
      message: 'Element of type <bpmn:Task> only allowed by Camunda 8.2 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'Task_1',
        parentNode: null,
        allowedVersion: '8.2'
      }
    }
  },
  {
    name: 'link events',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:linkEventDefinition id="LinkEventDefinition_1" name="Foobar" />
      </bpmn:intermediateCatchEvent>
      <bpmn:intermediateThrowEvent id="IntermediateThrowEvent_1">
        <bpmn:linkEventDefinition id="LinkEventDefinition_2" name="Foobar" />
      </bpmn:intermediateThrowEvent>
    `)),
    report: [
      {
        id: 'IntermediateCatchEvent_1',
        message: 'Element of type <bpmn:IntermediateCatchEvent> with event definition of type <bpmn:LinkEventDefinition> only allowed by Camunda 8.2 or newer',
        path: null,
        data: {
          type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
          node: 'IntermediateCatchEvent_1',
          parentNode: null,
          eventDefinition: 'LinkEventDefinition_1',
          allowedVersion: '8.2'
        }
      },
      {
        id: 'IntermediateThrowEvent_1',
        message: 'Element of type <bpmn:IntermediateThrowEvent> with event definition of type <bpmn:LinkEventDefinition> only allowed by Camunda 8.2 or newer',
        path: null,
        data: {
          type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
          node: 'IntermediateThrowEvent_1',
          parentNode: null,
          eventDefinition: 'LinkEventDefinition_2',
          allowedVersion: '8.2'
        }
      }
    ]
  },
  {
    name: 'signal intermediate throw event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateThrowEvent id="IntermediateThrowEvent_1">
        <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
      </bpmn:intermediateThrowEvent>
    `)),
    report: {
      id: 'IntermediateThrowEvent_1',
      message: 'Element of type <bpmn:IntermediateThrowEvent> with event definition of type <bpmn:SignalEventDefinition> only allowed by Camunda 8.3 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'IntermediateThrowEvent_1',
        parentNode: null,
        eventDefinition: 'SignalEventDefinition_1',
        allowedVersion: '8.3'
      }
    }
  },
  {
    name: 'signal end event',
    moddleElement: createModdle(createProcess(`
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
      </bpmn:endEvent>
    `)),
    report: {
      id: 'EndEvent_1',
      message: 'Element of type <bpmn:EndEvent> with event definition of type <bpmn:SignalEventDefinition> only allowed by Camunda 8.3 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'EndEvent_1',
        parentNode: null,
        eventDefinition: 'SignalEventDefinition_1',
        allowedVersion: '8.3'
      }
    }
  }
];

RuleTester.verify('camunda-cloud-8-1-element-type', rule, {
  valid: withConfig(valid, { version: '8.1' }),
  invalid: withConfig(invalid, { version: '8.1' })
});
