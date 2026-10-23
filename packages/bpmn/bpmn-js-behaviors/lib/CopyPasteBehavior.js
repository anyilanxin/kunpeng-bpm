var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  isObject,
  some
} from "min-dash";
import { is } from '@kunpeng-io/bpmn-js';
import {
  TIMER_PROPERTIES
} from "./util/TimerUtil";
const WILDCARD = "*";
const zeebeServiceTaskProperties = [
  "kunpeng:Input",
  "kunpeng:LoopCharacteristics",
  "kunpeng:TaskDefinition",
  "kunpeng:additionDynamics",
  "kunpeng:Subscription"
];
const _KunpengModdleExtension = class _KunpengModdleExtension {
  constructor(eventBus) {
    eventBus.on("moddleCopy.canCopyProperty", (context) => {
      const {
        parent,
        property,
        propertyName
      } = context;
      return this.canCopyProperty(property, parent, propertyName);
    });
  }
  canCopyProperty(property, parent, propertyName) {
    if (isObject(property) && !isAllowedInParent(property, parent)) {
      return false;
    }
    if (!this.canHostServiceTaskLikeProperties(property, parent)) {
      return false;
    }
    if (!this.canHostTimerExpression(parent, propertyName)) {
      return false;
    }
  }
  canHostServiceTaskLikeProperties(property, parent) {
    if (isAllowedInKunpengServiceTask(property)) {
      const serviceTaskLike = getParent(parent, "bpmn:IntermediateThrowEvent") || getParent(parent, "bpmn:EndEvent");
      if (serviceTaskLike) {
        return isMessageEvent(serviceTaskLike);
      }
    }
    return true;
  }
  canHostTimerExpression(parent, propertyName) {
    if (!TIMER_PROPERTIES.includes(propertyName)) {
      return true;
    }
    return is(parent, "bpmn:TimerEventDefinition");
  }
};
__name(_KunpengModdleExtension, "KunpengModdleExtension");
let KunpengModdleExtension = _KunpengModdleExtension;
KunpengModdleExtension.$inject = ["eventBus"];
function getParent(element, type) {
  if (!type) {
    return element.$parent;
  }
  if (is(element, type)) {
    return element;
  }
  if (!element.$parent) {
    return;
  }
  return getParent(element.$parent, type);
}
__name(getParent, "getParent");
function isAllowedInParent(property, parent) {
  const descriptor = property.$type && property.$model.getTypeDescriptor(property.$type);
  const allowedIn = descriptor && descriptor.meta && descriptor.meta.allowedIn;
  if (!allowedIn || isWildcard(allowedIn)) {
    return true;
  }
  return some(allowedIn, function(type) {
    return getParent(parent, type);
  });
}
__name(isAllowedInParent, "isAllowedInParent");
function isWildcard(allowedIn) {
  return allowedIn.indexOf(WILDCARD) !== -1;
}
__name(isWildcard, "isWildcard");
function isMessageEvent(event) {
  const eventDefinitions = event.get("eventDefinitions");
  return eventDefinitions.some((eventDefinition) => {
    return is(eventDefinition, "bpmn:MessageEventDefinition");
  });
}
__name(isMessageEvent, "isMessageEvent");
function isAllowedInKunpengServiceTask(property) {
  return zeebeServiceTaskProperties.some((propertyType) => {
    return is(property, propertyType);
  });
}
__name(isAllowedInKunpengServiceTask, "isAllowedInKunpengServiceTask");
export {
  KunpengModdleExtension as default
};
//# sourceMappingURL=CopyPasteBehavior.js.map
