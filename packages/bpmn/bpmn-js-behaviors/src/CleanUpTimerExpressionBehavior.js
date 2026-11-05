import {
  is
} from '@kunpeng-io/bpmn-js';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import {
  getTimerEventDefinition,
  isTimerExpressionTypeSupported,
  TIMER_PROPERTIES
} from './util/TimerUtil.js';

/**
 * Kunpeng BPMN behavior ensuring that bpmn:TimerEventDefinition has only allowed time properties of:
 * - timeCycle
 * - timeDate
 * - timeDuration
 */
export default class CleanUpTimerExpressionBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);

    this._modeling = modeling;

    this.postExecuted([
      'shape.move',
      'bpmnReplace',
      'shape.create',
      'properties.update',
      'element.updateModdleProperties'
    ], context => {
      const element = context.shape || context.newShape || context.element;
      this.cleanUpTimerProperties(element);
    }, true);
  }

  /**
  * Remove unsupported timer properties.
  */
  cleanUpTimerProperties(element) {

    if (!is(element, 'bpmn:Event')) {
      return;
    }

    const timerEventDefinition = getTimerEventDefinition(element);

    if (!timerEventDefinition) {
      return;
    }

    const propertiesUpdate = TIMER_PROPERTIES.reduce((acc, type) => {
      if (timerEventDefinition.get(type) && !isTimerExpressionTypeSupported(type, element)) {
        acc[type] = undefined;
      }
      return acc;
    }, {});

    if (Object.keys(propertiesUpdate).length) {
      this._modeling.updateModdleProperties(element, timerEventDefinition, propertiesUpdate);
    }
  }
}

CleanUpTimerExpressionBehavior.$inject = [
  'eventBus',
  'modeling'
];
