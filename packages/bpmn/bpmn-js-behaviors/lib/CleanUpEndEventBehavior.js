var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { find, without } from "min-dash";
const _CleanUpEndEventBehavior = class _CleanUpEndEventBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);
    this.postExecuted("shape.replace", function(event) {
      const {
        context
      } = event;
      const {
        newShape
      } = context;
      if (!is(newShape, "bpmn:EndEvent") || !getErrorEventDefinition(newShape)) {
        return;
      }
      const ioMapping = getIoMapping(newShape);
      if (!ioMapping) {
        return;
      }
      const businessObject = getBusinessObject(newShape), extensionElements = businessObject.get("extensionElements"), values = without(extensionElements.get("values"), ioMapping);
      modeling.updateModdleProperties(newShape, extensionElements, { values });
    });
  }
};
__name(_CleanUpEndEventBehavior, "CleanUpEndEventBehavior");
let CleanUpEndEventBehavior = _CleanUpEndEventBehavior;
CleanUpEndEventBehavior.$inject = [
  "eventBus",
  "modeling"
];
function getErrorEventDefinition(element) {
  const businessObject = getBusinessObject(element);
  const eventDefinitions = businessObject.get("eventDefinitions") || [];
  return find(eventDefinitions, function(definition) {
    return is(definition, "bpmn:ErrorEventDefinition");
  });
}
__name(getErrorEventDefinition, "getErrorEventDefinition");
function getIoMapping(element) {
  const bo = getBusinessObject(element);
  const extensionElements = bo.get("extensionElements");
  if (!extensionElements) {
    return null;
  }
  const values = extensionElements.get("values");
  if (!values) {
    return null;
  }
  return find(values, (value) => is(value, "kunpeng:IoMapping"));
}
__name(getIoMapping, "getIoMapping");
export {
  CleanUpEndEventBehavior as default,
  getErrorEventDefinition,
  getIoMapping
};
//# sourceMappingURL=CleanUpEndEventBehavior.js.map
