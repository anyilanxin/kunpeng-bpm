import {
  getBusinessObject
} from '@kunpeng-io/bpmn-js';

import Addition from './Addition';

import {
  areAdditionsSupported,
  getDynamicAdditions,
  getAdditions
} from '../utils/AdditionsUtil';

import {
  createElement
} from '../../../utils/ElementUtil';

import { without } from 'min-dash';


export function AdditionProps({ element, injector }) {
  const moddle = injector.get('moddle');
  const businessObject = getBusinessObject(element);
  if (!areAdditionsSupported(businessObject, moddle)) {
    return null;
  }

  const additions = getAdditions(element) || [];

  const bpmnFactory = injector.get('bpmnFactory'),
        commandStack = injector.get('commandStack');

  const items = additions.map((addition, index) => {
    const id = element.id + '-addition-' + index;

    return {
      id,
      label: addition.get('key') || '',
      entries: Addition({
        idPrefix: id,
        element,
        addition
      }),
      autoFocusEntry: id + '-key',
      remove: removeFactory({ commandStack, element, addition })
    };
  });

  return {
    items,
    add: addFactory({ bpmnFactory, commandStack, element }),
  };
}

function removeFactory({ commandStack, element, addition }) {
  return function(event) {
    event.stopPropagation();

    let commands = [];

    const additionDynamics = getDynamicAdditions(element);

    if (!additionDynamics) {
      return;
    }

    const newDynamics = without(additionDynamics.get('values'), addition);

    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: additionDynamics,
        properties: {
          values: newDynamics
        }
      }
    });

    // remove kunpeng:additionDynamics if there are no headers anymore
    if (!newDynamics.length) {
      const businessObject = getBusinessObject(element),
            extensionElements = businessObject.get('extensionElements');

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: without(extensionElements.get('values'), additionDynamics)
          }
        }
      });
    }

    commandStack.execute('properties-panel.multi-command-executor', commands);
  };
}

function addFactory({ bpmnFactory, commandStack, element }) {
  return function(event) {

    event.stopPropagation();

    let commands = [];

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

    // (2) ensure kunpeng:DynamicAdditions
    let dynamicAdditions = getDynamicAdditions(element);

    if (!dynamicAdditions) {
      const parent = extensionElements;

      dynamicAdditions = createElement('kunpeng:DynamicAdditions', {
        values: []
      }, parent, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [ ...extensionElements.get('values'), dynamicAdditions ]
          }
        }
      });
    }

    // (3) create addition
    const addition = createElement('kunpeng:Addition', {}, dynamicAdditions, bpmnFactory);

    // (4) add addition to list
    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: dynamicAdditions,
        properties: {
          values: [ ...dynamicAdditions.get('values'), addition ]
        }
      }
    });

    commandStack.execute('properties-panel.multi-command-executor', commands);

  };
}
