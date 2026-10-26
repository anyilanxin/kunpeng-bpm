import {
  getBusinessObject
} from '@kunpeng/dmn-js-shared/lib/util/ModelUtil';

import { TextFieldEntry, isTextFieldEntryEdited } from '@kunpeng/properties-panel';

import { useCallback } from '@kunpeng/properties-panel/preact/hooks';

import {
  useService
} from '../../../hooks';

import {
  isIdValid
} from '../../utils/ValidationUtil';


/**
 * @typedef { import('@kunpeng/properties-panel').EntryDefinition } Entry
 */

/**
 * @returns {Array<Entry>} entries
 */
export function IdProps(props) {
  const {
    element
  } = props;

  return [
    {
      id: 'id',
      component: Id,
      element,
      isEdited: isTextFieldEntryEdited
    }
  ];
}

function Id(props) {
  const {
    element,
    id
  } = props;

  const modeling = useService('modeling');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  const setValue = (value, error) => {
    if (error) {
      return;
    }

    modeling.updateProperties(element, {
      id: value
    });
  };

  const getValue = useCallback((element) => {
    return getBusinessObject(element).id;
  }, [ element ]);

  const validate = useCallback((value) => {
    const businessObject = getBusinessObject(element);

    return isIdValid(businessObject, value, translate);
  }, [ element, translate ]);

  return TextFieldEntry({
    element,
    id,
    label: translate('ID'),
    getValue,
    setValue,
    debounce,
    validate
  });
}
