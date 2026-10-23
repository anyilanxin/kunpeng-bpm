import {
  createKunpengProperty,
  ensureExtension,
  shouldUpdate
} from '../CreateHelper';
import { getDefaultValue } from '../Helper';


/**
 * A provider that sets up the `kunpeng:property` binding
 * on a newly created moddle element.
 */
export default class KunpengPropertiesProvider {
  static create(element, options) {
    const {
      property,
      bpmnFactory
    } = options;

    const {
      binding,
    } = property;

    const value = getDefaultValue(property);

    const kunpengProperties = ensureExtension(element, 'kunpeng:Properties', bpmnFactory);

    if (!shouldUpdate(value, property)) {
      return;
    }

    const kunpengProperty = createKunpengProperty(binding, value, bpmnFactory);
    kunpengProperty.$parent = kunpengProperties;
    kunpengProperties.get('properties').push(kunpengProperty);
  }
}
