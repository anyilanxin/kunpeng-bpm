import { getBusinessObject } from '@kunpeng-io/bpmn-js';
import { isMessageThrowEvent } from '../utils/KunpengServiceTaskUtil';
import { is } from '@kunpeng-io/bpmn-js';
import { getMessageEventDefinition } from '../../bpmn/utils/EventDefinitionUtil';
import { SelectEntry } from '@kunpeng-io/properties-panel';

import {
  getExtensionElementsList,
  removeExtensionElements,
} from '../../../utils/ExtensionElementsUtil';

import { createElement } from '../../../utils/ElementUtil';

import { useService } from '../../../hooks';

{

  /* Required to break up imports, see https://github.com/babel/babel/issues/15156 */
}

export const INNER_IMPLEMENTATION_OPTION = 'inner',
      JOB_WORKER_IMPLEMENTATION_OPTION = 'jobWorker',
      DEFAULT_IMPLEMENTATION_OPTION = '';

export function ThrowMessageImplementationProps(props) {
  const { element } = props;

  if (!isMessageThrowEvent(element)) {
    return [];
  }

  return [
    {
      id: 'innerImplementation',
      component: ThrowMessageImplementation,
      isEdited: () => isThrowMessageImplementationEdited(element),
    },
  ];
}

function ThrowMessageImplementation(props) {
  const { element, id } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const messageEventDefinition = getMessageEventDefinition(element);
  const getValue = () => {
    if (getPublishMessage(messageEventDefinition)) {
      return INNER_IMPLEMENTATION_OPTION;
    }

    if (getTaskDefinition(element)) {
      return JOB_WORKER_IMPLEMENTATION_OPTION;
    }

    return DEFAULT_IMPLEMENTATION_OPTION;
  };

  /**
   * Set value by either creating a kunpeng:script or a kunpeng:taskDefintion
   * extension element. Note that they must not exist both at the same time, however
   * this will be ensured by a bpmn-js behavior (and not by the propPanel).
   */
  const setValue = (value) => {
    let extensionElement, extensionElementType;
    if (value === INNER_IMPLEMENTATION_OPTION) {
      extensionElement = getPublishMessage(messageEventDefinition);
      extensionElementType = 'kunpeng:PublishMessage';
    } else if (value === JOB_WORKER_IMPLEMENTATION_OPTION) {

      // (3) commit all updates
      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: messageEventDefinition,
        properties: {
          messageRef: null,
        },
      });
      extensionElement = getTaskDefinition(element);
      extensionElementType = 'kunpeng:TaskDefinition';
    } else {
      resetElement(element, commandStack);
    }

    if (!extensionElement && extensionElementType) {
      extensionElement = createElement(
        extensionElementType,
        {},
        null,
        bpmnFactory,
      );

      updateExtensionElements(
        element,
        extensionElement,
        bpmnFactory,
        commandStack,
      );
    }
  };

  const getOptions = () => {
    const options = [
      { value: DEFAULT_IMPLEMENTATION_OPTION, label: translate('<none>') },
      {
        value: INNER_IMPLEMENTATION_OPTION,
        label: translate('Inner Message Publish'),
      },
      {
        value: JOB_WORKER_IMPLEMENTATION_OPTION,
        label: translate('Job worker'),
      },
    ];

    return options;
  };

  return SelectEntry({
    element,
    id,
    label: translate('Implementation'),
    getValue,
    setValue,
    getOptions,
  });
}

// helper ///////////////////////

function getTaskDefinition(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:TaskDefinition')[0];
}

function getPublishMessage(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:PublishMessage')[0];
}

function isThrowMessageImplementationEdited(element) {
  return getTaskDefinition(element) || getPublishMessage(element);
}

function resetElement(element, commandStack) {
  const businessObject = getBusinessObject(element);
  const taskDefinition = getTaskDefinition(element);
  const messageEventDefinition = getMessageEventDefinition(element);
  const publishMessage = getPublishMessage(messageEventDefinition);

  // (3) commit all updates
  commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: messageEventDefinition,
    properties: {
      messageRef: null,
    },
  });
  if (taskDefinition) {
    removeExtensionElements(
      element,
      businessObject,
      taskDefinition,
      commandStack,
    );
  }
  if (publishMessage) {
    removeExtensionElements(
      messageEventDefinition,
      businessObject,
      publishMessage,
      commandStack,
    );
  }
}

function updateExtensionElements(
    element,
    extensionElementToAdd,
    bpmnFactory,
    commandStack,
) {
  const messageEventDefinition = getMessageEventDefinition(element);
  const messageUpdate = is(extensionElementToAdd, 'kunpeng:PublishMessage');
  const businessObject = messageUpdate ? getBusinessObject(messageEventDefinition) : getBusinessObject(element);
  let extensionElements = businessObject.get('extensionElements');
  const commands = [];

  // (1) create bpmn:ExtensionElements if it doesn't exist
  if (!extensionElements) {
    extensionElements = createElement(
      'bpmn:ExtensionElements',
      {
        values: [],
      },
      businessObject,
      bpmnFactory,
    );

    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: businessObject,
        properties: {
          extensionElements,
        },
      },
    });
  }

  // 删除反向的扩展信息

  const removeBusinessObject = messageUpdate ? getBusinessObject(element) : getBusinessObject(getMessageEventDefinition(element));
  if (removeBusinessObject) {
    let removeExtensionElements = removeBusinessObject.get('extensionElements');
    if (removeExtensionElements) {
      const extensionElementsToRemove = messageUpdate ? getTaskDefinition(element) : getPublishMessage(messageEventDefinition);
      const values = removeExtensionElements.get('values').filter(value => extensionElementsToRemove !== value);
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element:messageUpdate ? element : messageEventDefinition ,
          moddleElement: removeExtensionElements,
          properties: {
            values
          }
        }
      });
    }

  }

  // (2) add extension element to list
  extensionElementToAdd.$parent = extensionElements;
  commands.push({
    cmd: 'element.updateModdleProperties',
    context: {
      element:messageUpdate ? messageEventDefinition : element ,
      moddleElement: extensionElements,
      properties: {
        values: [ ...extensionElements.get('values'), extensionElementToAdd ]
      }
    }
  });
  commandStack.execute('properties-panel.multi-command-executor', commands);
}
