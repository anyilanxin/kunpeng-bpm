const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/element-type');

const {
  withConfig,
  createCollaboration,
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'association/text annotation',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1" />
      <bpmn:textAnnotation id="TextAnnotation_1" />
      <bpmn:association id="Association_1" sourceRef="ServiceTask_1" targetRef="TextAnnotation_1" />
    `))
  },
  {
    name: 'boundary event (error)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="ServiceTask_1">
        <bpmn:errorEventDefinition id="ErrorEventDefinition_1" />
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boundary event (message)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="ServiceTask_1">
        <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'boundary event (timer)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1" />
      <bpmn:boundaryEvent id="BoundaryEvent_1" attachedToRef="ServiceTask_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
      </bpmn:boundaryEvent>
    `))
  },
  {
    name: 'call activity',
    moddleElement: createModdle(createProcess('<bpmn:callActivity id="CallActivity_1" />'))
  },
  {
    name: 'collaboration',
    moddleElement: createModdle(createCollaboration())
  },
  {
    name: 'definitions',
    moddleElement: createModdle(createDefinitions())
  },
  {
    name: 'end event',
    moddleElement: createModdle(createProcess(`
      <bpmn:endEvent id="EndEvent_1" />
    `))
  },
  {
    name: 'end event (error)',
    moddleElement: createModdle(createProcess(`
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:errorEventDefinition id="ErrorEventDefinition_1" />
      </bpmn:endEvent>
    `))
  },
  {
    name: 'event-based gateway',
    moddleElement: createModdle(createProcess('<bpmn:eventBasedGateway id="EventBasedGateway_1" />'))
  },
  {
    name: 'exclusive gateway',
    moddleElement: createModdle(createProcess('<bpmn:exlusiveGateway id="ExclusiveGateway_1" />'))
  },
  {
    name: 'group',
    moddleElement: createModdle(createProcess('<bpmn:group id="Group_1" categoryValueRef="CategoryValue_1" />'))
  },
  {
    name: 'intermediate catch event (message)',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
      </bpmn:intermediateCatchEvent>
    `))
  },
  {
    name: 'intermediate catch event (timer)',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
      </bpmn:intermediateCatchEvent>
    `))
  },
  {
    name: 'message flow',
    moddleElement: createModdle(createCollaboration(`
      <bpmn:participant id="Participant_1" />
      <bpmn:participant id="Participant_2" />
      <bpmn:messageFlow id="Flow_1" sourceRef="Participant_1" targetRef="Participant_2" />
    `))
  },
  {
    name: 'parallel gateway',
    moddleElement: createModdle(createProcess('<bpmn:parallelGateway id="ParallelGateway_1" />'))
  },
  {
    name: 'participant',
    moddleElement: createModdle(createCollaboration('<bpmn:participant id="Participant_1" />'))
  },
  {
    name: 'process',
    moddleElement: createModdle(createProcess())
  },
  {
    name: 'receive task',
    moddleElement: createModdle(createProcess('<bpmn:receiveTask id="ReceiveTask_1" />'))
  },
  {
    name: 'service task',
    moddleElement: createModdle(createProcess('<bpmn:serviceTask id="ServiceTask_1" />'))
  },
  {
    name: 'start event',
    moddleElement: createModdle(createProcess('<bpmn:startEvent id="StartEvent_1" />'))
  },
  {
    name: 'start event (error)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:errorEventDefinition id="ErrorEventDefinition_1" />
      </bpmn:startEvent>
    `))
  },
  {
    name: 'start event (message)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
      </bpmn:startEvent>
    `))
  },
  {
    name: 'start event (timer)',
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:timerEventDefinition id="TimerEventDefinition_1" />
      </bpmn:startEvent>
    `))
  },
  {
    name: 'sub process',
    moddleElement: createModdle(createProcess('<bpmn:subProcess id="SubProcess_1" />'))
  },
  {
    name: 'user task',
    moddleElement: createModdle(createProcess('<bpmn:userTask id="UserTask_1" />'))
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
    name: 'business rule task',
    moddleElement: createModdle(createProcess('<bpmn:businessRuleTask id="BusinessRuleTask_1" />')),
    report: {
      id: 'BusinessRuleTask_1',
      message: 'Element of type <bpmn:BusinessRuleTask> only allowed by Camunda 1.1 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'BusinessRuleTask_1',
        parentNode: null,
        allowedVersion: '1.1'
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
    name: 'intermediate catch event (error)',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateCatchEvent id="IntermediateCatchEvent_1">
        <bpmn:errorEventDefinition id="ErrorEventDefinition_1" />
      </bpmn:intermediateCatchEvent>
    `)),
    report: {
      id: 'IntermediateCatchEvent_1',
      message: 'Element of type <bpmn:IntermediateCatchEvent> with event definition of type <bpmn:ErrorEventDefinition> not allowed',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'IntermediateCatchEvent_1',
        parentNode: null,
        eventDefinition: 'ErrorEventDefinition_1'
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
    name: 'inlusive gateway',
    moddleElement: createModdle(createProcess('<bpmn:inclusiveGateway id="InclusiveGateway_1" />')),
    report: {
      id: 'InclusiveGateway_1',
      message: 'Element of type <bpmn:InclusiveGateway> only allowed by Camunda 8.1 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'InclusiveGateway_1',
        parentNode: null,
        allowedVersion: '8.1'
      }
    }
  },
  {
    name: 'end event (terminate)',
    moddleElement: createModdle(createProcess(`
      <bpmn:endEvent id="EndEvent_1">
        <bpmn:terminateEventDefinition id="TerminateEventDefinition_1" />
      </bpmn:endEvent>
    `)),
    report: {
      id: 'EndEvent_1',
      message: 'Element of type <bpmn:EndEvent> with event definition of type <bpmn:TerminateEventDefinition> only allowed by Camunda 8.1 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'EndEvent_1',
        parentNode: null,
        eventDefinition: 'TerminateEventDefinition_1',
        allowedVersion: '8.1'
      }
    }
  },
  {
    name: 'data store',
    moddleElement: createModdle(createProcess(`
      <bpmn:dataStoreReference id="DataStoreReference_1" />
    `)),
    report: {
      id: 'DataStoreReference_1',
      message: 'Element of type <bpmn:DataStoreReference> only allowed by Camunda 8.0 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'DataStoreReference_1',
        parentNode: null,
        allowedVersion: '8.0'
      }
    }
  },
  {
    name: 'data object',
    moddleElement: createModdle(createProcess(`
      <bpmn:dataObjectReference id="DataObjectReference_1" />
    `)),
    report: {
      id: 'DataObjectReference_1',
      message: 'Element of type <bpmn:DataObjectReference> only allowed by Camunda 8.0 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'DataObjectReference_1',
        parentNode: null,
        allowedVersion: '8.0'
      }
    }
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

RuleTester.verify('camunda-cloud-1-0-element-type', rule, {
  valid: withConfig(valid, { version: '1.0' }),
  invalid: withConfig(invalid, { version: '1.0' })
});