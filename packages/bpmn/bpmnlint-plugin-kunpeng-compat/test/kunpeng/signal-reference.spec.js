const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/signal-reference');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'start event (signal)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" signalRef="Signal_1" />
        </bpmn:startEvent>
      </bpmn:process>
      <bpmn:signal id="Signal_1" name="foo" />
    `))
  },
  {
    name: 'intermediate throw event (signal)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:intermediateThrowEvent id="IntermediateThrowEvent_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" signalRef="Signal_1" />
        </bpmn:intermediateThrowEvent>
      </bpmn:process>
      <bpmn:signal id="Signal_1" name="foo" />
    `))
  },
  {
    name: 'end event (signal)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" signalRef="Signal_1" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:signal id="Signal_1" name="foo" />
    `))
  },
  {
    name: 'task',
    moddleElement: createModdle(createProcess('<bpmn:task id="Task_1" />'))
  },
  {
    name: 'intermediate throw event (no signal reference) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:intermediateThrowEvent id="IntermediateThrowEvent_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
        </bpmn:intermediateThrowEvent>
      </bpmn:process>
    `))
  },
  {
    name: 'intermediate catch event (signal)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" signalRef="Signal_1" />
        </bpmn:intermediateCatchEvent>
      </bpmn:process>
      <bpmn:signal id="Signal_1" name="foo" />
    `))
  },
  {
    name: 'boundary event (signal)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:task id="Task_1" />
        <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" signalRef="Signal_1"/>
        </bpmn:boundaryEvent>
      </bpmn:process>
      <bpmn:signal id="Signal_1" name="foo" />
    `))
  }
];

const invalid = [
  {
    name: 'start event (no signal reference)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:SignalEventDefinition> must have property <signalRef>',
      path: [
        'eventDefinitions',
        0,
        'signalRef'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'SignalEventDefinition_1',
        parentNode: 'StartEvent_1',
        requiredProperty: 'signalRef'
      }
    }
  },
  {
    name: 'start event (no signal name)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" signalRef="Signal_1" />
        </bpmn:startEvent>
      </bpmn:process>
      <bpmn:signal id="Signal_1" />
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:Signal> must have property <name>',
      path: [
        'eventDefinitions',
        0,
        'signalRef',
        'name'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'Signal_1',
        parentNode: 'StartEvent_1',
        requiredProperty: 'name'
      }
    }
  },
  {
    name: 'intermediate throw event (no signal reference)',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateThrowEvent id="IntermediateThrowEvent_1">
        <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
      </bpmn:intermediateThrowEvent>
    `)),
    report: {
      id: 'IntermediateThrowEvent_1',
      message: 'Element of type <bpmn:SignalEventDefinition> must have property <signalRef>',
      path: [
        'eventDefinitions',
        0,
        'signalRef'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'SignalEventDefinition_1',
        parentNode: 'IntermediateThrowEvent_1',
        requiredProperty: 'signalRef'
      }
    }
  },
  {
    name: 'intermediate throw event (no signal name)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:intermediateThrowEvent id="IntermediateThrowEvent_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" signalRef="Signal_1" />
        </bpmn:intermediateThrowEvent>
      </bpmn:process>
      <bpmn:signal id="Signal_1" />
    `)),
    report: {
      id: 'IntermediateThrowEvent_1',
      message: 'Element of type <bpmn:Signal> must have property <name>',
      path: [
        'eventDefinitions',
        0,
        'signalRef',
        'name'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'Signal_1',
        parentNode: 'IntermediateThrowEvent_1',
        requiredProperty: 'name'
      }
    }
  },
  {
    name: 'end event (no signal reference)',
    moddleElement: createModdle(createProcess(`
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
      </bpmn:endEvent>
    `)),
    report: {
      id: 'EndEvent_1',
      message: 'Element of type <bpmn:SignalEventDefinition> must have property <signalRef>',
      path: [
        'eventDefinitions',
        0,
        'signalRef'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'SignalEventDefinition_1',
        parentNode: 'EndEvent_1',
        requiredProperty: 'signalRef'
      }
    }
  },
  {
    name: 'end event (no signal name)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1" signalRef="Signal_1" />
        </bpmn:endEvent>
      </bpmn:process>
      <bpmn:signal id="Signal_1" />
    `)),
    report: {
      id: 'EndEvent_1',
      message: 'Element of type <bpmn:Signal> must have property <name>',
      path: [
        'eventDefinitions',
        0,
        'signalRef',
        'name'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'Signal_1',
        parentNode: 'EndEvent_1',
        requiredProperty: 'name'
      }
    }
  },
  {
    name: 'intermediate catch event (no signal reference)',
    moddleElement: createModdle(createDefinitions(`
        <bpmn:process id="Process_1" isExecutable="true">
          <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
            <bpmn:signalEventDefinition id="SignalEventDefinition_1" />
          </bpmn:intermediateCatchEvent>
        </bpmn:process>
      `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Element of type <bpmn:SignalEventDefinition> must have property <signalRef>',
      path: [
        'eventDefinitions',
        0,
        'signalRef'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'SignalEventDefinition_1',
        parentNode: 'IntermediateCatchEvent_1',
        requiredProperty: 'signalRef'
      }
    }
  },
  {
    name: 'boundary event (signal)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:task id="Activity_1t7z418" />
        <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Activity_1t7z418">
          <bpmn:signalEventDefinition id="SignalEventDefinition_1"/>
        </bpmn:boundaryEvent>
      </bpmn:process>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Element of type <bpmn:SignalEventDefinition> must have property <signalRef>',
      path: [
        'eventDefinitions',
        0,
        'signalRef'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'SignalEventDefinition_1',
        parentNode: 'BoundaryEvent_1',
        requiredProperty: 'signalRef'
      }
    }
  }
];

RuleTester.verify('error-reference', rule, {
  valid,
  invalid
});