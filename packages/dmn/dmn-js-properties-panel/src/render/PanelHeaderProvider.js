import {
  getLabel
} from '@kunpeng-io/dmn-js';

import {
  getBusinessObject,
  is
} from '@kunpeng-io/dmn-js';


import iconsByType from '../icons';

export function getConcreteType(element) {
  const {
    type: elementType
  } = element;

  return getRawType(elementType);
}

export const PanelHeaderProvider = {

  getElementLabel: (element) => {

    if (is(element, 'dmn:Definitions'))
      return getBusinessObject(element).get('name');

    return getLabel(element);
  },

  getElementIcon: (element) => {
    const concreteType = getConcreteType(element);

    return iconsByType[ concreteType ];
  },

  getTypeLabel: (element) => {
    const concreteType = getConcreteType(element);

    return concreteType
      .replace(/(\B[A-Z])/g, ' $1')
      .replace(/(\bNon Interrupting)/g, '($1)');
  }
};


// helpers ///////////////////////

function getRawType(type) {
  return type.split(':')[1];
}
