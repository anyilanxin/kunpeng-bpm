import {
  getBusinessObject,
  is,
  isAny
} from '@kunpeng-io/bpmn-js';

import {
  createElement
} from '../../../utils/ElementUtil';

import {
  useService
} from '../../../hooks';

import { isFeelEntryEdited } from '@kunpeng-io/properties-panel';

import { BpmnFeelEntry } from '../../../entries/BpmnFeelEntry';

import { ToggleSwitchEntry, isToggleSwitchEntryEdited } from '@kunpeng-io/properties-panel';


export function ConditionProps(props) {
  const {
    element
  } = props;

  if (!is(element, 'bpmn:SequenceFlow')) {
    return [];
  }

  const conditionProps = [];

  if (isConditionalSource(element.source)) {
    conditionProps.push({
      id: 'conditionExpression',
      component: ConditionExpression,
      isEdited: isFeelEntryEdited
    });
  }

  // 默认流开关：XSD 上 default 属性仅网关族持有（独占/包容/复杂），
  // 活动出线只有条件语义无默认流
  if (isDefaultableSource(element.source)) {
    conditionProps.push({
      id: 'defaultFlow',
      component: DefaultFlowToggle,
      isEdited: isToggleSwitchEntryEdited
    });
  }

  return conditionProps;
}

function ConditionExpression(props) {
  const {
    element
  } = props;

  const commandStack = useService('commandStack'),
        bpmnFactory = useService('bpmnFactory'),
        translate = useService('translate'),
        debounce = useService('debounceInput');

  const getValue = () => {
    return getConditionExpression(element);
  };

  const setValue = (value) => {
    const commands = [];

    const businessObject = getBusinessObject(element);

    // (1) If we set value to a default flow, make it a non-default flow
    // by updating the element source
    const source = element.source;

    if (source.businessObject.default === businessObject) {
      commands.push({
        cmd: 'properties.update',
        context: {
          element: source,
          properties: { 'default': undefined }
        }
      });
    }

    // (2) Create and set formalExpression element containing the conditionExpression,
    // unless the provided value is empty
    const formalExpressionElement = (value && value != '') ?
      createElement(
        'bpmn:FormalExpression',
        {
          body: value
        },
        businessObject,
        bpmnFactory
      )
      : undefined;

    commands.push({
      cmd: 'properties.update',
      context: {
        element: element,
        properties: {
          conditionExpression: formalExpressionElement
        }
      }
    });

    // (3) Execute the commands
    commandStack.execute('properties-panel.multi-command-executor', commands);
  };

  return BpmnFeelEntry({
    element,
    id: 'conditionExpression',
    label: translate('Condition expression'),
    feel: 'required',
    getValue,
    setValue,
    debounce
  });
}


function DefaultFlowToggle(props) {
  const {
    element
  } = props;

  const commandStack = useService('commandStack'),
        translate = useService('translate');

  const businessObject = getBusinessObject(element);
  const source = element.source;

  const getValue = () => {
    return source.businessObject.default === businessObject;
  };

  const setValue = (value) => {
    const commands = [];

    if (value) {
      // 设为默认流：与条件表达式互斥（规范：默认流无条件），先清本线条件
      if (businessObject.get('conditionExpression')) {
        commands.push({
          cmd: 'properties.update',
          context: {
            element: element,
            properties: { conditionExpression: undefined }
          }
        });
      }

      // default 是源网关的单值引用——改指本线即从旧默认线自动切换
      // （互斥由引用模型天然保证，无两条并存态）
      commands.push({
        cmd: 'properties.update',
        context: {
          element: source,
          properties: { 'default': businessObject }
        }
      });
    } else if (source.businessObject.default === businessObject) {
      commands.push({
        cmd: 'properties.update',
        context: {
          element: source,
          properties: { 'default': undefined }
        }
      });
    }

    if (commands.length) {
      commandStack.execute('properties-panel.multi-command-executor', commands);
    }
  };

  const isDefault = getValue();

  return ToggleSwitchEntry({
    element,
    id: 'defaultFlow',
    label: translate('Default flow'),
    switcherLabel: isDefault ? translate('On') : translate('Off'),
    getValue,
    setValue
  });
}


// helper //////////////////////////

const CONDITIONAL_SOURCES = [
  'bpmn:Activity',
  'bpmn:ExclusiveGateway',
  'bpmn:InclusiveGateway'
];

// default 属性持有者：网关族（tExclusiveGateway/tInclusiveGateway/tComplexGateway）
// 与活动族（XSD tActivity 亦有 default 属性——2026-10-29 产品定规放开三态切换）
const DEFAULTABLE_SOURCES = [
  'bpmn:ExclusiveGateway',
  'bpmn:InclusiveGateway',
  'bpmn:ComplexGateway',
  'bpmn:Activity'
];

function isConditionalSource(element) {
  return isAny(element, CONDITIONAL_SOURCES);
}

function isDefaultableSource(element) {
  return isAny(element, DEFAULTABLE_SOURCES);
}

/**
 * getConditionExpression - get the body value of a condition expression for a given element
 *
 * @param  {ModdleElement} element
 *
 * @return {string|undefined}
 */
function getConditionExpression(element) {
  const businessObject = getBusinessObject(element);

  const conditionExpression = businessObject.conditionExpression;

  if (conditionExpression) {
    return conditionExpression.get('body');
  }
}
