import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';
import { find, without } from 'min-dash';

export default class CleanUpEndEventBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);

    // 新内核替换命令为 bpmnReplace（原地换 businessObject，context.element 即新形态）
    this.postExecuted('bpmnReplace', function(event) {

      const {
        context
      } = event;

      const {
        element: newShape
      } = context;

      if (!is(newShape, 'bpmn:EndEvent') || !getErrorEventDefinition(newShape)) {
        return;
      }

      const ioMapping = getIoMapping(newShape);

      if (!ioMapping) {
        return;
      }

      const businessObject = getBusinessObject(newShape),
            extensionElements = businessObject.get('extensionElements'),
            values = without(extensionElements.get('values'), ioMapping);

      modeling.updateModdleProperties(newShape, extensionElements, { values });
    });
  }
}

CleanUpEndEventBehavior.$inject = [
  'eventBus',
  'modeling'
];

// helpers //////////

export function getErrorEventDefinition(element) {
  const businessObject = getBusinessObject(element);

  const eventDefinitions = businessObject.get('eventDefinitions') || [];

  return find(eventDefinitions, function(definition) {
    return is(definition, 'bpmn:ErrorEventDefinition');
  });
}

export function getIoMapping(element) {
  const bo = getBusinessObject(element);

  const extensionElements = bo.get('extensionElements');

  if (!extensionElements) {
    return null;
  }

  const values = extensionElements.get('values');

  if (!values) {
    return null;
  }

  return find(values, value => is(value, 'kunpeng:IoMapping'));
}
