var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  getBusinessObject,
  is,
  isAny
} from '@kunpeng-io/bpmn-js';
const TIMER_PROPERTIES = [
  "timeCycle",
  "timeDate",
  "timeDuration"
];
function getTimerEventDefinition(element) {
  const businessObject = getBusinessObject(element);
  return businessObject.get("eventDefinitions").find((eventDefinition) => {
    return is(eventDefinition, "bpmn:TimerEventDefinition");
  });
}
__name(getTimerEventDefinition, "getTimerEventDefinition");
function isTimerExpressionTypeSupported(type, element) {
  const businessObject = getBusinessObject(element);
  switch (type) {
    case "timeDate":
      return isAny(element, [
        "bpmn:BoundaryEvent",
        "bpmn:IntermediateCatchEvent",
        "bpmn:StartEvent"
      ]);
    case "timeCycle":
      if (is(element, "bpmn:StartEvent") && !hasParentEventSubProcess(businessObject) || !isInterrupting(businessObject)) {
        return true;
      }
      if (is(element, "bpmn:BoundaryEvent") && !isInterrupting(businessObject)) {
        return true;
      }
      return false;
    case "timeDuration":
      if (isAny(element, [
        "bpmn:BoundaryEvent",
        "bpmn:IntermediateCatchEvent"
      ])) {
        return true;
      }
      if (is(element, "bpmn:StartEvent") && hasParentEventSubProcess(businessObject)) {
        return true;
      }
      if (is(element, "bpmn:StartEvent") && hasNotSubProcess(businessObject)) {
        return true;
      }
      return false;
    default:
      return false;
  }
}
__name(isTimerExpressionTypeSupported, "isTimerExpressionTypeSupported");
function isInterrupting(businessObject) {
  if (is(businessObject, "bpmn:BoundaryEvent")) {
    return businessObject.get("cancelActivity") !== false;
  }
  return businessObject.get("isInterrupting") !== false;
}
__name(isInterrupting, "isInterrupting");
function hasParentEventSubProcess(businessObject) {
  const parent = businessObject.$parent;
  return parent && is(parent, "bpmn:SubProcess") && parent.get("triggeredByEvent");
}
__name(hasParentEventSubProcess, "hasParentEventSubProcess");
function hasNotSubProcess(businessObject) {
  const parent = businessObject.$parent;
  return !parent || is(parent, "bpmn:Process");
}
__name(hasNotSubProcess, "hasNotSubProcess");
export {
  TIMER_PROPERTIES,
  getTimerEventDefinition,
  isTimerExpressionTypeSupported
};
//# sourceMappingURL=TimerUtil.js.map
