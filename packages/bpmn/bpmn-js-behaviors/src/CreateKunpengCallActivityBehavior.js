import { has } from 'min-dash';

import { createElement } from './util/ElementUtil';

import { getCalledElement } from './util/CalledElementUtil';

import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

const HIGH_PRIORITY = 5000;


/**
 * Kunpeng BPMN specific behavior for creating call activities.
 */
export default class CreateKunpengCallActivityBehavior extends CommandInterceptor {
  constructor(bpmnFactory, eventBus, modeling) {
    super(eventBus);

    /**
     * Add kunpeng:CalledElement extension element with kunpeng:propagateAllChildVariables attribute = false
     * when creating bpmn:CallActivity.
     */
    this.postExecuted('shape.create', HIGH_PRIORITY, function(context) {
      const { shape } = context;

      if (!is(shape, 'bpmn:CallActivity')) {
        return;
      }

      const businessObject = getBusinessObject(shape);

      let calledElement = getCalledElement(businessObject);

      if (!calledElement) {
        let extensionElements = businessObject.get('extensionElements');

        if (!extensionElements) {
          extensionElements = createElement(
            'bpmn:ExtensionElements',
            {
              values: []
            },
            businessObject,
            bpmnFactory
          );

          modeling.updateProperties(shape, { extensionElements });
        }

        calledElement = createElement(
          'kunpeng:CalledElement',
          {
            propagateAllChildVariables: false
          },
          extensionElements,
          bpmnFactory
        );

        modeling.updateModdleProperties(shape, extensionElements, {
          values: [
            ...(extensionElements.values || []),
            calledElement
          ]
        });
      } else if (!has(calledElement, 'propagateAllChildVariables')) {

        // set kunpeng:propagateAllChildVariables to false if kunpeng:CalledElement exists
        modeling.updateModdleProperties(shape, calledElement, {
          propagateAllChildVariables: false
        });
      }
    }, true);

  }
}

CreateKunpengCallActivityBehavior.$inject = [
  'bpmnFactory',
  'eventBus',
  'modeling'
];
