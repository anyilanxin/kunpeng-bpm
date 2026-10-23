import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';
import { getDefaultValue, getTemplateId } from '../Helper';

export class SignalPropertyBindingProvider {
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

    let signal = businessObject.get('signalRef');

    if (!signal) {
      signal = bpmnFactory.create('bpmn:Signal', { 'kunpeng:modelerTemplate': getTemplateId(element) });
      businessObject.set('signalRef', signal);
    }

    signal.set(name, value);
  }
}
