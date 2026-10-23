var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { is } from '@kunpeng-io/bpmn-js';
import {
  getOutputParameters,
  getIoMapping
} from "./util/InputOutputUtil";
const HIGH_PRIORITY = 5e3;
const _CallActivityVariablesPropagationBehavior = class _CallActivityVariablesPropagationBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);
    this.postExecute("element.updateModdleProperties", HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement,
        properties = {}
      } = context;
      const propagateAllChildVariables = properties.propagateAllChildVariables || properties["kunpeng:propagateAllChildVariables"];
      if (!is(element, "bpmn:CallActivity") || !is(moddleElement, "kunpeng:CalledElement") || !propagateAllChildVariables) {
        return;
      }
      const outputParameters = getOutputParameters(element);
      if (!outputParameters || !outputParameters.length) {
        return;
      }
      const ioMapping = getIoMapping(element);
      modeling.updateModdleProperties(element, ioMapping, {
        "kunpeng:outputParameters": []
      });
    }, true);
  }
};
__name(_CallActivityVariablesPropagationBehavior, "CallActivityVariablesPropagationBehavior");
let CallActivityVariablesPropagationBehavior = _CallActivityVariablesPropagationBehavior;
CallActivityVariablesPropagationBehavior.$inject = [
  "eventBus",
  "modeling"
];
export {
  CallActivityVariablesPropagationBehavior as default
};
//# sourceMappingURL=CallActivityVariablesPropagationBehavior.js.map
