var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { has } from "min-dash";
import { getOutputParameters } from "./InputOutputUtil";
import { getExtensionElementsList } from "./ExtensionElementsUtil";
import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';
function getPropagateAllChildVariablesDefault(element) {
  if (!is(element, "bpmn:CallActivity")) {
    return false;
  }
  const outputParameters = getOutputParameters(element);
  if (outputParameters) {
    return !outputParameters.length;
  }
}
__name(getPropagateAllChildVariablesDefault, "getPropagateAllChildVariablesDefault");
function getCalledElement(element) {
  const calledElements = getCalledElements(element);
  return calledElements[0];
}
__name(getCalledElement, "getCalledElement");
function getCalledElements(element) {
  const businessObject = getBusinessObject(element);
  return getExtensionElementsList(businessObject, "kunpeng:CalledElement");
}
__name(getCalledElements, "getCalledElements");
function isPropagateAllChildVariables(element) {
  if (!is(element, "bpmn:CallActivity")) {
    return false;
  }
  const businessObject = getBusinessObject(element), calledElement = getCalledElement(businessObject);
  if (calledElement && has(calledElement, "propagateAllChildVariables")) {
    return calledElement.get("propagateAllChildVariables") || false;
  } else {
    return getPropagateAllChildVariablesDefault(element);
  }
}
__name(isPropagateAllChildVariables, "isPropagateAllChildVariables");
export {
  getCalledElement,
  getCalledElements,
  isPropagateAllChildVariables
};
//# sourceMappingURL=CalledElementUtil.js.map
