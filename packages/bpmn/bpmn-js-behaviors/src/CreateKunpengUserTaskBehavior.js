import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { createElement } from './util/ElementUtil';
import { getExtensionElementsList } from './util/ExtensionElementsUtil';

const HIGH_PRIORITY = 5000;

/**
 * Kunpeng BPMN specific behavior for creating user tasks.
 */
export default class CreateKunpengngngUserTaskBehavior extends CommandInterceptor {
  constructor(bpmnFactory, eventBus, modeling) {
    super(eventBus);

    /**
     * Add kunpeng:userTask extension element when creating bpmn:UserTask.
     */
    this.postExecuted(
      [ 'shape.create', 'shape.replace' ],
      HIGH_PRIORITY,
      function(context) {
        const shape = context.shape || context.newShape;
        const explicitlyDisabled = context.hints && context.hints.createElementsBehavior === false;

        if (!is(shape, 'bpmn:UserTask') || explicitlyDisabled) {
          return;
        }

        let userTaskElement = getKunpengngngUserTask(shape);
        if (userTaskElement) {
          return;
        }

        const businessObject = getBusinessObject(shape);
        let extensionElements = businessObject.get('extensionElements');

        if (!extensionElements) {
          extensionElements = createElement(
            'bpmn:ExtensionElements',
            {
              values: [],
            },
            businessObject,
            bpmnFactory
          );

          modeling.updateProperties(shape, { extensionElements });
        }

        userTaskElement = createElement(
          'kunpeng:UserTask',
          {},
          extensionElements,
          bpmnFactory
        );

        modeling.updateModdleProperties(shape, extensionElements, {
          values: [ ...(extensionElements.values || []), userTaskElement ],
        });
      },
      true
    );
  }
}

CreateKunpengngngUserTaskBehavior.$inject = [ 'bpmnFactory', 'eventBus', 'modeling' ];

/**
 * Get kunpeng:userTask extension.
 *
 * @param {djs.model.Base|ModdleElement} element
 *
 * @returns {ModdleElement|null}
 */
function getKunpengngngUserTask(element) {
  const businessObject = getBusinessObject(element);
  const userTaskElements = getExtensionElementsList(businessObject, 'kunpeng:UserTask');

  return userTaskElements[0] || null;
}
