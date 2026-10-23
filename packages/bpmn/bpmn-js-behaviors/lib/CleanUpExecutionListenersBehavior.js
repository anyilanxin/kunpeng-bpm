var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { getBusinessObject, is, isAny } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { find, without } from "min-dash";
import { getExtensionElementsList } from "./util/ExtensionElementsUtil";
const DISALLOWED_START_LISTENER_TYPES = [
  "bpmn:StartEvent",
  "bpmn:BoundaryEvent"
];
const _CleanUpExecutionListenersBehavior = class _CleanUpExecutionListenersBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);
    this.postExecuted("shape.replace", function(event) {
      const element = event.context.newShape;
      const executionListenersContainer = getExecutionListenersContainer(element);
      if (!executionListenersContainer) {
        return;
      }
      const listeners = executionListenersContainer.get("listeners");
      const newListeners = withoutDisallowedListeners(element, listeners);
      if (newListeners.length !== listeners.length) {
        modeling.updateModdleProperties(element, executionListenersContainer, { listeners: newListeners });
      }
    });
    this.postExecuted("element.updateModdleProperties", function(event) {
      const {
        element,
        moddleElement
      } = event.context;
      if (!is(moddleElement, "kunpeng:ExecutionListeners")) {
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
__name(_CleanUpExecutionListenersBehavior, "CleanUpExecutionListenersBehavior");
let CleanUpExecutionListenersBehavior = _CleanUpExecutionListenersBehavior;
CleanUpExecutionListenersBehavior.$inject = [
  "eventBus",
  "modeling"
];
function withoutDisallowedListeners(element, listeners) {
  listeners = withoutDisallowedStartListeners(element, listeners);
  listeners = withoutDisallowedEndListeners(element, listeners);
  return listeners;
}
__name(withoutDisallowedListeners, "withoutDisallowedListeners");
function withoutDisallowedStartListeners(element, listeners) {
  if (isAny(element, DISALLOWED_START_LISTENER_TYPES)) {
    return listeners.filter((listener) => listener.eventType !== "start");
  }
  return listeners;
}
__name(withoutDisallowedStartListeners, "withoutDisallowedStartListeners");
function withoutDisallowedEndListeners(element, listeners) {
  if (shouldRemoveEndListeners(element)) {
    return listeners.filter((listener) => listener.eventType !== "end");
  }
  return listeners;
}
__name(withoutDisallowedEndListeners, "withoutDisallowedEndListeners");
function shouldRemoveEndListeners(element) {
  if (is(element, "bpmn:BoundaryEvent") && isCompensationEvent(element) || is(element, "bpmn:EndEvent") && isErrorEvent(element) || is(element, "bpmn:Gateway")) {
    return true;
  }
}
__name(shouldRemoveEndListeners, "shouldRemoveEndListeners");
function isCompensationEvent(element) {
  const eventDefinitions = getEventDefinitions(element);
  return find(eventDefinitions, function(definition) {
    return is(definition, "bpmn:CompensateEventDefinition");
  });
}
__name(isCompensationEvent, "isCompensationEvent");
function isErrorEvent(element) {
  const eventDefinitions = getEventDefinitions(element);
  return find(eventDefinitions, function(definition) {
    return is(definition, "bpmn:ErrorEventDefinition");
  });
}
__name(isErrorEvent, "isErrorEvent");
function getEventDefinitions(element) {
  const businessObject = getBusinessObject(element);
  return businessObject.get("eventDefinitions") || [];
}
__name(getEventDefinitions, "getEventDefinitions");
function getExecutionListenersContainer(element) {
  return getExtensionElementsList(element, "kunpeng:ExecutionListeners")[0];
}
__name(getExecutionListenersContainer, "getExecutionListenersContainer");
export {
  CleanUpExecutionListenersBehavior as default
};
//# sourceMappingURL=CleanUpExecutionListenersBehavior.js.map
