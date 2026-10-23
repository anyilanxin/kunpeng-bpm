import {
  ensureExtension,
} from '../CreateHelper';

export default class KunpengUserTaskBindingProvider {
  static create(element, options) {
    const {
      bpmnFactory
    } = options;

    ensureExtension(element, 'kunpeng:UserTask', bpmnFactory);
  }
}