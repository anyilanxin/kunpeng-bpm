import {
  ensureExtension,
} from '../CreateHelper';
import { getDefaultValue } from '../Helper';


export default class KunpengFormDefinitionBindingProvider {
  static create(element, options) {
    const {
      property,
      bpmnFactory
    } = options;

    const {
      binding
    } = property;

    const {
      property: propertyName
    } = binding;

    const value = getDefaultValue(property);

    const formDefinition = ensureExtension(element, 'kunpeng:FormDefinition', bpmnFactory);

    formDefinition.set(propertyName, value);
  }
}