import {
  isAny
} from '@kunpeng-io/bpmn-js';

import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';
import {
  getCalledElement
} from '../utils/CalledElementUtil.js';

import {
  has
} from 'min-dash';

import {
  getExtensionElementsList
} from '../../../utils/ExtensionElementsUtil';

import {
  createElement
} from '../../../utils/ElementUtil';
import { isKunpengServiceTask } from './KunpengServiceTaskUtil';

import {
  getErrorEventDefinition,
  getEventDefinition
} from '../../bpmn/utils/EventDefinitionUtil';


function getElements(bo, type, prop) {
  const elems = getExtensionElementsList(bo, type);
  return !prop ? elems : (elems[0] || {})[prop] || [];
}

function getParameters(element, prop) {
  const ioMapping = getIoMapping(element);
  return (ioMapping && ioMapping.get(prop)) || [];
}

/**
 * Get a ioMapping from the business object
 *
 * @param {djs.model.Base} element
 *
 * @return {ModdleElement} the ioMapping object
 */
export function getIoMapping(element) {
  const bo = getBusinessObject(element);
  return (getElements(bo, 'kunpeng:IoMapping') || [])[0];
}


/**
 * Return all input parameters existing in the business object, and
 * an empty array if none exist.
 *
 * @param  {djs.model.Base} element
 *
 * @return {Array} a list of input parameter objects
 */
export function getInputParameters(element) {
  return getParameters.apply(this, [ element, 'inputParameters' ]);
}

/**
 * Return all output parameters existing in the business object, and
 * an empty array if none exist.
 *
 * @param  {djs.model.Base} element
 *
 * @return {Array} a list of output parameter objects
 */
export function getOutputParameters(element) {
  return getParameters.apply(this, [ element, 'outputParameters' ]);
}

export function areInputParametersSupported(element) {
  return isAny(element, [
    'bpmn:UserTask',
    'bpmn:SubProcess',
    'bpmn:CallActivity',
    'bpmn:BusinessRuleTask',
    'bpmn:ScriptTask'
  ]) || isKunpengServiceTask(element) || isSignalThrowEvent(element);
}

export function areOutputParametersSupported(element) {

  if (is(element, 'bpmn:EndEvent') && (
    getErrorEventDefinition(element) || getTerminateEventDefinition(element)
  )) {
    return false;
  }

  if (is(element, 'bpmn:CallActivity')) {
    return !isPropagateAllChildVariables(element);
  }

  return isAny(element, [
    'kunpeng:KunpengServiceTask',
    'bpmn:UserTask',
    'bpmn:SubProcess',
    'bpmn:ReceiveTask',
    'bpmn:Event',
    'bpmn:BusinessRuleTask'
  ]);
}

function getTerminateEventDefinition(element) {
  return getEventDefinition(element, 'bpmn:TerminateEventDefinition');
}

export function createIOMapping(properties, parent, bpmnFactory) {
  return createElement('kunpeng:IoMapping', properties, parent, bpmnFactory);
}

function isSignalThrowEvent(element) {
  if (!isAny(element, [
    'bpmn:EndEvent',
    'bpmn:IntermediateThrowEvent'
  ])) {
    return false;
  }

  return !!getEventDefinition(element, 'bpmn:SignalEventDefinition');
}



/**
  * Check whether the propagateAllChildVariables attribute is set on an element.
  * Note that a default logic will be determine if it is not explicitly set.
  * @param {Object} element
  *
  * @returns {boolean}
  */
export function isPropagateAllChildVariables(element) {
  if (!is(element, 'bpmn:CallActivity')) {
    return undefined;
  }

  const bo = getBusinessObject(element),
        calledElement = getCalledElement(bo);

  return calledElement && has(calledElement, 'propagateAllChildVariables') ?
    calledElement.get('propagateAllChildVariables') :
    determinePropAllChildVariablesDefault(element);
}



/**
  * Determine default value for propagateAllChildVariables attribute
  * @param {Object} element representing a bpmn:CallActivity
  *
  * @returns {boolean}
  */
export function determinePropAllChildVariablesDefault(element) {
  const outputParameters = getOutputParameters(element);

  if (outputParameters) {
    return (outputParameters.length > 0) ? false : true;
  }
}
