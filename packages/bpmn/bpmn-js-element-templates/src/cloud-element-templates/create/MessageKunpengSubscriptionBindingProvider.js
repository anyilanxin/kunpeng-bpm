import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';

import {
  ensureExtension,
  shouldUpdate
} from '../CreateHelper';
import { getDefaultValue, getTemplateId } from '../Helper';

export class MessageKunpengSubscriptionBindingProvider {
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

    const subscription = ensureExtension(message, 'kunpeng:Subscription', bpmnFactory);

    if (!shouldUpdate(value, property)) {
      return;
    }

    subscription.set(name, value);
  }
}
