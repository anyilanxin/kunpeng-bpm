const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/error-reference');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'end event (error)',
    config: { version: '8.1' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:errorEventDefinition id="ErrorEventDefinition_1" errorRef="Error_1" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:error id="Error_1" errorCode="foo" />
    `))
  },
  {
    name: 'end event (message)',
    config: { version: '8.1' },
    moddleElement: createModdle(createProcess(`
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
      </bpmn:endEvent>
    `))
  },
  {
    name: 'end event',
    config: { version: '8.1' },
    moddleElement: createModdle(createProcess('<bpmn:endEvent id="EndEvent_1" />'))
  },
  {
    name: 'task',
    config: { version: '8.1' },
    moddleElement: createModdle(createProcess('<bpmn:task id="Task_1" />'))
  },
  {
    name: 'error boundary event (no error reference) (Camunda 8.2)',
    config: { version: '8.2' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:errorEventDefinition id="ErrorEventDefinition_1" />
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'error end event (no error reference) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:errorEventDefinition id="ErrorEventDefinition_1" />
        </bpmn:endEvent>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'error end event (no error reference)',
    config: { version: '8.1' },
    moddleElement: createModdle(createProcess(`
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:errorEventDefinition id="ErrorEventDefinition_1" />
      </bpmn:endEvent>
    `)),
    report: {
      id: 'EndEvent_1',
      message: 'Element of type <bpmn:ErrorEventDefinition> without property <errorRef> only allowed by Camunda 8.2 or newer',
      path: [
        'eventDefinitions',
        0,
        'errorRef'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'ErrorEventDefinition_1',
        parentNode: 'EndEvent_1',
        requiredProperty: 'errorRef',
        allowedVersion: '8.2'
      }
    }
  },
  {
    name: 'error end event (no error code) (Camunda 8.1)',
    config: { version: '8.1' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:errorEventDefinition id="ErrorEventDefinition_1" errorRef="Error_1" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:error id="Error_1" />
    `)),
    report: {
      id: 'EndEvent_1',
      message: 'Element of type <bpmn:Error> must have property <errorCode>',
      path: [
        'eventDefinitions',
        0,
        'errorRef',
        'errorCode'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'Error_1',
        parentNode: 'EndEvent_1',
        requiredProperty: 'errorCode'
      }
    }
  },
  {
    name: 'error end event (no error code) (Camunda 8.2)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:errorEventDefinition id="ErrorEventDefinition_1" errorRef="Error_1" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:error id="Error_1" />
    `)),
    report: {
      id: 'EndEvent_1',
      message: 'Element of type <bpmn:Error> must have property <errorCode>',
      path: [
        'eventDefinitions',
        0,
        'errorRef',
        'errorCode'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'Error_1',
        parentNode: 'EndEvent_1',
        requiredProperty: 'errorCode'
      }
    }
  },
  {
    name: 'error boundary event (no error reference)',
    config: { version: '8.1' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:errorEventDefinition id="ErrorEventDefinition_1" />
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Element of type <bpmn:ErrorEventDefinition> without property <errorRef> only allowed by Camunda 8.2 or newer',
      path: [
        'eventDefinitions',
        0,
        'errorRef'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'ErrorEventDefinition_1',
        parentNode: 'BoundaryEvent_1',
        requiredProperty: 'errorRef',
        allowedVersion: '8.2'
      }
    }
  },
  {
    name: 'error boundary event (no error code)',
    config: { version: '8.1' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:task id="Task_1" />
        <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
          <bpmn:errorEventDefinition id="ErrorEventDefinition_1" errorRef="Error_1" />
        </bpmn:boundaryEvent>
      </bpmn:process>
      <bpmn:error id="Error_1" />
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Element of type <bpmn:Error> must have property <errorCode>',
      path: [
        'eventDefinitions',
        0,
        'errorRef',
        'errorCode'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'Error_1',
        parentNode: 'BoundaryEvent_1',
        requiredProperty: 'errorCode'
      }
    }
  }
];

RuleTester.verify('error-reference', rule, {
  valid,
  invalid
});