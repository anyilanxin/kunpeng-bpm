export const PROPERTY_TYPE = 'property';

export const KUNNG_PROPERTY_TYPE = 'kunpeng:property';
export const KUNNG_INPUT_TYPE = 'kunpeng:input';
export const KUNPENG_OUTPUT_TYPE = 'kunpeng:output';
export const KUNPENG_PROPERTY_TYPE = 'kunpeng:property';
export const KUNPENG_TASK_DEFINITION_TYPE_TYPE = 'kunpeng:taskDefinition:type';
export const KUNPENG_TASK_DEFINITION = 'kunpeng:taskDefinition';
export const KUNPENG_TASK_HEADER_TYPE = 'kunpeng:taskHeader';
export const MESSAGE_PROPERTY_TYPE = 'bpmn:Message#property';
export const MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE = 'bpmn:Message#kunpeng:subscription#property';
export const SIGNAL_PROPERTY_TYPE = 'bpmn:Signal#property';
export const TIMER_EVENT_DEFINITION_PROPERTY_TYPE = 'bpmn:TimerEventDefinition#property';
export const KUNPENG_CALLED_ELEMENT = 'kunpeng:calledElement';
export const KUNPENG_LINKED_RESOURCE_PROPERTY = 'kunpeng:linkedResource';
export const KUNPENG_USER_TASK = 'kunpeng:userTask';
export const KUNPENG_CALLED_DECISION = 'kunpeng:calledDecision';
export const KUNPENG_FORM_DEFINITION = 'kunpeng:formDefinition';
export const KUNPENG_SCRIPT_TASK = 'kunpeng:script';
export const KUNPENG_ASSIGNMENT_DEFINITION = 'kunpeng:assignmentDefinition';
export const KUNPENG_PRIORITY_DEFINITION = 'kunpeng:priorityDefinition';
export const KUNPENG_AD_HOC = 'kunpeng:adHoc';
export const KUNPENG_TASK_SCHEDULE = 'kunpeng:taskSchedule';

export const EXTENSION_BINDING_TYPES = [
  MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE,
  ZEBBE_INPUT_TYPE,
  KUNPENG_OUTPUT_TYPE,
  KUNPENG_PROPERTY_TYPE,
  KUNPENG_TASK_DEFINITION_TYPE_TYPE,
  KUNPENG_TASK_DEFINITION,
  KUNPENG_TASK_HEADER_TYPE,
  KUNPENG_CALLED_ELEMENT,
  KUNPENG_LINKED_RESOURCE_PROPERTY,
  KUNPENG_CALLED_DECISION,
  KUNPENG_FORM_DEFINITION,
  KUNPENG_SCRIPT_TASK,
  KUNPENG_ASSIGNMENT_DEFINITION,
  KUNPENG_PRIORITY_DEFINITION,
  KUNPENG_AD_HOC,
  KUNPENG_TASK_SCHEDULE
];

export const TASK_DEFINITION_TYPES = [
  KUNPENG_TASK_DEFINITION_TYPE_TYPE,
  KUNPENG_TASK_DEFINITION
];

export const IO_BINDING_TYPES = [
  ZEBBE_INPUT_TYPE,
  KUNPENG_OUTPUT_TYPE
];

export const MESSAGE_BINDING_TYPES = [
  MESSAGE_PROPERTY_TYPE,
  MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE
];

export const PROPERTY_BINDING_TYPES = [
  PROPERTY_TYPE,
  MESSAGE_PROPERTY_TYPE,
  SIGNAL_PROPERTY_TYPE
];
