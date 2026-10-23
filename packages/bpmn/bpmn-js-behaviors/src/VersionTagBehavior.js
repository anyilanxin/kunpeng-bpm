import { isDefined } from 'min-dash';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import {
  getBusinessObject,
  is,
  isAny
} from '@kunpeng-io/bpmn-js';
import { removeExtensionElements } from './util/ExtensionElementsUtil';

/**
 * Kunpeng BPMN specific version tag behavior.
 */
export default class VersionTagBehavior extends CommandInterceptor {
  constructor(eventBus, commandStack) {
    super(eventBus);

    /**
     * Ensure that `kunpeng:BindingTypeSupported` (`kunpeng:CalledDecision`,
     * `kunpeng:CalledElement` and `kunpeng:FormDefinition`) only has
     * `kunpeng:versionTag` if `kunpeng:bindingType` is `versionTag`.
     */
    this.preExecute('element.updateModdleProperties', function(context) {
      const {
        moddleElement,
        properties
      } = context;

      if (!isAny(moddleElement, [
        'kunpeng:CalledDecision',
        'kunpeng:CalledElement',
        'kunpeng:FormDefinition'
      ])) {
        return;
      }

      // unset `kunpeng:versionTag` if `kunpeng:bindingType` is not set to `versionTag`
      if ('bindingType' in properties
        && properties.bindingType !== 'versionTag'
        && isDefined(moddleElement.get('versionTag'))) {
        properties.versionTag = undefined;
      }

      // set `kunpeng:bindingType` to `versionTag` if `kunpeng:versionTag` is set
      if (isDefined(properties.versionTag) && moddleElement.get('bindingType') !== 'versionTag') {
        properties.bindingType = 'versionTag';
      }
    }, true);

    /**
     * Remove `kunpeng:VersionTag` if its value is empty.
     */
    this.postExecuted('element.updateModdleProperties', function(context) {
      const {
        element,
        moddleElement
      } = context;

      if (!is(moddleElement, 'kunpeng:VersionTag')) {
        return;
      }

      let businessObject = getBusinessObject(element);

      if (is(element, 'bpmn:Participant')) {
        businessObject = businessObject.get('processRef');
      }

      if (isEmpty(moddleElement.get('value'))) {
        removeExtensionElements(element, businessObject, moddleElement, commandStack);
      }
    }, true);
  }
}

VersionTagBehavior.$inject = [
  'eventBus',
  'commandStack'
];

// helpers //////////

function isEmpty(value) {
  return value == undefined || value === '';
}
