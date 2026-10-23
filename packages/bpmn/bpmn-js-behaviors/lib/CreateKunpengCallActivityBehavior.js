var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { has } from "min-dash";
import { createElement } from "./util/ElementUtil";
import { getCalledElement } from "./util/CalledElementUtil";
import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
const HIGH_PRIORITY = 5e3;
const _CreateKunpengCallActivityBehavior = class _CreateKunpengCallActivityBehavior extends CommandInterceptor {
  constructor(bpmnFactory, eventBus, modeling) {
    super(eventBus);
    this.postExecuted("shape.create", HIGH_PRIORITY, function(context) {
      const { shape } = context;
      if (!is(shape, "bpmn:CallActivity")) {
        return;
      }
      const businessObject = getBusinessObject(shape);
      let calledElement = getCalledElement(businessObject);
      if (!calledElement) {
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
        calledElement = createElement(
          "kunpeng:CalledElement",
          {
            propagateAllChildVariables: false
          },
          extensionElements,
          bpmnFactory
        );
        modeling.updateModdleProperties(shape, extensionElements, {
          values: [
            ...extensionElements.values || [],
            calledElement
          ]
        });
      } else if (!has(calledElement, "propagateAllChildVariables")) {
        modeling.updateModdleProperties(shape, calledElement, {
          propagateAllChildVariables: false
        });
      }
    }, true);
  }
};
__name(_CreateKunpengCallActivityBehavior, "CreateKunpengCallActivityBehavior");
let CreateKunpengCallActivityBehavior = _CreateKunpengCallActivityBehavior;
CreateKunpengCallActivityBehavior.$inject = [
  "bpmnFactory",
  "eventBus",
  "modeling"
];
export {
  CreateKunpengCallActivityBehavior as default
};
//# sourceMappingURL=CreateKunpengCallActivityBehavior.js.map
