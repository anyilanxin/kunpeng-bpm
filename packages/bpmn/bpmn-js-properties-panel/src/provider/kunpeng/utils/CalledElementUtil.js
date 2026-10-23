import {
  getBusinessObject
} from '@kunpeng-io/bpmn-js';

import {
  getExtensionElementsList
} from '../../../utils/ExtensionElementsUtil';


export function getPropagateAllChildVariables(element) {
  const calledElement = getCalledElement(element);

  return calledElement ? calledElement.get('propagateAllChildVariables') : undefined;
}

export function getPropagateAllParentVariables(element) {
  const calledElement = getCalledElement(element);

  return calledElement ? calledElement.get('propagateAllParentVariables') : undefined;
}

export function getProcessId(element) {
  const calledElement = getCalledElement(element);

  return calledElement ? calledElement.get('processId') : '';
}

export function getBindingType(element) {
  const calledElement = getCalledElement(element);

  return calledElement ? calledElement.get('bindingType') : '';
}

export function getCalledElement(element) {
  const calledElements = getCalledElements(element);
  return calledElements[0];
}

function getCalledElements(element) {
  const bo = getBusinessObject(element);
  const extElements = getExtensionElementsList(bo, 'kunpeng:CalledElement');
  return extElements;
}
