import { TextAreaEntry, isTextAreaEntryEdited } from '@kunpeng/properties-panel';

import { getBusinessObject } from '@kunpeng/dmn-js-shared/lib/util/ModelUtil';

import {
  useService
} from '../../../hooks';

import {
  is,
  isAny
} from '@kunpeng/dmn-js-shared/lib/util/ModelUtil';

/**
 * @typedef { import('@kunpeng/properties-panel').EntryDefinition } Entry
 */

/**
 * @returns {Array<Entry>} entries
 */
export function NameProps(props) {
  const {
    element
  } = props;

  if (!isAny(element, [ 'dmn:DRGElement', 'dmn:Definitions', 'dmn:TextAnnotation' ])) {
    return [];
  }

  return [
    {
      id: 'name',
      component: Name,
      element,
      isEdited: isTextAreaEntryEdited
    }
  ];
}

function Name(props) {
  const {
    element,
    id
  } = props;

  const modeling = useService('modeling');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  // (1) default: name
  let options = {
    element,
    id,
    label: translate('Name'),
    debounce,
    getValue: (element) => {
      return getBusinessObject(element).get('name');
    },
    setValue: (value) => {
      modeling.updateProperties(element, {
        name: value
      });
    },
    autoResize: true
  };

  // (2) text annotation
  if (is(element, 'dmn:TextAnnotation')) {
    options = {
      ...options,
      getValue: (element) => {
        return getBusinessObject(element).get('text');
      },
      setValue: (value) => {
        modeling.updateProperties(element, {
          text: value
        });
      }
    };
  }

  return TextAreaEntry(options);
}
