import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { createElement } from './util/ElementUtil.js';
import { getExtensionElementsList } from './util/ExtensionElementsUtil.js';

const HIGH_PRIORITY = 5000;

/**
 * Kunpeng BPMN specific behavior for creating user tasks.
 */
export default class CreateKunpengUserTaskBehavior extends CommandInterceptor {
  constructor(bpmnFactory, eventBus, modeling) {
    super(eventBus);

    /**
     * Add kunpeng:userTask extension element when creating bpmn:UserTask.
     * （新内核替换命令 bpmnReplace：原地换 bo，context.element 即新形态）
     */
    this.postExecuted(
      [ 'shape.create', 'bpmnReplace' ],
      HIGH_PRIORITY,
      function(context) {
        const shape = context.shape || context.element;
        const explicitlyDisabled = context.hints && context.hints.createElementsBehavior === false;

        if (!is(shape, 'bpmn:UserTask') || explicitlyDisabled) {
          return;
        }

        let userTaskElement = getKunpengUserTask(shape);
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

CreateKunpengUserTaskBehavior.$inject = [ 'bpmnFactory', 'eventBus', 'modeling' ];

/**
 * Get kunpeng:userTask extension.
 *
 * @param {djs.model.Base|ModdleElement} element
 *
 * @returns {ModdleElement|null}
 */
function getKunpengUserTask(element) {
  const businessObject = getBusinessObject(element);
  const userTaskElements = getExtensionElementsList(businessObject, 'kunpeng:UserTask');

  return userTaskElements[0] || null;
}
