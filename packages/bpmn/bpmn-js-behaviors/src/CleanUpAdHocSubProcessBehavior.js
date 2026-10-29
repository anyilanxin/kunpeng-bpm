import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { without } from 'min-dash';

import { getExtensionElementsList } from './util/ExtensionElementsUtil.js';

const HIGH_PRIORITY = 5000;

/**
 * Kunpeng BPMN behavior ensuring that bpmn:AdHocSubProcess is cleaned up
 * when kunpeng:TaskDefinition is added or removed.
 */
export default class CleanUpAdHocSubProcessBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);

    /**
     * Remove kunpeng:AdHoc properties (kunpeng:activeElementsCollection, kunpeng:completionCondition)
     * and remove bpmn:cancelRemainingInstances when kunpeng:TaskDefinition is added.
     */
    this.postExecute('element.updateModdleProperties', HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement
      } = context;

      const businessObject = getBusinessObject(element);

      if (
        !is(businessObject, 'bpmn:AdHocSubProcess')
        || !is(moddleElement, 'bpmn:ExtensionElements')
        || !getTaskDefinition(element)
      ) {
        return;
      }

      modeling.updateModdleProperties(element, businessObject, {
        cancelRemainingInstances: undefined,
        completionCondition: undefined
      });

      const adHoc = getAdHoc(element);

      if (adHoc) {
        modeling.updateModdleProperties(element, adHoc, {
          activeElementsCollection: undefined,
        });
      }
    }, true);

    /**
     * Remove kunpeng:DynamicAdditions when kunpeng:TaskDefinition is removed.
     * （旧线名 kunpeng:additionDynamics，新 moddle 描述符为 DynamicAdditions）
     */
    this.postExecute('element.updateModdleProperties', HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement
      } = context;

      if (
        !is(element, 'bpmn:AdHocSubProcess')
        || !is(moddleElement, 'bpmn:ExtensionElements')
        || getTaskDefinition(element)
      ) {
        return;
      }

      const additionDynamics = getAdditionDynamics(element);

      if (additionDynamics) {
        modeling.updateModdleProperties(element, moddleElement, {
          values: without(moddleElement.get('values'), additionDynamics)
        });
      }
    }, true);
  }
}

CleanUpAdHocSubProcessBehavior.$inject = [
  'eventBus',
  'modeling'
];


// helpers //////////

function getAdHoc(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:AdHoc')[ 0 ];
}

function getAdditionDynamics(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:DynamicAdditions')[ 0 ];
}

function getTaskDefinition(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:TaskDefinition')[ 0 ];
}
