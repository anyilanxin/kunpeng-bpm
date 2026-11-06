import { is, getBusinessObject } from '@kunpeng-io/bpmn-js';

import {
  CheckboxEntry,
  isCheckboxEntryEdited,
  NumberFieldEntry,
  isNumberFieldEntryEdited
} from '@kunpeng-io/properties-panel';

import { getExtensionElementsList } from '../../../utils/ExtensionElementsUtil';
import { createElement } from '../../../utils/ElementUtil';
import { useService } from '../../../hooks';

/**
 * @typedef { import('@kunpeng-io/properties-panel').EntryDefinition } Entry
 */

/**
 * 加签配置（仅用户任务）：勾选即在 extensionElements 写入 kunpeng:AddSign（声明即允许）；
 * 启用后可配 maxDepth（级联深度上限，1=禁止级联加签，缺省 1）。
 *
 * @returns {Array<Entry>} entries
 */
export function AddSignProps(props) {
  const { element } = props;

  if (!is(element, 'bpmn:UserTask')) {
    return [];
  }

  const entries = [
    {
      id: 'addSignEnabled',
      component: AddSignEnabled,
      isEdited: isCheckboxEntryEdited
    },
    {
      id: 'addSignMaxDepth',
      component: AddSignMaxDepth,
      isEdited: isNumberFieldEntryEdited
    }
  ];

  return entries;
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

function AddSignMaxDepth(props) {
  const { element } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');

  // 无 kunpeng:AddSign 扩展时不渲染（条目常驻注册、组件内门控：
  // 基座面板的分组条目按选中元素恒等记忆，勾选后同元素不重算条目列表，
  // 仅组件级重渲染能即时揭示本输入项）
  if (!getAddSign(element)) {
    return null;
  }

  const getValue = () => {
    const addSign = getAddSign(element);

    return addSign ? addSign.get('maxDepth') ?? 1 : 1;
  };

  const setValue = (value) => {
    const addSign = getAddSign(element);
    if (!addSign) {
      return;
    }

    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: addSign,
      properties: { maxDepth: value }
    });
  };

  const validate = (value) => {
    if (value == null || value === '' || Number(value) < 1) {
      return translate('Max depth must be >= 1 (1 = no cascade)');
    }
  };

  return NumberFieldEntry({
    element,
    id: 'addSignMaxDepth',
    label: translate('Add sign max depth'),
    min: 1,
    step: 1,
    getValue,
    setValue,
    validate
  });
}

// helper ///////////////////////

function getAddSign(element) {
  const businessObject = getBusinessObject(element);

  return getExtensionElementsList(businessObject, 'kunpeng:AddSign')[0];
}
