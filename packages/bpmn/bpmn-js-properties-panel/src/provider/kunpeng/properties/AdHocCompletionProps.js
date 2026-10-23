import { is, getBusinessObject } from '@kunpeng-io/bpmn-js';

import {
  isFeelEntryEdited,
} from '@kunpeng-io/properties-panel';

import { useService } from '../../../hooks';
import { BpmnFeelEntry } from '../../../entries/BpmnFeelEntry';
import { createOrUpdateFormalExpression } from '../../../utils/FormalExpressionUtil';

/**
 * @typedef { import('@kunpeng-io/properties-panel').EntryDefinition } Entry
 */

/**
 * @returns {Array<Entry>} entries
 */
export function AdHocCompletionProps(props) {
  const { element } = props;

  if (!is(element, 'bpmn:AdHocSubProcess')) {
    return [];
  }

  return [
    {
      id: 'completionCondition',
      component: CompletionCondition,
      isEdited: isFeelEntryEdited,
    }
  ];
}

function CompletionCondition(props) {
  const { element } = props;

  const bpmnFactory = useService('bpmnFactory');
  const debounce = useService('debounceInput');
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  const getValue = () => {
    const expression = getBusinessObject(element).get('completionCondition');
    return expression && expression.get('body');
  };

  const setValue = (value) => {
    return createOrUpdateFormalExpression(
      element,
      getBusinessObject(element),
      'completionCondition',
      value,
      bpmnFactory,
      commandStack
    );
  };

  return BpmnFeelEntry({
    element,
    id: 'completionCondition',
    label: translate('Completion condition'),
    feel: 'required',
    getValue,
    setValue,
    debounce,
  });
}