import { is } from '@kunpeng-io/bpmn-js';

import { getBusinessObject } from '@kunpeng-io/bpmn-js';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isUndefined } from 'min-dash';

import { removeExtensionElements } from './util/ExtensionElementsUtil.js';

const HIGH_PRIORITY = 5000;


/**
 * Kunpeng BPMN behavior removing kunpeng:TaskSchedule elements without
 * kunpeng:dueDate and kunpeng:followUpDate.
 */
export default class RemoveTaskScheduleBehavior extends CommandInterceptor {
  constructor(commandStack, eventBus) {
    super(eventBus);

    this.postExecuted('element.updateModdleProperties' , HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement
      } = context;

      if (!is(moddleElement, 'kunpeng:TaskSchedule')) {
        return;
      }

      const taskSchedule = moddleElement;

      if (
        is(element, 'bpmn:UserTask')
          && isUndefined(taskSchedule.get('kunpeng:dueDate'))
          && isUndefined(taskSchedule.get('kunpeng:followUpDate'))
      ) {
        const businessObject = getBusinessObject(element);

        removeExtensionElements(element, businessObject, taskSchedule, commandStack);
      }
    }, true);

  }
}

RemoveTaskScheduleBehavior.$inject = [
  'commandStack',
  'eventBus'
];
