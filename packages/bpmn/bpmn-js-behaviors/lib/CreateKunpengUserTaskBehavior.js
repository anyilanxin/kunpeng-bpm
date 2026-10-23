var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { createElement } from "./util/ElementUtil";
import { getExtensionElementsList } from "./util/ExtensionElementsUtil";
const HIGH_PRIORITY = 5e3;
const _CreateKunpengngngUserTaskBehavior = class _CreateKunpengngngUserTaskBehavior extends CommandInterceptor {
  constructor(bpmnFactory, eventBus, modeling) {
    super(eventBus);
    this.postExecuted(
      ["shape.create", "shape.replace"],
      HIGH_PRIORITY,
      function(context) {
        const shape = context.shape || context.newShape;
        const explicitlyDisabled = context.hints && context.hints.createElementsBehavior === false;
        if (!is(shape, "bpmn:UserTask") || explicitlyDisabled) {
          return;
        }
        let userTaskElement = getKunpengngngUserTask(shape);
        if (userTaskElement) {
          return;
        }
        const businessObject = getBusinessObject(shape);
        let extensionElements = businessObject.get("extensionElements");
        if (!extensionElements) {
          extensionElements = createElement(
            "bpmn:ExtensionElements",
            {
              values: []
            },
            businessObject,
            bpmnFactory
          );
          modeling.updateProperties(shape, { extensionElements });
        }
        userTaskElement = createElement(
          "kunpeng:UserTask",
          {},
          extensionElements,
          bpmnFactory
        );
        modeling.updateModdleProperties(shape, extensionElements, {
          values: [...extensionElements.values || [], userTaskElement]
        });
      },
      true
    );
  }
};
__name(_CreateKunpengngngUserTaskBehavior, "CreateKunpengngngUserTaskBehavior");
let CreateKunpengngngUserTaskBehavior = _CreateKunpengngngUserTaskBehavior;
CreateKunpengngngUserTaskBehavior.$inject = ["bpmnFactory", "eventBus", "modeling"];
function getKunpengngngUserTask(element) {
  const businessObject = getBusinessObject(element);
  const userTaskElements = getExtensionElementsList(businessObject, "kunpeng:UserTask");
  return userTaskElements[0] || null;
}
__name(getKunpengngngUserTask, "getKunpengngngUserTask");
export {
  CreateKunpengngngUserTaskBehavior as default
};
//# sourceMappingURL=CreateKunpengUserTaskBehavior.js.map
