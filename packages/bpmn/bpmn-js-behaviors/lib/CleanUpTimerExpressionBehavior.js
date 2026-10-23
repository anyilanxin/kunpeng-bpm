var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  is
} from '@kunpeng-io/bpmn-js';
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import {
  getTimerEventDefinition,
  isTimerExpressionTypeSupported,
  TIMER_PROPERTIES
} from "./util/TimerUtil";
const _CleanUpTimerExpressionBehavior = class _CleanUpTimerExpressionBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);
    this._modeling = modeling;
    this.postExecuted([
      "shape.move",
      "shape.replace",
      "shape.create",
      "element.updateProperties",
      "element.updateModdleProperties"
    ], (context) => {
      const element = context.shape || context.newShape || context.element;
      this.cleanUpTimerProperties(element);
    }, true);
  }
  /**
  * Remove unsupported timer properties.
  */
  cleanUpTimerProperties(element) {
    if (!is(element, "bpmn:Event")) {
      return;
    }
    const timerEventDefinition = getTimerEventDefinition(element);
    if (!timerEventDefinition) {
      return;
    }
    const propertiesUpdate = TIMER_PROPERTIES.reduce((acc, type) => {
      if (timerEventDefinition.get(type) && !isTimerExpressionTypeSupported(type, element)) {
        acc[type] = void 0;
      }
      return acc;
    }, {});
    if (Object.keys(propertiesUpdate).length) {
      this._modeling.updateModdleProperties(element, timerEventDefinition, propertiesUpdate);
    }
  }
};
__name(_CleanUpTimerExpressionBehavior, "CleanUpTimerExpressionBehavior");
let CleanUpTimerExpressionBehavior = _CleanUpTimerExpressionBehavior;
CleanUpTimerExpressionBehavior.$inject = [
  "eventBus",
  "modeling"
];
export {
  CleanUpTimerExpressionBehavior as default
};
//# sourceMappingURL=CleanUpTimerExpressionBehavior.js.map
