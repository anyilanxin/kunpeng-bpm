const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/timer');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const EXPRESSION_VALUES = {
  CRON: {
    EXPRESSION: '0 0 9-17 * * MON-FRI',
    MACRO: '@daily',
  },
  ISO_8601: {
    TIME_CYCLE: 'R/P1D',
    TIME_DATE: '2019-10-01T12:00:00Z',
    TIME_DURATION: 'P1D'
  }
};

const FEEL_EXPRESSION_VALUE = '=foo';

const valid = [

  /**
   * Start Event, Interrupting
   */
  {
    name: 'start event with time cycle (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_CYCLE }</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `))
  },
  {
    name: 'start event with time cycle (cron)',
    config: { version: '8.1' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.CRON.EXPRESSION }</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `))
  },
  {
    name: 'start event with time cycle (expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ FEEL_EXPRESSION_VALUE }</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `))
  },
  {
    name: 'start event with time date (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDate xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DATE }</bpmn:timeDate>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `))
  },
  {
    name: 'start event time date (expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDate xsi:type="bpmn:tFormalExpression">${ FEEL_EXPRESSION_VALUE }</bpmn:timeDate>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `))
  },

  /**
   * Intermediate Catch Event
   */
  {
    name: 'timer intermediate catch event with time date (ISO-8601)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDate xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DATE }</bpmn:timeDate>
        </bpmn:timerEventDefinition>
      </bpmn:intermediateCatchEvent>
    `))
  },
  {
    name: 'intermediate catch event with time duration (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DURATION }</bpmn:timeDuration>
        </bpmn:timerEventDefinition>
      </bpmn:intermediateCatchEvent>
    `))
  },

  /**
   * Boundary Event, Interrupting
   */
  {
    name: 'boundary event with date (ISO-8601)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDate xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DATE }</bpmn:timeDate>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boundary event with time date (expression)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDate xsi:type="bpmn:tFormalExpression">${ FEEL_EXPRESSION_VALUE }</bpmn:timeDate>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boundary event with duration (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DURATION }</bpmn:timeDuration>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boundary event with time duration (expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${ FEEL_EXPRESSION_VALUE }</bpmn:timeDuration>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },

  /**
   * Boundary Event, Non-Interrupting
   */
  {
    name: 'boundary event with time cycle (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" cancelActivity="false" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_CYCLE }</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boundary event with time cycle (cron)',
    config: { version: '8.1' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" cancelActivity="false" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.CRON.EXPRESSION }</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boundary event with time cycle (cron macro)',
    config: { version: '8.1' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" cancelActivity="false" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.CRON.MACRO }</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boudary event with time cycle (expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" cancelActivity="false" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${ FEEL_EXPRESSION_VALUE }</bpmn:timeDuration>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boundary event with time duration (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" cancelActivity="false" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DURATION }</bpmn:timeDuration>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boundary event with time duration (expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="Event" cancelActivity="false" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${ FEEL_EXPRESSION_VALUE }</bpmn:timeDuration>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `))
  },

  /**
   * Start Event, Interrupting, Event Sub-Process
   */
  {
    name: 'start event with time date (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDate xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DATE }</bpmn:timeDate>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `))
  },
  {
    name: 'start event with time duration (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DURATION }</bpmn:timeDuration>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `))
  },

  /**
   * Start Event, Non-Interrupting, Event Sub-Process
   */
  {
    name: 'start event with time cycle (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_CYCLE }</bpmn:timeCycle>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `))
  },
  {
    name: 'start event with time cycle (cron)',
    config: { version: '8.1' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.CRON.EXPRESSION }</bpmn:timeCycle>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `))
  },
  {
    name: 'start event with time cycle (expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ FEEL_EXPRESSION_VALUE }</bpmn:timeCycle>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `))
  },
  {
    name: 'start event with time date (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDate xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DATE }</bpmn:timeDate>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `))
  },
  {
    name: 'start event with time duration (ISO-8601)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.ISO_8601.TIME_DURATION }</bpmn:timeDuration>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `))
  },

  /**
   * Non-Executable Process
   */
  {
    name: 'timer start event (no expression) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:startEvent id="Event">
          <bpmn:timerEventDefinition id="TimerEventDefinition" />
        </bpmn:startEvent>
      </bpmn:process>
    `))
  }
];

const invalid = [

  /**
   * Start Event, Interrupting
   */
  {
    name: 'timer start event (no expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:TimerEventDefinition> must have property <timeCycle> or <timeDate>',
      path: [
        'eventDefinitions',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'TimerEventDefinition_1',
        parentNode: 'StartEvent_1',
        requiredProperty: [
          'timeCycle',
          'timeDate'
        ]
      }
    }
  },
  {
    name: 'timer start event (empty expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Property <timeCycle> must have expression value',
      path: [
        'eventDefinitions',
        0,
        'timeCycle'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_REQUIRED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeCycle'
      }
    }
  },
  {
    name: 'timer start event with time cycle (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">foo</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeCycle'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeCycle'
      }
    }
  },
  {
    name: 'timer start event with time date (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDate xsi:type="bpmn:tFormalExpression">foo</bpmn:timeDate>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeDate'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeDate'
      }
    }
  },
  {
    name: 'timer start event with time duration (not allowed)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Property <timeDuration> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeDuration'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'TimerEventDefinition_1',
        parentNode: 'StartEvent_1',
        property: 'timeDuration'
      }
    }
  },

  /**
   * Intermediate Catch Event
   */
  {
    name: 'timer intermediate catch event (no expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
      </bpmn:intermediateCatchEvent>
    `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Element of type <bpmn:TimerEventDefinition> must have property <timeDuration>',
      path: [
        'eventDefinitions',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'TimerEventDefinition_1',
        parentNode: 'IntermediateCatchEvent_1',
        requiredProperty: [
          'timeDuration'
        ]
      }
    }
  },
  {
    name: 'timer intermediate catch event (empty expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:intermediateCatchEvent>
    `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Property <timeDuration> must have expression value',
      path: [
        'eventDefinitions',
        0,
        'timeDuration'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_REQUIRED,
        node: 'bpmn:FormalExpression',
        parentNode: 'IntermediateCatchEvent_1',
        property: 'timeDuration'
      }
    }
  },
  {
    name: 'timer intermediate catch event with time cycle (not allowed)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:intermediateCatchEvent>
    `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Property <timeCycle> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeCycle'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'TimerEventDefinition_1',
        parentNode: 'IntermediateCatchEvent_1',
        property: 'timeCycle'
      }
    }
  },
  {
    name: 'timer intermediate catch event with time date (not allowed)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDate xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:intermediateCatchEvent>
    `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Property <timeDate> only allowed by Camunda 8.3 or newer',
      path: [
        'eventDefinitions',
        0,
        'timeDate'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'TimerEventDefinition_1',
        parentNode: 'IntermediateCatchEvent_1',
        property: 'timeDate',
        allowedVersion: '8.3'
      }
    }
  },
  {
    name: 'timer intermediate catch event with time duration (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">foo</bpmn:timeDuration>
        </bpmn:timerEventDefinition>
      </bpmn:intermediateCatchEvent>
    `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeDuration'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'IntermediateCatchEvent_1',
        property: 'timeDuration'
      }
    }
  },

  /**
   * Boundary Event, Interrupting
   */
  {
    name: 'timer boundary event (no expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Element of type <bpmn:TimerEventDefinition> must have property <timeDuration>',
      path: [
        'eventDefinitions',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'TimerEventDefinition_1',
        parentNode: 'BoundaryEvent_1',
        requiredProperty: [
          'timeDuration'
        ]
      }
    }
  },
  {
    name: 'timer boundary event (empty expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Property <timeDuration> must have expression value',
      path: [
        'eventDefinitions',
        0,
        'timeDuration'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_REQUIRED,
        node: 'bpmn:FormalExpression',
        parentNode: 'BoundaryEvent_1',
        property: 'timeDuration'
      }
    }
  },
  {
    name: 'timer boundary event with time cycle (not allowed)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Property <timeCycle> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeCycle'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'TimerEventDefinition_1',
        parentNode: 'BoundaryEvent_1',
        property: 'timeCycle'
      }
    }
  },
  {
    name: 'timer boundary event with time date (not allowed)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDate xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Property <timeDate> only allowed by Camunda 8.3 or newer',
      path: [
        'eventDefinitions',
        0,
        'timeDate'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'TimerEventDefinition_1',
        parentNode: 'BoundaryEvent_1',
        property: 'timeDate',
        allowedVersion: '8.3'
      }
    }
  },
  {
    name: 'timer boundary event with time duration (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">foo</bpmn:timeDuration>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeDuration'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'BoundaryEvent_1',
        property: 'timeDuration'
      }
    }
  },

  /**
   * Boundary Event, Non-Interrupting
   */
  {
    name: 'non-interrupting timer boundary event (no expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1" cancelActivity="false">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Element of type <bpmn:TimerEventDefinition> must have property <timeCycle> or <timeDuration>',
      path: [
        'eventDefinitions',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'TimerEventDefinition_1',
        parentNode: 'BoundaryEvent_1',
        requiredProperty: [
          'timeCycle',
          'timeDuration'
        ]
      }
    }
  },
  {
    name: 'non-interrupting timer boundary event (empty expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1" cancelActivity="false">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Property <timeDuration> must have expression value',
      path: [
        'eventDefinitions',
        0,
        'timeDuration'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_REQUIRED,
        node: 'bpmn:FormalExpression',
        parentNode: 'BoundaryEvent_1',
        property: 'timeDuration'
      }
    }
  },
  {
    name: 'non-interrupting timer boundary event with time cycle (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1" cancelActivity="false">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">foo</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeCycle'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'BoundaryEvent_1',
        property: 'timeCycle'
      }
    }
  },
  {
    name: 'non-interrupting timer boundary event with time date (not allowed)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1" cancelActivity="false">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDate xsi:type="bpmn:tFormalExpression" />
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Property <timeDate> only allowed by Camunda 8.3 or newer',
      path: [
        'eventDefinitions',
        0,
        'timeDate'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'TimerEventDefinition_1',
        parentNode: 'BoundaryEvent_1',
        property: 'timeDate',
        allowedVersion: '8.3'
      }
    }
  },
  {
    name: 'non-interrupting timer boundary event with time duration (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:task id="Task_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="Task_1" cancelActivity="false">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">foo</bpmn:timeDuration>
        </bpmn:timerEventDefinition>
      </bpmn:boundaryEvent>
    `)),
    report: {
      id: 'BoundaryEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeDuration'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'BoundaryEvent_1',
        property: 'timeDuration'
      }
    }
  },

  /**
   * Start Event, Interrupting, Event Sub-Process
   */
  {
    name: 'timer start event in event sub-process (no expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:TimerEventDefinition> must have property <timeDate> or <timeDuration>',
      path: [
        'eventDefinitions',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'TimerEventDefinition_1',
        parentNode: 'StartEvent_1',
        requiredProperty: [
          'timeDate',
          'timeDuration'
        ]
      }
    }
  },
  {
    name: 'timer start event in event sub-process (empty expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDate xsi:type="bpmn:tFormalExpression" />
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Property <timeDate> must have expression value',
      path: [
        'eventDefinitions',
        0,
        'timeDate'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_REQUIRED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeDate'
      }
    }
  },
  {
    name: 'timer start event with time cycle in event sub-process (not allowed)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeCycle xsi:type="bpmn:tFormalExpression" />
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Property <timeCycle> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeCycle'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'TimerEventDefinition_1',
        parentNode: 'StartEvent_1',
        property: 'timeCycle'
      }
    }
  },
  {
    name: 'timer start event with time date in event sub-process (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDate xsi:type="bpmn:tFormalExpression">foo</bpmn:timeDate>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeDate'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeDate'
      }
    }
  },
  {
    name: 'timer start event with time duration in event sub-process (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">foo</bpmn:timeDuration>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeDuration'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeDuration'
      }
    }
  },

  /**
   * Start Event, Non-Interrupting, Event Sub-Process
   */
  {
    name: 'non-interrupting timer start event in event sub-process (no expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <bpmn:TimerEventDefinition> must have property <timeCycle>, <timeDate> or <timeDuration>',
      path: [
        'eventDefinitions',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'TimerEventDefinition_1',
        parentNode: 'StartEvent_1',
        requiredProperty: [
          'timeCycle',
          'timeDate',
          'timeDuration'
        ]
      }
    }
  },
  {
    name: 'non-interrupting timer start event in event sub-process (empty expression)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDate xsi:type="bpmn:tFormalExpression" />
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Property <timeDate> must have expression value',
      path: [
        'eventDefinitions',
        0,
        'timeDate'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_REQUIRED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeDate'
      }
    }
  },
  {
    name: 'non-interrupting timer start event with time cycle in event sub-process (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">foo</bpmn:timeCycle>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeCycle'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeCycle'
      }
    }
  },
  {
    name: 'non-interrupting timer start event with time date in event sub-process (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDate xsi:type="bpmn:tFormalExpression">foo</bpmn:timeDate>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeDate'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeDate'
      }
    }
  },
  {
    name: 'non-interrupting timer start event with time duration in event sub-process (invalid)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" triggeredByEvent="true">
        <bpmn:startEvent id="StartEvent_1" isInterrupting="false">
          <bpmn:timerEventDefinition id="TimerEventDefinition_1">
            <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">foo</bpmn:timeDuration>
          </bpmn:timerEventDefinition>
        </bpmn:startEvent>
      </bpmn:subProcess>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Expression value of <foo> not allowed',
      path: [
        'eventDefinitions',
        0,
        'timeDuration'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeDuration'
      }
    }
  },

  /**
   * CRON Expressions
   */
  {
    name: 'timer start event with time cycle (CRON expression with Camunda < 8.1)',
    config: { version: '1.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1">
          <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">${ EXPRESSION_VALUES.CRON.EXPRESSION }</bpmn:timeCycle>
        </bpmn:timerEventDefinition>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Expression value of <0 0 9-17 * * MON-FRI> only allowed by Camunda 8.1',
      path: [
        'eventDefinitions',
        0,
        'timeCycle'
      ],
      data: {
        type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
        node: 'bpmn:FormalExpression',
        parentNode: 'StartEvent_1',
        property: 'timeCycle',
        allowedVersion: '8.1'
      }
    }
  }
];

// TODO: validate CRON in Camunda < 8.1 fails

RuleTester.verify('timer', rule, {
  valid,
  invalid
});