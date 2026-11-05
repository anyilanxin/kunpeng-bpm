import { is, getBusinessObject } from '@kunpeng-io/bpmn-js';

import {
  CheckboxEntry,
  isCheckboxEntryEdited
} from '@kunpeng-io/properties-panel';

import { getExtensionElementsList } from '../../../utils/ExtensionElementsUtil';
import { createElement } from '../../../utils/ElementUtil';
import { useService } from '../../../hooks';

/**
 * @typedef { import('@kunpeng-io/properties-panel').EntryDefinition } Entry
 */

/**
 * 加签配置（仅用户任务）：勾选即在 extensionElements 写入 kunpeng:AddSign
 * （声明即允许，首期无子属性；级联等配置属二期）。
 *
 * @returns {Array<Entry>} entries
 */
export function AddSignProps(props) {
  const { element } = props;

  if (!is(element, 'bpmn:UserTask')) {
    return [];
  }

  return [
    {
      id: 'addSignEnabled',
      component: AddSignEnabled,
      isEdited: isCheckboxEntryEdited
    }
  ];
}

function AddSignEnabled(props) {
  const { element } = props;

  const commandStack = useService('commandStack');
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const getValue = () => {
    return !!getAddSign(element);
  };

  const setValue = (value) => {
    const businessObject = getBusinessObject(element);
    const commands = [];

    let extensionElements = businessObject.get('extensionElements');

    // (1) ensure extension elements
    if (value && !extensionElements) {
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

    // (2) add or remove kunpeng:AddSign
    if (value) {
      const addSign = createElement('kunpeng:AddSign', {}, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [ ...extensionElements.get('values'), addSign ]
          }
        }
      });
    } else {
      const addSign = getAddSign(element);
      if (!addSign) {
        return;
      }

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: extensionElements.get('values').filter((v) => v !== addSign)
          }
        }
      });
    }

    commandStack.execute('properties-panel.multi-command-executor', commands);
  };

  return CheckboxEntry({
    element,
    id: 'addSignEnabled',
    label: translate('Allow add sign'),
    getValue,
    setValue
  });
}

// helper ///////////////////////

function getAddSign(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:AddSign')[0];
}
