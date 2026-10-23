var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { isDefined } from "min-dash";
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import {
  getBusinessObject,
  is,
  isAny
} from '@kunpeng-io/bpmn-js';
import { removeExtensionElements } from "./util/ExtensionElementsUtil";
const _VersionTagBehavior = class _VersionTagBehavior extends CommandInterceptor {
  constructor(eventBus, commandStack) {
    super(eventBus);
    this.preExecute("element.updateModdleProperties", function(context) {
      const {
        moddleElement,
        properties
      } = context;
      if (!isAny(moddleElement, [
        "kunpeng:CalledDecision",
        "kunpeng:CalledElement",
        "kunpeng:FormDefinition"
      ])) {
        return;
      }
      if ("bindingType" in properties && properties.bindingType !== "versionTag" && isDefined(moddleElement.get("versionTag"))) {
        properties.versionTag = void 0;
      }
      if (isDefined(properties.versionTag) && moddleElement.get("bindingType") !== "versionTag") {
        properties.bindingType = "versionTag";
      }
    }, true);
    this.postExecuted("element.updateModdleProperties", function(context) {
      const {
        element,
        moddleElement
      } = context;
      if (!is(moddleElement, "kunpeng:VersionTag")) {
        return;
      }
      let businessObject = getBusinessObject(element);
      if (is(element, "bpmn:Participant")) {
        businessObject = businessObject.get("processRef");
      }
      if (isEmpty(moddleElement.get("value"))) {
        removeExtensionElements(element, businessObject, moddleElement, commandStack);
      }
    }, true);
  }
};
__name(_VersionTagBehavior, "VersionTagBehavior");
let VersionTagBehavior = _VersionTagBehavior;
VersionTagBehavior.$inject = [
  "eventBus",
  "commandStack"
];
function isEmpty(value) {
  return value == void 0 || value === "";
}
__name(isEmpty, "isEmpty");
export {
  VersionTagBehavior as default
};
//# sourceMappingURL=VersionTagBehavior.js.map
