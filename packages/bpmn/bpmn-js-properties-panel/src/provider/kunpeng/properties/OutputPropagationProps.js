import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import {
  isPropagateAllChildVariables
} from '../utils/InputOutputUtil';

import {
  getCalledElement
} from '../utils/CalledElementUtil.js';

import {
  createElement
} from '../../../utils/ElementUtil';

import {
  useService
} from '../../../hooks';

import { ToggleSwitchEntry, isToggleSwitchEntryEdited } from '@kunpeng-io/properties-panel';

{ /* Required to break up imports, see https://github.com/babel/babel/issues/15156 */ }


export function OutputPropagationProps(props) {
  const {
    element
  } = props;

  if (!is(element, 'bpmn:CallActivity')) {
    return [];
  }

  return [
    {
      id: 'propagateAllChildVariables',
      component: PropagateAllChildVariables,
      isEdited: isToggleSwitchEntryEdited
    }
  ];
}

function PropagateAllChildVariables(props) {
  const {
    element
  } = props;

  const commandStack = useService('commandStack'),
        bpmnFactory = useService('bpmnFactory'),
        translate = useService('translate');

  const propagateAllChildVariables = isPropagateAllChildVariables(element);

  const getValue = () => {
    return propagateAllChildVariables;
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

    // (3) Update propagateAllChildVariables attribute
    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: calledElement,
        properties: {
          propagateAllChildVariables: value
        }
      }
    });

    // (4) Execute the commands
    commandStack.execute('properties-panel.multi-command-executor', commands);
  };

  return ToggleSwitchEntry({
    id: 'propagateAllChildVariables',
    label: translate('Propagate all child process variables'),
    switcherLabel: propagateAllChildVariables ?
      translate('On') :
      translate('Off'),
    tooltip: <div>
      <p>{translate('If turned on, all variables from the child process instance will be propagated to the parent process instance.')}</p>
      <p>{translate('Otherwise, only variables defined via output mappings will be propagated.')}</p>
    </div>,
    getValue,
    setValue
  });
}
