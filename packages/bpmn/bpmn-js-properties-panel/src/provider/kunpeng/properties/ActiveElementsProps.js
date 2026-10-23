import {
  is,
  getBusinessObject
} from '@kunpeng-io/bpmn-js';

import { isFeelEntryEdited } from '@kunpeng-io/properties-panel';

import { isKunpengServiceTask } from '../utils/KunpengServiceTaskUtil';

import { useService } from '../../../hooks';

import { BpmnFeelEntry } from '../../../entries/BpmnFeelEntry';

import {
  getExtensionElementsList,
  addExtensionElements
} from '../../../utils/ExtensionElementsUtil';

import { createElement } from '../../../utils/ElementUtil';

export function ActiveElementsProps(props) {
  const {
    element
  } = props;

  if (!is(element, 'bpmn:AdHocSubProcess') || isKunpengServiceTask(element)) {
    return [];
  }

  const entries = [
    {
      id: 'activeElementsCollection',
      component: ActiveElementsCollection,
      isEdited: isFeelEntryEdited
    }
  ];

  return entries;
}

function ActiveElementsCollection(props) {
  const {
    element
  } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return getProperty(element);
  };

  const setValue = (value) => {
    return setProperty(element, value, commandStack, bpmnFactory);
  };

  return BpmnFeelEntry({
    element,
    id: 'activeElements-activeElementsCollection',
    label: translate('Active elements collection'),
    feel: 'required',
    getValue,
    setValue,
    debounce
  });
}

function getProperty(element) {
  const extensionElement = getExtensionElement(element);
  return extensionElement && extensionElement.get('activeElementsCollection');
}

function setProperty(element, value, commandStack, bpmnFactory) {

  const extensionElement = getExtensionElement(element);

  if (!extensionElement) {

    // (1) create extension element
    const adHoc = createElement(
      'kunpeng:AdHoc',
      {
        activeElementsCollection: value
      },
      undefined,
      bpmnFactory
    );

    const businessObject = getBusinessObject(element);
    addExtensionElements(element, businessObject, adHoc, bpmnFactory, commandStack);

  } else {

    // (2) update extension element's property
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: extensionElement,
      properties: {
        activeElementsCollection: value
      }
    });
  }
}

function getExtensionElement(element) {
  const businessObject = getBusinessObject(element);
  const extensions = getExtensionElementsList(businessObject, 'kunpeng:AdHoc');
  return extensions[0];
}

