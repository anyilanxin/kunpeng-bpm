import {
  getBusinessObject,
  isAny,
  is
} from '@kunpeng-io/bpmn-js';

import {
  getExtensionElementsList
} from '../../../utils/ExtensionElementsUtil';

// import { isKunpengServiceTask } from './KunpengServiceTaskUtil';

export function areAdditionsSupported(businessObject, moddle) {
  const dynamicAdditionsDescriptor = moddle.getTypeDescriptor('kunpeng:DynamicAdditions');

  return isAny(businessObject, dynamicAdditionsDescriptor.meta.allowedIn);
}


/**
 * Get first kunpeng:additionDynamics element for a specific element.
 *
 * @param  {ModdleElement} element
 *
 * @return {ModdleElement} a kunpeng:dynamicAdditions element
 */
export function getDynamicAdditions(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:DynamicAdditions')[0];
}

/**
 * Retrieve all kunpeng:Header elements for a specific element.
 *
 * @param  {ModdleElement} element
 *
 * @return {Array<ModdleElement>} a list of kunpeng:Header elements
 */
export function getAdditions(element) {
  const dynamics = getDynamicAdditions(element);

  return dynamics ? dynamics.get('values') : [];
}


export function getRelevantBusinessObject(element) {
  let businessObject = getBusinessObject(element);

  if (is(element, 'bpmn:Participant')) {
    return businessObject.get('processRef');
  }

  return businessObject;
}