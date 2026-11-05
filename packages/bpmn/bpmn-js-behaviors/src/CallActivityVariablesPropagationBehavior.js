import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { is } from '@kunpeng-io/bpmn-js';

import {
  getOutputParameters,
  getIoMapping
} from './util/InputOutputUtil.js';

const HIGH_PRIORITY = 5000;

/**
 * Kunpeng BPMN behavior for updating <bpmn:CallActivity> elements
 * ensuring that:
 *
 * - `<kunpeng:Output>` elements are removed if `kunpeng:propagateAllChildVariables` is set to true
 */
export default class CallActivityVariablesPropagationBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);

    // Remove <kunpeng:Output> elements if kunpeng:propagateAllChildVariables is set to true.
    this.postExecute('element.updateModdleProperties' , HIGH_PRIORITY, function(context) {
      const {
        element,
        moddleElement,
        properties = {}
      } = context;

      const propagateAllChildVariables =
        properties.propagateAllChildVariables ||
        properties[ 'kunpeng:propagateAllChildVariables' ];

      if (
        !is(element, 'bpmn:CallActivity')
        || !is(moddleElement, 'kunpeng:CalledElement')
        || !propagateAllChildVariables
      ) {
        return;
      }

      const outputParameters = getOutputParameters(element);

      if (!outputParameters || !outputParameters.length) {
        return;
      }

      const ioMapping = getIoMapping(element);

      modeling.updateModdleProperties(element, ioMapping, {
        'kunpeng:outputParameters': []
      });
    }, true);
  }
}

CallActivityVariablesPropagationBehavior.$inject = [
  'eventBus',
  'modeling'
];
