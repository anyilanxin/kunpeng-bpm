var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { getExtensionElementsList, removeExtensionElements } from "./util/ExtensionElementsUtil";
const _CleanUpSubscriptionBehavior = class _CleanUpSubscriptionBehavior extends CommandInterceptor {
  constructor(eventBus, commandStack) {
    super(eventBus);
    this.postExecuted([
      "element.updateProperties",
      "element.updateModdleProperties"
    ], (context) => {
      const element = context.shape || context.newShape || context.element;
      if (element.labelTarget) {
        return;
      }
      if (!is(element, "bpmn:Event")) {
        return;
      }
      const messageEventDefinition = getMessageEventDefinition(element);
      if (!messageEventDefinition) {
        return;
      }
      const message = messageEventDefinition.get("messageRef");
      if (!message) {
        return;
      }
      const subscription = getSubscription(message);
      if (!subscription) {
        return;
      }
      if (!hasNoProperties(subscription)) {
        return;
      }
      removeExtensionElements(element, message, subscription, commandStack);
    }, true);
  }
};
__name(_CleanUpSubscriptionBehavior, "CleanUpSubscriptionBehavior");
let CleanUpSubscriptionBehavior = _CleanUpSubscriptionBehavior;
CleanUpSubscriptionBehavior.$inject = [
  "eventBus",
  "commandStack"
];
function getMessageEventDefinition(event) {
  const businessObject = getBusinessObject(event);
  return businessObject.get("eventDefinitions").find((eventDefinition) => {
    return is(eventDefinition, "bpmn:MessageEventDefinition");
  });
}
__name(getMessageEventDefinition, "getMessageEventDefinition");
function getSubscription(message) {
  return getExtensionElementsList(message, "kunpeng:Subscription")[0];
}
__name(getSubscription, "getSubscription");
function hasNoProperties(element) {
  const descriptor = element.$descriptor;
  return descriptor.properties.every((property) => {
    return element.get(property.name) === void 0;
  });
}
__name(hasNoProperties, "hasNoProperties");
export {
  CleanUpSubscriptionBehavior as default
};
//# sourceMappingURL=CleanUpSubscriptionBehavior.js.map
