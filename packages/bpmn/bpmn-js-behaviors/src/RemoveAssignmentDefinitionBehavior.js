import { is } from '@kunpeng-io/bpmn-js';

import { getBusinessObject } from '@kunpeng-io/bpmn-js';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { isUndefined } from 'min-dash';

import { removeExtensionElements } from './util/ExtensionElementsUtil.js';

const HIGH_PRIORITY = 5000;


/**
 * Kunpeng BPMN behavior removing kunpeng:AssignmentDefinition elements without
 * kunpeng:assignee, kunpeng:candidateGroups or kunpeng:candidateUsers.
 */
export default class RemoveAssignmentDefinitionBehavior extends CommandInterceptor {
  constructor(commandStack, eventBus) {
    super(eventBus);

    this.postExecuted('element.updateModdleProperties' , HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement
      } = context;

      if (!is(moddleElement, 'kunpeng:AssignmentDefinition')) {
        return;
      }

      const assignmentDefinition = moddleElement;

      if (
        is(element, 'bpmn:UserTask')
          && isUndefined(assignmentDefinition.get('kunpeng:assignee'))
          && isUndefined(assignmentDefinition.get('kunpeng:candidateGroups'))
          && isUndefined(assignmentDefinition.get('kunpeng:candidateUsers'))
      ) {
        const businessObject = getBusinessObject(element);

        removeExtensionElements(element, businessObject, assignmentDefinition, commandStack);
      }
    }, true);

  }
}

RemoveAssignmentDefinitionBehavior.$inject = [
  'commandStack',
  'eventBus'
];
