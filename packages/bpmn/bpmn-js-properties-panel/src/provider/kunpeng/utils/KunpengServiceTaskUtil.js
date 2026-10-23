import {
  is,
  isAny
} from '@kunpeng-io/bpmn-js';

import {
  getMessageEventDefinition
} from '../../bpmn/utils/EventDefinitionUtil';

import {
  getBusinessObject
} from '@kunpeng-io/bpmn-js';

import {
  getExtensionElementsList
} from '../../../utils/ExtensionElementsUtil';

const OPTIONAL_JOB_WORKER_ELEMENTS = [
  'bpmn:AdHocSubProcess',
  'bpmn:BusinessRuleTask',
  'bpmn:ScriptTask',
  'bpmn:IntermediateThrowEvent'
];

export function isKunpengServiceTask(element) {
  if (!is(element, 'kunpeng:KunpengServiceTask')) return false;
  if (is(element, 'bpmn:EndEvent') || (is(element, 'bpmn:IntermediateThrowEvent') && !isMessageThrowEvent(element))) {
    return !!getMessageEventDefinition(element);
  }

  // Elements which may optionally be implemented as job workers
  if (isAny(element, OPTIONAL_JOB_WORKER_ELEMENTS) && !getTaskDefinition(element)) {
    return false;
  }
  console.log('-----isKunpengServiceTask--finall---');
  return true;
}

export function isMessageEndEvent(element) {
  return is(element, 'bpmn:EndEvent') && !!getMessageEventDefinition(element);
}

export function isMessageThrowEvent(element) {
  return is(element, 'bpmn:IntermediateThrowEvent') && !!getMessageEventDefinition(element);
}

// helper ////////////////

function getTaskDefinition(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:TaskDefinition')[0];
}
