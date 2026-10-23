var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { is } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { without } from "min-dash";
import { getExtensionElementsList } from "./util/ExtensionElementsUtil";
const _CleanUpTaskListenersBehavior = class _CleanUpTaskListenersBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);
    this.postExecuted("shape.replace", function(event) {
      const element = event.context.newShape;
      updateListeners(element, modeling);
    });
    this.postExecuted("element.updateModdleProperties", function(event) {
      const element = event.context.element;
      if (!is(element, "bpmn:UserTask")) {
        return;
      }
      updateListeners(element, modeling);
    });
    this.postExecuted("element.updateModdleProperties", function(event) {
      const {
        element,
        moddleElement
      } = event.context;
      if (!is(moddleElement, "kunpeng:TaskListeners")) {
        return;
      }
      const listeners = moddleElement.get("listeners");
      if (listeners.length) {
        return;
      }
      const extensionElements = moddleElement.$parent;
      modeling.updateModdleProperties(element, extensionElements, { values: without(extensionElements.get("values"), moddleElement) });
    });
  }
};
__name(_CleanUpTaskListenersBehavior, "CleanUpTaskListenersBehavior");
let CleanUpTaskListenersBehavior = _CleanUpTaskListenersBehavior;
CleanUpTaskListenersBehavior.$inject = [
  "eventBus",
  "modeling"
];
function updateListeners(element, modeling) {
  const taskListenersContainer = getTaskListenersContainer(element);
  if (!taskListenersContainer) {
    return;
  }
  const listeners = taskListenersContainer.get("listeners");
  const newListeners = withoutDisallowedListeners(element, listeners);
  if (newListeners.length !== listeners.length) {
    modeling.updateModdleProperties(element, taskListenersContainer, { listeners: newListeners });
  }
}
__name(updateListeners, "updateListeners");
function withoutDisallowedListeners(element, listeners) {
  return listeners.filter((listener) => {
    if (!is(element, "bpmn:UserTask") || !hasKunpengTaskExtensionElement(element)) {
      return false;
    }
    return true;
  });
}
__name(withoutDisallowedListeners, "withoutDisallowedListeners");
function getTaskListenersContainer(element) {
  return getExtensionElementsList(element, "kunpeng:TaskListeners")[0];
}
__name(getTaskListenersContainer, "getTaskListenersContainer");
function hasKunpengTaskExtensionElement(element) {
  return getExtensionElementsList(element, "kunpeng:UserTask").length > 0;
}
__name(hasKunpengTaskExtensionElement, "hasKunpengTaskExtensionElement");
export {
  CleanUpTaskListenersBehavior as default
};
//# sourceMappingURL=CleanUpTaskListenersBehavior.js.map
