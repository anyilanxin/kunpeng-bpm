import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { without } from 'min-dash';

import { getExtensionElementsList } from './util/ExtensionElementsUtil.js';

const HIGH_PRIORITY = 5000;


/**
 * Kunpeng BPMN behavior ensuring that bpmn:BusinessRuleTask only has one of the following:
 *
 * (1) kunpeng:CalledDecision
 * (2) kunpeng:TaskDefinition and kunpeng:DynamicAdditions
 * （旧线名 kunpeng:additionDynamics，新 moddle 描述符为 DynamicAdditions）
 */
export default class CleanUpBusinessRuleTaskBehavior extends CommandInterceptor {
  constructor(commandStack, eventBus) {
    super(eventBus);

    /**
     * Remove kunpeng:CalledDecision if kunpeng:TaskDefinition is about to be added.
     */
    this.preExecute('element.updateModdleProperties' , HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement,
        properties
      } = context;

      if (
        !is(element, 'bpmn:BusinessRuleTask')
        || !is(moddleElement, 'bpmn:ExtensionElements')
        || !properties.values
      ) {
        return;
      }

      const calledDecision = getCalledDecision(element),
            taskDefinition = getTaskDefinition(element);

      if (
        calledDecision
        && !taskDefinition
        && properties.values.find(value => is(value, 'kunpeng:CalledDecision'))
        && properties.values.find(value => is(value, 'kunpeng:TaskDefinition'))
      ) {
        properties.values = without(properties.values, calledDecision);
      }
    }, true);

    /**
     * Remove kunpeng:TaskDefinition and kunpeng:DynamicAdditions if kunpeng:CalledDecision is about to be added.
     */
    this.preExecute('element.updateModdleProperties', HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement,
        properties
      } = context;

      if (
        !is(element, 'bpmn:BusinessRuleTask')
        || !is(moddleElement, 'bpmn:ExtensionElements')
        || !properties.values
      ) {
        return;
      }

      const calledDecision = getCalledDecision(element),
            taskDefinition = getTaskDefinition(element),
            additionDynamics = getAdditionDynamics(element);

      if (
        !calledDecision
        && (taskDefinition || additionDynamics)
        && properties.values.find(value => is(value, 'kunpeng:CalledDecision'))
        && properties.values.find(value => is(value, 'kunpeng:TaskDefinition') || is(value, 'kunpeng:DynamicAdditions'))
      ) {
        properties.values = without(properties.values, (value) => value === taskDefinition || value === additionDynamics);
      }
    }, true);

  }
}

CleanUpBusinessRuleTaskBehavior.$inject = [
  'commandStack',
  'eventBus'
];


// helpers //////////

function getCalledDecision(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:CalledDecision')[ 0 ];
}

function getTaskDefinition(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:TaskDefinition')[ 0 ];
}

function getAdditionDynamics(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:DynamicAdditions')[ 0 ];
}
