var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { without } from "min-dash";
import { getExtensionElementsList } from "./util/ExtensionElementsUtil";
const HIGH_PRIORITY = 5e3;
const _CleanUpAdHocSubProcessBehavior = class _CleanUpAdHocSubProcessBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);
    this.postExecute("element.updateModdleProperties", HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement
      } = context;
      const businessObject = getBusinessObject(element);
      if (!is(businessObject, "bpmn:AdHocSubProcess") || !is(moddleElement, "bpmn:ExtensionElements") || !getTaskDefinition(element)) {
        return;
      }
      modeling.updateModdleProperties(element, businessObject, {
        cancelRemainingInstances: void 0,
        completionCondition: void 0
      });
      const adHoc = getAdHoc(element);
      if (adHoc) {
        modeling.updateModdleProperties(element, adHoc, {
          activeElementsCollection: void 0
        });
      }
    }, true);
    this.postExecute("element.updateModdleProperties", HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement
      } = context;
      if (!is(element, "bpmn:AdHocSubProcess") || !is(moddleElement, "bpmn:ExtensionElements") || getTaskDefinition(element)) {
        return;
      }
      const additionDynamics = getAdditionDynamics(element);
      if (additionDynamics) {
        modeling.updateModdleProperties(element, moddleElement, {
          values: without(moddleElement.get("values"), additionDynamics)
        });
      }
    }, true);
  }
};
__name(_CleanUpAdHocSubProcessBehavior, "CleanUpAdHocSubProcessBehavior");
let CleanUpAdHocSubProcessBehavior = _CleanUpAdHocSubProcessBehavior;
CleanUpAdHocSubProcessBehavior.$inject = [
  "eventBus",
  "modeling"
];
function getAdHoc(element) {
  const businessObject = getBusinessObject(element);
  return getExtensionElementsList(businessObject, "kunpeng:AdHoc")[0];
}
__name(getAdHoc, "getAdHoc");
function getAdditionDynamics(element) {
  const businessObject = getBusinessObject(element);
  return getExtensionElementsList(businessObject, "kunpeng:additionDynamics")[0];
}
__name(getAdditionDynamics, "getAdditionDynamics");
function getTaskDefinition(element) {
  const businessObject = getBusinessObject(element);
  return getExtensionElementsList(businessObject, "kunpeng:TaskDefinition")[0];
}
__name(getTaskDefinition, "getTaskDefinition");
export {
  CleanUpAdHocSubProcessBehavior as default
};
//# sourceMappingURL=CleanUpAdHocSubProcessBehavior.js.map
