import { is } from '@kunpeng-io/bpmn-js';
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';
import { without } from 'min-dash';

import { getExtensionElementsList } from './util/ExtensionElementsUtil.js';


export default class CleanUpTaskListenersBehavior extends CommandInterceptor {
  constructor(eventBus, modeling) {
    super(eventBus);

    // remove task listeners of disallowed type on replace（新内核替换命令 bpmnReplace，context.element 即新形态）
    this.postExecuted('bpmnReplace', function(event) {
      const element = event.context.element;

      updateListeners(element, modeling);
    });

    // remove task listeners of disallowed type on user task properties update
    this.postExecuted('element.updateModdleProperties', function(event) {
      const element = event.context.element;

      if (!is(element, 'bpmn:UserTask')) {
        return;
      }

      updateListeners(element, modeling);
    });

    // remove empty task listener container
    this.postExecuted('element.updateModdleProperties', function(event) {
      const {
        element,
        moddleElement
      } = event.context;

      if (!is(moddleElement, 'kunpeng:TaskListeners')) {
        return;
      }

      const listeners = moddleElement.get('listeners');
      if (listeners.length) {
        return;
      }

      const extensionElements = moddleElement.$parent;
      modeling.updateModdleProperties(element, extensionElements, { values: without(extensionElements.get('values'), moddleElement) });
    });
  }
}

CleanUpTaskListenersBehavior.$inject = [
  'eventBus',
  'modeling'
];

// helpers //////////
function updateListeners(element, modeling) {
  const taskListenersContainer = getTaskListenersContainer(element);
  if (!taskListenersContainer) {
    return;
  }

  const listeners = taskListenersContainer.get('listeners');
  const newListeners = withoutDisallowedListeners(element, listeners);

  if (newListeners.length !== listeners.length) {
    modeling.updateModdleProperties(element, taskListenersContainer, { listeners: newListeners });
  }
}

function withoutDisallowedListeners(element, listeners) {
  // 引擎只有一种用户任务（kunpeng:userTask 标记已拔除），监听器合法性只看元素类型
  return listeners.filter(() => is(element, 'bpmn:UserTask'));
}

function getTaskListenersContainer(element) {
  return getExtensionElementsList(element, 'kunpeng:TaskListeners')[0];
}
