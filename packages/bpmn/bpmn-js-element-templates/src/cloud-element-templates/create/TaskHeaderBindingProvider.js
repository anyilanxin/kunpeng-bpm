import {
  createTaskHeader,
  ensureExtension
} from '../CreateHelper';
import { getDefaultValue } from '../Helper';


export default class TaskHeaderBindingProvider {
  static create(element, options) {
    const {
      property,
      bpmnFactory
    } = options;

    const {
      binding
    } = property;

    const value = getDefaultValue(property);

    const additionDynamics = ensureExtension(element, 'kunpeng:additionDynamics', bpmnFactory);

    const header = createTaskHeader(binding, value, bpmnFactory);
    header.$parent = additionDynamics;
    additionDynamics.get('values').push(header);
  }
}