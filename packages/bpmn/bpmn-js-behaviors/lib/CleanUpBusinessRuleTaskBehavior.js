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
const _CleanUpBusinessRuleTaskBehavior = class _CleanUpBusinessRuleTaskBehavior extends CommandInterceptor {
  constructor(commandStack, eventBus) {
    super(eventBus);
    this.preExecute("element.updateModdleProperties", HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement,
        properties
      } = context;
      if (!is(element, "bpmn:BusinessRuleTask") || !is(moddleElement, "bpmn:ExtensionElements") || !properties.values) {
        return;
      }
      const calledDecision = getCalledDecision(element), taskDefinition = getTaskDefinition(element);
      if (calledDecision && !taskDefinition && properties.values.find((value) => is(value, "kunpeng:CalledDecision")) && properties.values.find((value) => is(value, "kunpeng:TaskDefinition"))) {
        properties.values = without(properties.values, calledDecision);
      }
    }, true);
    this.preExecute("element.updateModdleProperties", HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement,
        properties
      } = context;
      if (!is(element, "bpmn:BusinessRuleTask") || !is(moddleElement, "bpmn:ExtensionElements") || !properties.values) {
        return;
      }
      const calledDecision = getCalledDecision(element), taskDefinition = getTaskDefinition(element), additionDynamics = getAdditionDynamics(element);
      if (!calledDecision && (taskDefinition || additionDynamics) && properties.values.find((value) => is(value, "kunpeng:CalledDecision")) && properties.values.find((value) => is(value, "kunpeng:TaskDefinition") || is(value, "kunpeng:additionDynamics"))) {
        properties.values = without(properties.values, (value) => value === taskDefinition || value === additionDynamics);
      }
    }, true);
  }
};
__name(_CleanUpBusinessRuleTaskBehavior, "CleanUpBusinessRuleTaskBehavior");
let CleanUpBusinessRuleTaskBehavior = _CleanUpBusinessRuleTaskBehavior;
CleanUpBusinessRuleTaskBehavior.$inject = [
  "commandStack",
  "eventBus"
];
function getCalledDecision(element) {
  const businessObject = getBusinessObject(element);
  return getExtensionElementsList(businessObject, "kunpeng:CalledDecision")[0];
}
__name(getCalledDecision, "getCalledDecision");
function getTaskDefinition(element) {
  const businessObject = getBusinessObject(element);
  return getExtensionElementsList(businessObject, "kunpeng:TaskDefinition")[0];
}
__name(getTaskDefinition, "getTaskDefinition");
function getAdditionDynamics(element) {
  const businessObject = getBusinessObject(element);
  return getExtensionElementsList(businessObject, "kunpeng:additionDynamics")[0];
}
__name(getAdditionDynamics, "getAdditionDynamics");
export {
  CleanUpBusinessRuleTaskBehavior as default
};
//# sourceMappingURL=CleanUpBusinessRuleTaskBehavior.js.map
