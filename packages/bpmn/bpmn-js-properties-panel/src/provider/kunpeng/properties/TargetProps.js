import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import {
  isFeelEntryEdited,
  isSelectEntryEdited,
  isTextFieldEntryEdited
} from '@kunpeng-io/properties-panel';

import Binding, { getBindingType } from './shared/Binding';
import VersionTag from './shared/VersionTag.js';

import {
  createElement
} from '../../../utils/ElementUtil';

import {
  getCalledElement,
  getProcessId
} from '../utils/CalledElementUtil.js';

import { useService } from '../../../hooks';

import { BpmnFeelEntry } from '../../../entries/BpmnFeelEntry';

import { withProps } from '../../HOCs/withProps.js';

const CalledElementBinding = withProps(Binding, { type: 'kunpeng:CalledElement' }),
      CalledElementVersionTag = withProps(VersionTag, { type: 'kunpeng:CalledElement' });


export function TargetProps(props) {
  const {
    element
  } = props;

  if (!is(element, 'bpmn:CallActivity')) {
    return [];
  }

  const entries = [
    {
      id: 'targetProcessId',
      component: TargetProcessId,
      isEdited: isFeelEntryEdited
    },
    {
      id: 'bindingType',
      component: CalledElementBinding,
      isEdited: isSelectEntryEdited
    }
  ];

  if (getBindingType(element, 'kunpeng:CalledElement') === 'versionTag') {
    entries.push({
      id: 'versionTag',
      component: CalledElementVersionTag,
      isEdited: isTextFieldEntryEdited
    });
  }

  return entries;
}

function TargetProcessId(props) {
  const {
    element,
    id
  } = props;

  const commandStack = useService('commandStack'),
        bpmnFactory = useService('bpmnFactory'),
        translate = useService('translate'),
        debounce = useService('debounceInput');

  const getValue = () => {
    return getProcessId(element);
  };

  const setValue = (value) => {
    const commands = [];

    const businessObject = getBusinessObject(element);

    // (1) ensure extension elements
    let extensionElements = businessObject.get('extensionElements');

    if (!extensionElements) {
      extensionElements = createElement(
        'bpmn:ExtensionElements',
        { values: [] },
        businessObject,
        bpmnFactory
      );

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: businessObject,
          properties: { extensionElements }
        }
      });
    }

    // (2) ensure kunpeng:calledElement
    let calledElement = getCalledElement(businessObject);

    if (!calledElement) {
      calledElement = createElement(
        'kunpeng:CalledElement',
        { },
        extensionElements,
        bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [ ...extensionElements.get('values'), calledElement ]
          }
        }
      });

    }

    // (3) Update processId attribute
    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: calledElement,
        properties: {
          processId: value
        }
      }
    });

    // (4) Execute the commands
    commandStack.execute('properties-panel.multi-command-executor', commands);
  };

  return BpmnFeelEntry({
    element,
    id,
    label: translate('Process ID'),
    feel: 'optional',
    getValue,
    setValue,
    debounce
  });
}