import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import { createElement } from './ElementUtil.js';

/**
 * Get kunpeng:IoMapping from an element.
 *
 * @param {djs.model.Base|ModdleElement} element
 *
 * @return {ModdleElement}
 */
export function getIoMapping(element) {
  const businessObject = getBusinessObject(element);

  const extensionElements = businessObject.get('extensionElements');

  if (!extensionElements) {
    return;
  }

  return extensionElements.get('values').find((value) => {
    return is(value, 'kunpeng:IoMapping');
  });
}

/**
 * Get kunpeng:InputParameters from an element.
 *
 * @param  {djs.model.Base|ModdleElement} element
 *
 * @return {Array<ModdleElement>}
 */
export function getInputParameters(element) {
  const ioMapping = getIoMapping(element);

  if (ioMapping) {
    return ioMapping.get('kunpeng:inputParameters');
  }

  return [];
}

/**
 * Get kunpeng:OutputParameters from an element.
 *
 * @param  {djs.model.Base|ModdleElement} element
 *
 * @return {Array<ModdleElement>}
 */
export function getOutputParameters(element) {
  const ioMapping = getIoMapping(element);

  if (ioMapping) {
    return ioMapping.get('kunpeng:outputParameters');
  }

  return [];
}

/**
 * Get kunpeng:Input at index.
 *
 * @param {djs.model.Base|ModdleElement} element
 * @param {number} index
 *
 * @return {ModdleElement}
 */
export function getInputParameter(element, index) {
  return getInputParameters(element)[ index ];
}

/**
 * Get kunpeng:Output at index.
 *
 * @param {djs.model.Base|ModdleElement} element
 * @param {number} index
 *
 * @return {ModdleElement}
 */
export function getOutputParameter(element, index) {
  return getOutputParameters(element)[ index ];
}

export function createIoMapping(parent, bpmnFactory, properties) {
  return createElement('kunpeng:IoMapping', properties, parent, bpmnFactory);
}
