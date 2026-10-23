var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';
import { createElement } from "./ElementUtil";
function getIoMapping(element) {
  const businessObject = getBusinessObject(element);
  const extensionElements = businessObject.get("extensionElements");
  if (!extensionElements) {
    return;
  }
  return extensionElements.get("values").find((value) => {
    return is(value, "kunpeng:IoMapping");
  });
}
__name(getIoMapping, "getIoMapping");
function getInputParameters(element) {
  const ioMapping = getIoMapping(element);
  if (ioMapping) {
    return ioMapping.get("kunpeng:inputParameters");
  }
  return [];
}
__name(getInputParameters, "getInputParameters");
function getOutputParameters(element) {
  const ioMapping = getIoMapping(element);
  if (ioMapping) {
    return ioMapping.get("kunpeng:outputParameters");
  }
  return [];
}
__name(getOutputParameters, "getOutputParameters");
function getInputParameter(element, index) {
  return getInputParameters(element)[index];
}
__name(getInputParameter, "getInputParameter");
function getOutputParameter(element, index) {
  return getOutputParameters(element)[index];
}
__name(getOutputParameter, "getOutputParameter");
function createIoMapping(parent, bpmnFactory, properties) {
  return createElement("kunpeng:IoMapping", properties, parent, bpmnFactory);
}
__name(createIoMapping, "createIoMapping");
export {
  createIoMapping,
  getInputParameter,
  getInputParameters,
  getIoMapping,
  getOutputParameter,
  getOutputParameters
};
//# sourceMappingURL=InputOutputUtil.js.map
