var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
const _CleanUpMessageRefBehavior = class _CleanUpMessageRefBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus, modeling);
    this.postExecuted("shape.replace", function(event) {
      const newShape = event.context.newShape;
      if (!is(newShape, "bpmn:ThrowEvent")) {
        return;
      }
      const messageEventDefinition = getMessageEventDefinition(newShape);
      if (!messageEventDefinition) {
        return;
      }
      const messageRef = messageEventDefinition.get("messageRef");
      if (!messageRef) {
        return;
      }
      modeling.updateModdleProperties(newShape, messageEventDefinition, {
        messageRef: void 0
      });
    });
    this.postExecuted("shape.replace", function(event) {
      const newShape = event.context.newShape, bo = getBusinessObject(newShape);
      if (!is(bo, "bpmn:SendTask")) {
        return;
      }
      const messageRef = bo.get("messageRef");
      if (!messageRef) {
        return;
      }
      modeling.updateProperties(newShape, {
        messageRef: void 0
      });
    });
  }
};
__name(_CleanUpMessageRefBehavior, "CleanUpMessageRefBehavior");
let CleanUpMessageRefBehavior = _CleanUpMessageRefBehavior;
CleanUpMessageRefBehavior.$inject = ["eventBus", "modeling"];
function getMessageEventDefinition(element) {
  const businessObject = getBusinessObject(element);
  const eventDefinitions = businessObject.get("eventDefinitions") || [];
  return eventDefinitions.find((definition) => {
    return is(definition, "bpmn:MessageEventDefinition");
  });
}
__name(getMessageEventDefinition, "getMessageEventDefinition");
export {
  CleanUpMessageRefBehavior as default
};
//# sourceMappingURL=CleanUpMessageRefBehavior.js.map
