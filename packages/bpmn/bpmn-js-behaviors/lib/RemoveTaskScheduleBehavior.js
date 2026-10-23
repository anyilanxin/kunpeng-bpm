var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { is } from '@kunpeng-io/bpmn-js';
import { getBusinessObject } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { isUndefined } from "min-dash";
import { removeExtensionElements } from "./util/ExtensionElementsUtil";
const HIGH_PRIORITY = 5e3;
const _RemoveTaskScheduleBehavior = class _RemoveTaskScheduleBehavior extends CommandInterceptor {
  constructor(commandStack, eventBus) {
    super(eventBus);
    this.postExecuted("element.updateModdleProperties", HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement
      } = context;
      if (!is(moddleElement, "kunpeng:TaskSchedule")) {
        return;
      }
      const taskSchedule = moddleElement;
      if (is(element, "bpmn:UserTask") && isUndefined(taskSchedule.get("kunpeng:dueDate")) && isUndefined(taskSchedule.get("kunpeng:followUpDate"))) {
        const businessObject = getBusinessObject(element);
        removeExtensionElements(element, businessObject, taskSchedule, commandStack);
      }
    }, true);
  }
};
__name(_RemoveTaskScheduleBehavior, "RemoveTaskScheduleBehavior");
let RemoveTaskScheduleBehavior = _RemoveTaskScheduleBehavior;
RemoveTaskScheduleBehavior.$inject = [
  "commandStack",
  "eventBus"
];
export {
  RemoveTaskScheduleBehavior as default
};
//# sourceMappingURL=RemoveTaskScheduleBehavior.js.map
