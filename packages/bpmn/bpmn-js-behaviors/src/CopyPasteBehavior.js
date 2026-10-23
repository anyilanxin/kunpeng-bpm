import {
  isObject,
  some
} from 'min-dash';

import { is } from '@kunpeng-io/bpmn-js';

import {
  TIMER_PROPERTIES
} from './util/TimerUtil';

const WILDCARD = '*';

const zeebeServiceTaskProperties = [
  'kunpeng:Input',
  'kunpeng:LoopCharacteristics',
  'kunpeng:TaskDefinition',
  'kunpeng:additionDynamics',
  'kunpeng:Subscription'
];

export default class KunpengModdleExtension {
  constructor(eventBus) {
    eventBus.on('moddleCopy.canCopyProperty', (context) => {
      const {
        parent,
        property,
        propertyName
      } = context;

      return this.canCopyProperty(property, parent, propertyName);
    });
  }

  canCopyProperty(property, parent, propertyName) {

    // (1) check if property is allowed in parent
    if (isObject(property) && !isAllowedInParent(property, parent)) {
      return false;
    }

    // (2) check for specific scenarios
    if (!this.canHostServiceTaskLikeProperties(property, parent)) {
      return false;
    }

    if (!this.canHostTimerExpression(parent, propertyName)) {
      return false;
    }
  }

  canHostServiceTaskLikeProperties(property, parent) {
    if (isAllowedInKunpengServiceTask(property)) {
      const serviceTaskLike = getParent(parent, 'bpmn:IntermediateThrowEvent') || getParent(parent, 'bpmn:EndEvent');

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

    return is(parent, 'bpmn:TimerEventDefinition');
  }
}

KunpengModdleExtension.$inject = [ 'eventBus' ];


// helpers //////////

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

function isAllowedInParent(property, parent) {

  // (1) find property descriptor
  const descriptor = property.$type && property.$model.getTypeDescriptor(property.$type);

  const allowedIn = descriptor && descriptor.meta && descriptor.meta.allowedIn;

  if (!allowedIn || isWildcard(allowedIn)) {
    return true;
  }

  // (2) check if property has parent of allowed type
  return some(allowedIn, function(type) {
    return getParent(parent, type);
  });
}

function isWildcard(allowedIn) {
  return allowedIn.indexOf(WILDCARD) !== -1;
}

function isMessageEvent(event) {
  const eventDefinitions = event.get('eventDefinitions');

  return eventDefinitions.some((eventDefinition) => {
    return is(eventDefinition, 'bpmn:MessageEventDefinition');
  });
}

// check if property is allowed in kunpeng:KunpengServiceTask but not for none events
function isAllowedInKunpengServiceTask(property) {
  return zeebeServiceTaskProperties.some((propertyType) => {
    return is(property, propertyType);
  });
}
