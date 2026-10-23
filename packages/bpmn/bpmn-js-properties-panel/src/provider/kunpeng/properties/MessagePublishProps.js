import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';

import { isFeelEntryEdited } from '@kunpeng-io/properties-panel';
import { isSelectEntryEdited } from '@kunpeng-io/properties-panel';
import ReferenceSelect from '../../../entries/ReferenceSelect';
import {
  sortBy
} from 'min-dash';
import {
  createElement,
  findRootElementsByType,
  getRoot,
  findRootElementById,
  nextId,
} from '../../../utils/ElementUtil';
import {
  getMessage,
  getMessageEventDefinition,
} from '../../bpmn/utils/EventDefinitionUtil';

import { isMessageThrowEvent } from '../utils/KunpengServiceTaskUtil';
import { getExtensionElementsList } from '../../../utils/ExtensionElementsUtil';

import { useService } from '../../../hooks';

import { BpmnFeelEntry } from '../../../entries/BpmnFeelEntry';
export const EMPTY_OPTION = '';
export const CREATE_NEW_OPTION = 'create-new';

export function MessagePublishProps(props) {
  const { element } = props;
  const messageEventDefinition = getMessageEventDefinition(element);
  if (
    !(
      is(element, 'bpmn:IntermediateThrowEvent') && isMessageThrowEvent(element)
    ) ||
    !getMessagePublish(messageEventDefinition)
  ) {
    return [];
  }

  const message = getMessage(element);

  let entries = [
    {
      id: 'messageRef',
      component: MessageRef,
      isEdited: isSelectEntryEdited
    }
  ];

  if (message) {
    entries = [
      ...entries,
      {
        id: 'messageName',
        component: MessageName,
        isEdited: isFeelEntryEdited
      }
    ];
  }

  return [
    ...entries,
    {
      id: 'correlationKey',
      component: CorrelationKey,
      isEdited: isFeelEntryEdited,
    },
    {
      id: 'timeToLive',
      component: TimeToLive,
      isEdited: isFeelEntryEdited,
    },
  ];

}

function MessageRef(props) {
  const { element } = props;

  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  const messageEventDefinition = getMessageEventDefinition(element);

  const getValue = () => {
    const message = getMessage(element);

    if (message) {
      return message.get('id');
    }

    return EMPTY_OPTION;
  };

  const setValue = (value) => {
    const root = getRoot(messageEventDefinition);
    const commands = [];

    let message;

    // (1) create new message
    if (value === CREATE_NEW_OPTION) {
      const id = nextId('Message_');

      message = createElement(
        'bpmn:Message',
        { id, name: id },
        root,
        bpmnFactory
      );

      value = message.get('id');

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: root,
          properties: {
            rootElements: [ ...root.get('rootElements'), message ]
          }
        }
      });
    }

    // (2) update (or remove) messageRef
    message = message || findRootElementById(messageEventDefinition, 'bpmn:Message', value);

    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: messageEventDefinition,
        properties: {
          messageRef: message
        }
      }
    });

    // (3) commit all updates
    return commandStack.execute('properties-panel.multi-command-executor', commands);
  };

  const getOptions = () => {

    let options = [
      { value: EMPTY_OPTION, label: translate('<none>') },
      { value: CREATE_NEW_OPTION, label: translate('Create new ...') }
    ];

    const messages = findRootElementsByType(getBusinessObject(element), 'bpmn:Message');

    sortByName(messages).forEach(message => {
      options.push({
        value: message.get('id'),
        label: message.get('name')
      });
    });

    return options;
  };

  return ReferenceSelect({
    element,
    id: 'messageRef',
    label: translate('Global message reference'),
    autoFocusEntry: 'messageName',
    getValue,
    setValue,
    getOptions
  });
}



function MessageName(props) {
  const { element } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const message = getMessage(element);

  const getValue = () => {
    return message.get('name');
  };

  const setValue = (value) => {
    return commandStack.execute(
      'element.updateModdleProperties',
      {
        element,
        moddleElement: message,
        properties: {
          name: value
        }
      }
    );
  };

  return BpmnFeelEntry({
    element,
    id: 'messageName',
    label: translate('Name'),
    feel: 'optional',
    getValue,
    setValue,
    debounce
  });
}

function CorrelationKey(props) {
  const { element, id } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const messageEventDefinition = getMessageEventDefinition(element);

  const getValue = () => {
    return (getMessagePublish(messageEventDefinition) || {}).correlationKey;
  };

  const setValue = (value) => {
    const commands = [];

    const businessObject = getBusinessObject(messageEventDefinition);

    let extensionElements = businessObject.get('extensionElements');

    // (1) ensure extension elements
    if (!extensionElements) {
      extensionElements = createElement(
        'bpmn:ExtensionElements',
        { values: [] },
        businessObject,
        bpmnFactory,
      );

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: businessObject,
          properties: { extensionElements },
        },
      });
    }

    // (2) ensure messagePublish
    let messagePublish = getMessagePublish(messageEventDefinition);

    if (!messagePublish) {
      messagePublish = createElement(
        'kunpeng:PublishMessage',
        {},
        extensionElements,
        bpmnFactory,
      );

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [ ...extensionElements.get('values'), messagePublish ],
          },
        },
      });
    }

    // (3) update script.resultVariable
    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: messagePublish,
        properties: { correlationKey: value },
      },
    });

    // (4) commit all updates
    commandStack.execute('properties-panel.multi-command-executor', commands);
  };

  return BpmnFeelEntry({
    element,
    id,
    label: translate('Correlation Key'),
    feel: 'optional',
    getValue,
    setValue,
    debounce,
  });
}

function TimeToLive(props) {
  const { element, id } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const messageEventDefinition = getMessageEventDefinition(element);

  const getValue = () => {
    return (getMessagePublish(messageEventDefinition) || {}).timeToLive;
  };

  const setValue = (value) => {
    const commands = [];

    const businessObject = getBusinessObject(messageEventDefinition);

    let extensionElements = businessObject.get('extensionElements');

    // (1) ensure extension elements
    if (!extensionElements) {
      extensionElements = createElement(
        'bpmn:ExtensionElements',
        { values: [] },
        businessObject,
        bpmnFactory,
      );

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: businessObject,
          properties: { extensionElements },
        },
      });
    }

    // (2) ensure messagePublish
    let messagePublish = getMessagePublish(messageEventDefinition);

    if (!messagePublish) {
      messagePublish = createElement(
        'kunpeng:PublishMessage',
        {},
        extensionElements,
        bpmnFactory,
      );

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [ ...extensionElements.get('values'), messagePublish ],
          },
        },
      });
    }

    // (3) update messagePublish.timeToLive
    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: messagePublish,
        properties: { timeToLive: value },
      },
    });

    // (4) commit all updates
    commandStack.execute('properties-panel.multi-command-executor', commands);
  };

  return BpmnFeelEntry({
    element,
    id,
    label: translate('Time to Live'),
    feel: 'optional',
    getValue,
    setValue,
    debounce,
  });
}

// helper ///////////////////////

function getMessagePublish(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:PublishMessage')[0];
}


function sortByName(elements) {
  return sortBy(elements, e => (e.name || '').toLowerCase());
}

