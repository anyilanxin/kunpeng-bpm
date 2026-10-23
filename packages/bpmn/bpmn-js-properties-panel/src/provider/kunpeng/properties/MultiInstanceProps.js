import {
  getBusinessObject
} from '@kunpeng-io/bpmn-js';

import {
  TextFieldEntry, isTextFieldEntryEdited,
  isFeelEntryEdited
} from '@kunpeng-io/properties-panel';

import {
  getExtensionElementsList
} from '../../../utils/ExtensionElementsUtil';

import {
  createElement
} from '../../../utils/ElementUtil';
import {
  createOrUpdateFormalExpression
} from '../../../utils/FormalExpressionUtil';

import { useService } from '../../../hooks';

import { BpmnFeelEntry } from '../../../entries/BpmnFeelEntry';

export function MultiInstanceProps(props) {
  const {
    element
  } = props;

  if (!supportsMultiInstances(element)) {
    return [];
  }

  return [
    {
      id: 'multiInstance-loopCardinality',
      component: LoopCardinality,
      isEdited: isFeelEntryEdited
    },
    {
      id: 'multiInstance-completionCondition',
      component: CompletionCondition,
      isEdited: isFeelEntryEdited
    },
    {
      id: 'multiInstance-collection',
      component: Collection,
      isEdited: isFeelEntryEdited
    },
    {
      id: 'multiInstance-elementVariable',
      component: ElementVariable,
      isEdited: isTextFieldEntryEdited
    }
  ];
}



function LoopCardinality(props) {
  const {
    element
  } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    const loopCardinality = getLoopCardinality(element);
    return loopCardinality && loopCardinality.get('body');
  };

  const setValue = (value) => {
    return createOrUpdateFormalExpression(
      element,
      getLoopCharacteristics(element),
      'loopCardinality',
      value,
      bpmnFactory,
      commandStack
    );
  };

  return BpmnFeelEntry({
    element,
    id: 'multiInstance-loopCardinality',
    label: translate('Loop cardinality'),
    getValue,
    setValue,
    debounce
  });
}


function CompletionCondition(props) {
  const {
    element
  } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    const completionCondition = getCompletionCondition(element);
    return completionCondition && completionCondition.get('body');
  };

  const setValue = (value) => {
    return createOrUpdateFormalExpression(
      element,
      getLoopCharacteristics(element),
      'completionCondition',
      value,
      bpmnFactory,
      commandStack
    );
  };

  return BpmnFeelEntry({
    element,
    id: 'multiInstance-completionCondition',
    label: translate('Completion condition'),
    feel: 'required',
    getValue,
    setValue,
    debounce
  });
}

function Collection(props) {
  const {
    element
  } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return getProperty(element, 'collection');
  };

  const setValue = (value) => {
    return setProperty(element, 'collection', value, commandStack, bpmnFactory);
  };

  return BpmnFeelEntry({
    element,
    id: 'multiInstance-collection',
    label: translate('Collection'),
    feel: 'required',
    getValue,
    setValue,
    debounce
  });
}

function ElementVariable(props) {
  const {
    element
  } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return getProperty(element, 'elementVariable');
  };

  const setValue = (value) => {
    return setProperty(element, 'elementVariable', value, commandStack, bpmnFactory);
  };

  return TextFieldEntry({
    element,
    id: 'multiInstance-elementVariable',
    label: translate('Element variable'),
    getValue,
    setValue,
    debounce
  });
}


// helper ///////////////////////

function getLoopCharacteristics(element) {
  const businessObject = getBusinessObject(element);
  return businessObject.get('loopCharacteristics');
}

function getZeebeLoopCharacteristics(loopCharacteristics) {
  const extensionElements = getExtensionElementsList(loopCharacteristics, 'kunpeng:LoopCharacteristics');

  return extensionElements && extensionElements[0];
}

function supportsMultiInstances(element) {
  return !!getLoopCharacteristics(element);
}

function getCompletionCondition(element) {
  return getLoopCharacteristics(element).get('completionCondition');
}


function getLoopCardinality(element) {
  return getLoopCharacteristics(element).get('loopCardinality');
}

function getProperty(element, propertyName) {
  const loopCharacteristics = getLoopCharacteristics(element),
        zeebeLoopCharacteristics = getZeebeLoopCharacteristics(loopCharacteristics);

  return zeebeLoopCharacteristics && zeebeLoopCharacteristics.get(propertyName);
}

function setProperty(element, propertyName, value, commandStack, bpmnFactory) {
  const loopCharacteristics = getLoopCharacteristics(element);

  const commands = [];

  // (1) ensure extension elements
  let extensionElements = loopCharacteristics.get('extensionElements');
  if (!extensionElements) {
    extensionElements = createElement(
      'bpmn:ExtensionElements',
      { values: [] },
      loopCharacteristics,
      bpmnFactory
    );

    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: loopCharacteristics,
        properties: { extensionElements }
      }
    });
  }

  // (2) ensure zeebe loop characteristics
  let zeebeLoopCharacteristics = getZeebeLoopCharacteristics(loopCharacteristics);
  if (!zeebeLoopCharacteristics) {
    zeebeLoopCharacteristics = createElement(
      'kunpeng:LoopCharacteristics',
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
          values: [ ...extensionElements.get('values'), zeebeLoopCharacteristics ]
        }
      }
    });
  }

  // (3) update defined property
  commands.push({
    cmd: 'element.updateModdleProperties',
    context: {
      element,
      moddleElement: zeebeLoopCharacteristics,
      properties: { [ propertyName ]: value }
    }
  });

  // (4) commit all updates
  commandStack.execute('properties-panel.multi-command-executor', commands);
}
