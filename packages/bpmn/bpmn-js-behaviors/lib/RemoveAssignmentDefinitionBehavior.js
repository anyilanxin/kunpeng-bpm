var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { is } from '@kunpeng-io/bpmn-js';
import { getBusinessObject } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { isUndefined } from "min-dash";
import { removeExtensionElements } from "./util/ExtensionElementsUtil";
const HIGH_PRIORITY = 5e3;
const _RemoveAssignmentDefinitionBehavior = class _RemoveAssignmentDefinitionBehavior extends CommandInterceptor {
  constructor(commandStack, eventBus) {
    super(eventBus);
    this.postExecuted("element.updateModdleProperties", HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement
      } = context;
      if (!is(moddleElement, "kunpeng:AssignmentDefinition")) {
        return;
      }
      const assignmentDefinition = moddleElement;
      if (is(element, "bpmn:UserTask") && isUndefined(assignmentDefinition.get("kunpeng:assignee")) && isUndefined(assignmentDefinition.get("kunpeng:candidateGroups")) && isUndefined(assignmentDefinition.get("kunpeng:candidateUsers"))) {
        const businessObject = getBusinessObject(element);
        removeExtensionElements(element, businessObject, assignmentDefinition, commandStack);
      }
    }, true);
  }
};
__name(_RemoveAssignmentDefinitionBehavior, "RemoveAssignmentDefinitionBehavior");
let RemoveAssignmentDefinitionBehavior = _RemoveAssignmentDefinitionBehavior;
RemoveAssignmentDefinitionBehavior.$inject = [
  "commandStack",
  "eventBus"
];
export {
  RemoveAssignmentDefinitionBehavior as default
};
//# sourceMappingURL=RemoveAssignmentDefinitionBehavior.js.map
