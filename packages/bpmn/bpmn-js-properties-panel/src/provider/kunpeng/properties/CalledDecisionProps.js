import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import {
  isFeelEntryEdited,
  isSelectEntryEdited,
  isTextFieldEntryEdited,
  TextFieldEntry
} from '@kunpeng-io/properties-panel';

import Binding, { getBindingType } from './shared/Binding';
import VersionTag from './shared/VersionTag.js';

import {
  getExtensionElementsList
} from '../../../utils/ExtensionElementsUtil';

import {
  createElement
} from '../../../utils/ElementUtil';

import { useService } from '../../../hooks';

import { BpmnFeelEntry } from '../../../entries/BpmnFeelEntry';

import { withProps } from '../../HOCs/withProps.js';

const CalledDecisionBinding = withProps(Binding, { type: 'kunpeng:CalledDecision' }),
      CalledDecisionVersionTag = withProps(VersionTag, { type: 'kunpeng:CalledDecision' });


export function CalledDecisionProps(props) {
  const {
    element
  } = props;

  if (!is(element, 'bpmn:BusinessRuleTask') || !getCalledDecision(element)) {
    return [];
  }

  const entries = [
    {
      id: 'decisionId',
      component: DecisionID,
      isEdited: isFeelEntryEdited
    },
    {
      id: 'bindingType',
      component: CalledDecisionBinding,
      isEdited: isSelectEntryEdited
    }
  ];

  if (getBindingType(element, 'kunpeng:CalledDecision') === 'versionTag') {
    entries.push({
      id: 'versionTag',
      component: CalledDecisionVersionTag,
      isEdited: isTextFieldEntryEdited
    });
  }

  entries.push({
    id: 'resultVariable',
    component: ResultVariable,
    isEdited: isTextFieldEntryEdited
  });

  return entries;
}

function DecisionID(props) {
  const {
    element,
    id
  } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return (getCalledDecision(element) || {}).decisionId;
  };

  const setValue = (value) => {
    const commands = [];

    const businessObject = getBusinessObject(element);

    let extensionElements = businessObject.get('extensionElements');

    // (1) ensure extension elements
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

    // (2) ensure calledDecision
    let calledDecision = getCalledDecision(element);

    if (!calledDecision) {
      calledDecision = createElement(
        'kunpeng:CalledDecision',
        { },
        extensionElements,
        bpmnFactory
      );

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [ ...extensionElements.get('values'), calledDecision ]
          }
        }
      });
    }

    // (3) update caledDecision.decisionId
    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: calledDecision,
        properties: { decisionId: value }
      }
    });

    // (4) commit all updates
    commandStack.execute('properties-panel.multi-command-executor', commands);
  };

  return BpmnFeelEntry({
    element,
    id,
    label: translate('Decision ID'),
    feel: 'optional',
    getValue,
    setValue,
    debounce
  });
}

function ResultVariable(props) {
  const {
    element,
    id
  } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return (getCalledDecision(element) || {}).resultVariable;
  };

  const setValue = (value) => {
    const commands = [];

    const businessObject = getBusinessObject(element);

    let extensionElements = businessObject.get('extensionElements');

    // (1) ensure extension elements
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

    // (2) ensure calledDecision
    let calledDecision = getCalledDecision(element);

    if (!calledDecision) {
      calledDecision = createElement(
        'kunpeng:CalledDecision',
        { },
        extensionElements,
        bpmnFactory
      );

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [ ...extensionElements.get('values'), calledDecision ]
          }
        }
      });
    }

    // (3) update caledDecision.decisionId
    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: calledDecision,
        properties: { resultVariable: value }
      }
    });

    // (4) commit all updates
    commandStack.execute('properties-panel.multi-command-executor', commands);
  };

  return TextFieldEntry({
    element,
    id,
    label: translate('Result variable'),
    getValue,
    setValue,
    debounce
  });
}


// helper ///////////////////////

function getCalledDecision(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:CalledDecision')[0];
}