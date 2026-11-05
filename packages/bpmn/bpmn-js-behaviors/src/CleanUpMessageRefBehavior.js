import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';


export default class CleanUpMessageRefBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus, modeling);

    // 新内核替换命令 bpmnReplace（原地换 bo，context.element 即新形态）
    this.postExecuted('bpmnReplace', function(event) {
      const newShape = event.context.element;

      if (!is(newShape, 'bpmn:ThrowEvent')) {
        return;
      }

      const messageEventDefinition = getMessageEventDefinition(newShape);

      if (!messageEventDefinition) {
        return;
      }

      const messageRef = messageEventDefinition.get('messageRef');
      if (!messageRef) {
        return;
      }

      modeling.updateModdleProperties(newShape, messageEventDefinition, {
        messageRef: undefined
      });
    });

    this.postExecuted('bpmnReplace', function(event) {
      const newShape = event.context.element,
            bo = getBusinessObject(newShape);

      if (!is(bo, 'bpmn:SendTask')) {
        return;
      }

      const messageRef = bo.get('messageRef');
      if (!messageRef) {
        return;
      }

      modeling.updateProperties(newShape, {
        messageRef: undefined
      });
    });
  }
}

CleanUpMessageRefBehavior.$inject = [ 'eventBus', 'modeling' ];


// helpers //////////

function getMessageEventDefinition(element) {
  const businessObject = getBusinessObject(element);

  const eventDefinitions = businessObject.get('eventDefinitions') || [];

  return eventDefinitions.find(definition => {
    return is(definition, 'bpmn:MessageEventDefinition');
  });
}
