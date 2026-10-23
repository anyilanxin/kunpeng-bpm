var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';
import { isArray } from "min-dash";
function getExtensionElementsList(element, type = void 0) {
  const businessObject = getBusinessObject(element), extensionElements = businessObject.get("extensionElements");
  if (!extensionElements) {
    return [];
  }
  const values = extensionElements.get("values");
  if (!values || !values.length) {
    return [];
  }
  if (type) {
    return values.filter((value) => is(value, type));
  }
  return values;
}
__name(getExtensionElementsList, "getExtensionElementsList");
function removeExtensionElements(element, businessObject, extensionElementsToRemove, commandStack) {
  if (!isArray(extensionElementsToRemove)) {
    extensionElementsToRemove = [extensionElementsToRemove];
  }
  const extensionElements = businessObject.get("extensionElements"), values = extensionElements.get("values").filter((value) => !extensionElementsToRemove.includes(value));
  commandStack.execute("element.updateModdleProperties", {
    element,
    moddleElement: extensionElements,
    properties: {
      values
    }
  });
}
__name(removeExtensionElements, "removeExtensionElements");
export {
  getExtensionElementsList,
  removeExtensionElements
};
//# sourceMappingURL=ExtensionElementsUtil.js.map
