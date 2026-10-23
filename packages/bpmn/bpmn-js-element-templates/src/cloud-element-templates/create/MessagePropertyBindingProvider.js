import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';
import { getDefaultValue, getTemplateId } from '../Helper';

export class MessagePropertyBindingProvider {
  static create(element, options) {
    const {
      bpmnFactory,
      property
    } = options;

    const {
      binding
    } = property;

    const {
      name
    } = binding;

    const value = getDefaultValue(property);

    let businessObject = getBusinessObject(element);

    if (is(businessObject, 'bpmn:Event')) {
      businessObject = businessObject.get('eventDefinitions')[0];
    }

    let message = businessObject.get('messageRef');

    if (!message) {
      message = bpmnFactory.create('bpmn:Message', { 'kunpeng:modelerTemplate': getTemplateId(element) });
      businessObject.set('messageRef', message);
    }

    message.set(name, value);
  }
}
