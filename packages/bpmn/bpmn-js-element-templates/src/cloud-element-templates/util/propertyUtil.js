import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import {
  isString,
  isUndefined
} from 'min-dash';

import {
  EXTENSION_BINDING_TYPES,
  IO_BINDING_TYPES,
  MESSAGE_BINDING_TYPES,
  MESSAGE_PROPERTY_TYPE,
  MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE,
  PROPERTY_BINDING_TYPES,
  SIGNAL_PROPERTY_TYPE,
  TIMER_EVENT_DEFINITION_PROPERTY_TYPE,
  TASK_DEFINITION_TYPES,
  KUNPENG_TASK_DEFINITION_TYPE_TYPE,
  KUNPENG_TASK_DEFINITION,
  KUNNG_INPUT_TYPE,
  KUNPENG_OUTPUT_TYPE,
  KUNPENG_PROPERTY_TYPE,
  KUNPENG_TASK_HEADER_TYPE,
  KUNPENG_CALLED_ELEMENT,
  KUNPENG_LINKED_RESOURCE_PROPERTY,
  KUNPENG_USER_TASK,
  KUNPENG_CALLED_DECISION,
  KUNPENG_FORM_DEFINITION,
  KUNPENG_SCRIPT_TASK,
  KUNPENG_ASSIGNMENT_DEFINITION,
  KUNPENG_PRIORITY_DEFINITION,
  KUNPENG_AD_HOC,
  KUNPENG_TASK_SCHEDULE
} from './bindingTypes';

import {
  getTaskDefinitionPropertyName
} from './taskDefinition';

import {
  findExtension,
  findTaskHeader,
  findInputParameter,
  findMessage,
  findOutputParameter,
  findSignal,
  findTimerEventDefinition,
  findKunpengProperty,
  getTemplateId
} from '../Helper';

import {
  createInputParameter,
  createOutputParameter,
  createTaskDefinition,
  createTaskHeader,
  createKunpengProperty,
  shouldUpdate
} from '../CreateHelper';

import { createElement } from '../../utils/ElementUtil';
import { getExpressionValue, isExpression, createExpression } from './bpmnExpressionUtil';

{ /* Required to break up imports, see https://github.com/babel/babel/issues/15156 */ }

const EXPRESSION_TYPES = [
  'bpmn:Expression',
  'bpmn:FormalExpression'
];

export function getPropertyValue(element, property) {
  const rawValue = getRawPropertyValue(element, property);

  const { type } = property;

  if (type === 'Boolean') {
    return getBooleanPropertyValue(rawValue);
  }

  return rawValue;
}

function getRawPropertyValue(element, property) {
  let businessObject = getBusinessObject(element);

  const defaultValue = '';

  const {
    binding
  } = property;

  const {
    name,
    property: bindingProperty,
    type,
    linkName
  } = binding;

  // property
  if (type === 'property') {
    const value = isExpression(element, name) ? getExpressionValue(element, name) : businessObject.get(name);

    if (!isUndefined(value)) {
      return value;
    }

    return defaultValue;
  }

  // kunpeng:taskDefinition
  if (TASK_DEFINITION_TYPES.includes(type)) {

    const taskDefinition = findExtension(businessObject, 'kunpeng:TaskDefinition');

    if (taskDefinition) {
      if (type === KUNPENG_TASK_DEFINITION_TYPE_TYPE) {
        return taskDefinition.get('type');
      } else if (type === KUNPENG_TASK_DEFINITION) {
        return taskDefinition.get(bindingProperty);
      }
    }

    return defaultValue;
  }

  if (IO_BINDING_TYPES.includes(type)) {
    const ioMapping = findExtension(businessObject, 'kunpeng:IoMapping');

    if (!ioMapping) {
      return defaultValue;
    }

    // kunpeng:Input
    if (type === KUNNG_INPUT_TYPE) {
      const inputParameter = findInputParameter(ioMapping, binding);

      if (inputParameter) {
        return inputParameter.get('source');
      }

      return defaultValue;
    }

    // kunpeng:Output
    if (type === KUNPENG_OUTPUT_TYPE) {
      const outputParameter = findOutputParameter(ioMapping, binding);

      if (outputParameter) {
        return outputParameter.get('target');
      }

      return defaultValue;
    }
  }

  // kunpeng:additionDynamics
  if (type === KUNPENG_TASK_HEADER_TYPE) {
    const additionDynamics = findExtension(businessObject, 'kunpeng:additionDynamics');

    if (!additionDynamics) {
      return defaultValue;
    }

    const header = findTaskHeader(additionDynamics, binding);

    if (header) {
      return header.get('value');
    }

    return defaultValue;
  }

  // kunpeng:Property
  if (type === KUNPENG_PROPERTY_TYPE) {
    const KUNPENGProperties = findExtension(businessObject, 'kunpeng:Properties');

    if (KUNPENGProperties) {
      const KUNPENGProperty = findKunpengProperty(KUNPENGProperties, binding);

      if (KUNPENGProperty) {
        return KUNPENGProperty.get('value');
      }
    }

    return defaultValue;
  }

  // bpmn:Message#property
  if (type === MESSAGE_PROPERTY_TYPE) {
    const message = findMessage(businessObject);

    const value = message ? message.get(name) : undefined;

    if (!isUndefined(value)) {
      return value;
    }

    return defaultValue;
  }

  // bpmn:Message#kunpeng:subscription#property
  if (type === MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE) {
    const message = findMessage(businessObject);

    if (message) {
      const subscription = findExtension(message, 'kunpeng:Subscription');

      const value = subscription ? subscription.get(name) : undefined;

      if (!isUndefined(value)) {
        return subscription.get(name);
      }
    }

    return defaultValue;
  }

  // bpmn:Signal#property
  if (type === SIGNAL_PROPERTY_TYPE) {
    const signal = findSignal(businessObject);

    const value = signal ? signal.get(name) : undefined;

    if (!isUndefined(value)) {
      return value;
    }

    return defaultValue;
  }

  // bpmn:TimerEventDefinition#property
  if (type === TIMER_EVENT_DEFINITION_PROPERTY_TYPE) {
    const timerEventDefinition = findTimerEventDefinition(businessObject);

    if (!timerEventDefinition) {
      return defaultValue;
    }

    const expression = timerEventDefinition.get(name);

    if (expression) {
      return expression.get('body');
    }

    return defaultValue;
  }

  // kunpeng:calledElement
  if (type === KUNPENG_CALLED_ELEMENT) {
    const calledElement = findExtension(businessObject, 'kunpeng:CalledElement');

    return calledElement ? calledElement.get(bindingProperty) : defaultValue;
  }

  if (type === KUNPENG_LINKED_RESOURCE_PROPERTY) {
    const linkedResources = findExtension(businessObject, 'kunpeng:LinkedResources');

    if (!linkedResources) {
      return defaultValue;
    }

    const linkedResource = linkedResources.get('values').find((value) => value.get('linkName') === linkName);

    return linkedResource ? linkedResource.get(bindingProperty) : defaultValue;
  }

  // kunpeng:userTask
  if (type === KUNPENG_USER_TASK) {
    const userTask = findExtension(businessObject, 'kunpeng:userTask');

    return userTask ? userTask.get(bindingProperty) : defaultValue;
  }

  // kunpeng:calledDecision
  if (type === KUNPENG_CALLED_DECISION) {

    const calledDecision = findExtension(businessObject, 'kunpeng:CalledDecision');

    return calledDecision ? calledDecision.get(bindingProperty) : defaultValue;
  }

  // kunpeng:formDefinition
  if (type === KUNPENG_FORM_DEFINITION) {
    const formDefinition = findExtension(businessObject, 'kunpeng:FormDefinition');

    return formDefinition ? formDefinition.get(bindingProperty) : defaultValue;
  }

  // kunpeng:script
  if (type === KUNPENG_SCRIPT_TASK) {

    const scriptTask = findExtension(businessObject, 'kunpeng:Script');

    return scriptTask ? scriptTask.get(bindingProperty) : defaultValue;
  }

  if (type === KUNPENG_ASSIGNMENT_DEFINITION) {
    const assignmentDefinition = findExtension(businessObject, 'kunpeng:AssignmentDefinition');

    return assignmentDefinition ? assignmentDefinition.get(bindingProperty) : defaultValue;
  }

  if (type === KUNPENG_TASK_SCHEDULE) {
    const taskSchedule = findExtension(businessObject, 'kunpeng:TaskSchedule');

    return taskSchedule ? taskSchedule.get(bindingProperty) : defaultValue;
  }

  if (type === KUNPENG_PRIORITY_DEFINITION) {
    const priorityDefinition = findExtension(businessObject, 'kunpeng:PriorityDefinition');

    return priorityDefinition ? priorityDefinition.get(bindingProperty) : defaultValue;
  }

  if (type === KUNPENG_AD_HOC) {
    const adHoc = findExtension(businessObject, 'kunpeng:AdHoc');
    return adHoc ? adHoc.get(bindingProperty) : defaultValue;
  }

  // should never throw as templates are validated beforehand
  throw unknownBindingError(element, property);
}

/**
 * Cast a string value to a boolean if possible. Otherwise return the value.
 * Cannot always cast due to FEEL expressions.
 *
 * @param {string|boolean} value
 */
function getBooleanPropertyValue(value) {
  switch (value) {
  case 'true':
    return true;
  case 'false':
    return false;
  }

  return value;
}

const NO_OP = null;

export function setPropertyValue(bpmnFactory, commandStack, element, property, value) {
  let businessObject = getBusinessObject(element);

  const {
    binding,
  } = property;

  const {
    name,
    type,
    property: bindingProperty,
    linkName
  } = binding;

  let extensionElements;

  let propertyValue;

  const commands = [];

  const context = {
    element,
    property
  };

  // ensure message exists
  if (MESSAGE_BINDING_TYPES.includes(type)) {
    if (is(businessObject, 'bpmn:Event')) {
      businessObject = businessObject.get('eventDefinitions')[0];
    }

    let message = findMessage(businessObject);

    if (!message) {
      message = bpmnFactory.create('bpmn:Message', { 'kunpeng:modelerTemplate': getTemplateId(element) });

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: businessObject,
          properties: { messageRef: message }
        }
      });
    }

    businessObject = message;
  }

  // ensure signal exists
  if (type === SIGNAL_PROPERTY_TYPE) {
    if (is(businessObject, 'bpmn:Event')) {
      businessObject = businessObject.get('eventDefinitions')[0];
    }

    let signal = findSignal(businessObject);

    if (!signal) {
      signal = bpmnFactory.create('bpmn:Signal', { 'kunpeng:modelerTemplate': getTemplateId(element) });

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: businessObject,
          properties: { signalRef: signal }
        }
      });
    }

    businessObject = signal;
  }

  // handle timer event definition property
  if (type === TIMER_EVENT_DEFINITION_PROPERTY_TYPE) {
    const timerEventDefinition = findTimerEventDefinition(businessObject);

    if (!timerEventDefinition) {
      throw new Error('cannot set timer property on element without TimerEventDefinition');
    }

    let expression = timerEventDefinition.get(name);

    if (!expression) {
      expression = bpmnFactory.create('bpmn:FormalExpression', { body: value || '' });
      expression.$parent = timerEventDefinition;

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: timerEventDefinition,
          properties: { [name]: expression }
        }
      });
    } else {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: expression,
          properties: { body: value || '' }
        }
      });
    }
  }

  // ensure extension elements
  if (EXTENSION_BINDING_TYPES.includes(type)) {
    extensionElements = businessObject.get('extensionElements');

    if (!extensionElements) {
      extensionElements = createElement('bpmn:ExtensionElements', null, businessObject, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: businessObject,
          properties: { extensionElements }
        }
      });
    } else {
      commands.push(NO_OP);
    }
  }

  // property
  if (PROPERTY_BINDING_TYPES.includes(type)) {

    const propertyType = businessObject.$descriptor.propertiesByName[ name ]?.type;
    let propertyName = name;

    if (!propertyType || propertyType === 'String') {

      // make sure we create and don't remove the property
      propertyValue = value || '';
    } else if (propertyType === 'Boolean') {
      propertyValue = !!value;
    } else if (propertyType === 'Integer') {
      propertyValue = parseInt(value, 10);

      if (isNaN(propertyValue)) {

        // do not set NaN value
        propertyValue = undefined;
      }
    } else if (EXPRESSION_TYPES.includes(propertyType)) {
      const existingExpression = businessObject.get(name);

      if (existingExpression && is(existingExpression, 'bpmn:FormalExpression')) {

        // re-use existing expression
        businessObject = existingExpression;
        propertyName = 'body';
        propertyValue = value || '';
      } else {
        propertyValue = createExpression(value, businessObject, bpmnFactory);
      }
    } else {

      // unsupported non-primitive types cannot be set
      throw new Error(`cannot set property of type <${ propertyType }>`);
    }

    if (!isUndefined(propertyValue)) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: businessObject,
          properties: { [ propertyName ]: propertyValue }
        }
      });
    } else {
      commands.push(NO_OP);
    }
  }

  // kunpeng:taskDefinition
  if (TASK_DEFINITION_TYPES.includes(type)) {
    const oldTaskDefinition = findExtension(extensionElements, 'kunpeng:TaskDefinition'),
          propertyName = getTaskDefinitionPropertyName(binding),
          properties = {
            [ propertyName ]: value || ''
          };

    if (oldTaskDefinition) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          properties,
          moddleElement: oldTaskDefinition
        }
      });
    } else {
      const newTaskDefinition = createTaskDefinition(properties, bpmnFactory);
      newTaskDefinition.$parent = businessObject;

      const values = extensionElements.get('values');

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...values, newTaskDefinition ] }
        }
      });
    }
  }

  if (IO_BINDING_TYPES.includes(type)) {
    let ioMapping = findExtension(extensionElements, 'kunpeng:IoMapping');

    if (!ioMapping) {
      ioMapping = createElement('kunpeng:IoMapping', null, businessObject, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), ioMapping ] }
        }
      });
    }

    // kunpeng:Input
    if (type === KUNNG_INPUT_TYPE) {
      const oldKunpengInputParameter = findInputParameter(ioMapping, binding);
      const values = ioMapping.get('inputParameters').filter((value) => value !== oldKunpengInputParameter);

      // do not persist empty parameters when configured as <optional>
      if (shouldUpdate(value, property)) {
        const newKunpengInputParameter = createInputParameter(binding, value, bpmnFactory);
        values.push(newKunpengInputParameter);
      }

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: ioMapping,
          properties: { inputParameters: [ ...values ] }
        }
      });
    }

    // kunpeng:Output
    if (type === KUNPENG_OUTPUT_TYPE) {
      const oldKunpengOutputParameter = findOutputParameter(ioMapping, binding);
      const values = ioMapping.get('outputParameters').filter((value) => value !== oldKunpengOutputParameter);

      // do not persist empty parameters when configured as <optional>
      if (shouldUpdate(value, property)) {
        const newKunpengOutputParameter = createOutputParameter(binding, value, bpmnFactory);
        values.push(newKunpengOutputParameter);
      }

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: ioMapping,
          properties: { 'outputParameters': [ ...values ] }
        }
      });
    }
  }

  // kunpeng:additionDynamics
  if (type === KUNPENG_TASK_HEADER_TYPE) {
    let additionDynamics = findExtension(extensionElements, 'kunpeng:additionDynamics');

    if (!additionDynamics) {
      additionDynamics = createElement('kunpeng:additionDynamics', null, businessObject, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), additionDynamics ] }
        }
      });
    }

    const oldTaskHeader = findTaskHeader(additionDynamics, binding);

    const values = additionDynamics.get('values').filter((value) => value !== oldTaskHeader);

    // do not persist task headers with empty value
    if (!value) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: additionDynamics,
          properties: { values }
        }
      });
    } else {
      const newTaskHeader = createTaskHeader(binding, value, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: additionDynamics,
          properties: { values: [ ...values, newTaskHeader ] }
        }
      });
    }
  }

  // kunpeng:Property
  if (type === KUNPENG_PROPERTY_TYPE) {
    let KUNPENGProperties = findExtension(extensionElements, 'kunpeng:Properties');

    if (!KUNPENGProperties) {
      KUNPENGProperties = createElement('kunpeng:Properties', null, businessObject, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [ ...extensionElements.get('values'), KUNPENGProperties ]
          }
        }
      });
    }

    const oldKunpengProperty = findKunpengProperty(KUNPENGProperties, binding);

    const properties = KUNPENGProperties.get('properties').filter((property) => property !== oldKunpengProperty);

    if (shouldUpdate(value, property)) {
      const newKunpengProperty = createKunpengProperty(binding, value, bpmnFactory);

      properties.push(newKunpengProperty);
    }

    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: KUNPENGProperties,
        properties: {
          properties
        }
      }
    });
  }

  // bpmn:Message#kunpeng:subscription#property
  if (type === MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE) {
    let subscription = findExtension(extensionElements, 'kunpeng:Subscription');
    const properties = {
      [ name ]: value || ''
    };

    if (subscription) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          properties,
          moddleElement: subscription
        }
      });
    } else {
      subscription = createElement('kunpeng:Subscription', properties, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), subscription ] }
        }
      });
    }
  }

  // kunpeng:calledElement
  if (type === KUNPENG_CALLED_ELEMENT) {
    let calledElement = findExtension(element, 'kunpeng:CalledElement');
    const propertyName = binding.property;

    const properties = {
      [ propertyName ]: value || ''
    };

    if (calledElement) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          properties,
          moddleElement: calledElement
        }
      });
    } else {
      calledElement = createElement('kunpeng:CalledElement', properties, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), calledElement ] }
        }
      });
    }
  }

  // kunpeng:linkedResource
  if (type === KUNPENG_LINKED_RESOURCE_PROPERTY) {
    let linkedResources = findExtension(businessObject, 'kunpeng:LinkedResources');

    if (!linkedResources) {
      linkedResources = createElement('kunpeng:LinkedResources', null, businessObject, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), linkedResources ] }
        }
      });
    }

    let linkedResource = linkedResources.get('values').find((value) => value.get('linkName') === linkName);

    if (!linkedResource) {
      linkedResource = createElement('kunpeng:LinkedResource', { linkName }, businessObject, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: linkedResources,
          properties: { values: [ ...linkedResources.get('values'), linkedResource ] }
        }
      });
    }

    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        ...context,
        moddleElement: linkedResource,
        properties: { [ bindingProperty ]: value }
      }
    });
  }

  // kunpeng:calledDecision
  if (type === KUNPENG_CALLED_DECISION) {
    let calledDecision = findExtension(element, 'kunpeng:CalledDecision');
    const propertyName = binding.property;

    const properties = {
      [ propertyName ]: value || ''
    };

    if (calledDecision) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          properties,
          moddleElement: calledDecision
        }
      });
    } else {
      calledDecision = createElement('kunpeng:CalledDecision', properties, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), calledDecision ] }
        }
      });
    }
  }

  // kunpeng:script
  if (type === KUNPENG_SCRIPT_TASK) {
    let scriptTask = findExtension(element, 'kunpeng:Script');
    const propertyName = binding.property;

    const properties = {
      [ propertyName ]: value || ''
    };

    if (scriptTask) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          properties,
          moddleElement: scriptTask
        }
      });
    } else {
      scriptTask = createElement('kunpeng:Script', properties, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), scriptTask ] }
        }
      });
    }
  }

  // kunpeng:formDefinition
  if (type === KUNPENG_FORM_DEFINITION) {
    let formDefinition = findExtension(element, 'kunpeng:FormDefinition');
    const propertyName = binding.property;

    const properties = {
      [ propertyName ]: value || ''
    };

    if (formDefinition) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          properties,
          moddleElement: formDefinition
        }
      });
    } else {
      formDefinition = createElement('kunpeng:FormDefinition', properties, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), formDefinition ] }
        }
      });
    }
  }

  // kunpeng:assignmentDefinition
  if (type === KUNPENG_ASSIGNMENT_DEFINITION) {
    let assignmentDefinition = findExtension(element, 'kunpeng:AssignmentDefinition');
    const propertyName = binding.property;

    const properties = {
      [ propertyName ]: value || ''
    };

    if (assignmentDefinition) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          properties,
          moddleElement: assignmentDefinition
        }
      });
    } else {
      assignmentDefinition = createElement('kunpeng:AssignmentDefinition', properties, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), assignmentDefinition ] }
        }
      });
    }
  }

  // kunpeng:taskSchedule
  if (type === KUNPENG_TASK_SCHEDULE) {
    let taskSchedule = findExtension(element, 'kunpeng:TaskSchedule');
    const propertyName = binding.property;

    const properties = {
      [ propertyName ]: value || ''
    };

    if (taskSchedule) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          properties,
          moddleElement: taskSchedule
        }
      });
    } else {
      taskSchedule = createElement('kunpeng:TaskSchedule', properties, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), taskSchedule ] }
        }
      });
    }
  }

  // kunpeng:priorityDefinition
  if (type === KUNPENG_PRIORITY_DEFINITION) {
    let priorityDefinition = findExtension(element, 'kunpeng:PriorityDefinition');
    const propertyName = binding.property;

    const properties = {
      [ propertyName ]: value || ''
    };

    if (priorityDefinition) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          properties,
          moddleElement: priorityDefinition
        }
      });
    } else {
      priorityDefinition = createElement('kunpeng:PriorityDefinition', properties, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), priorityDefinition ] }
        }
      });
    }
  }

  // kunpeng:adHoc
  if (type === KUNPENG_AD_HOC) {
    let adHoc = findExtension(element, 'kunpeng:AdHoc');
    const propertyName = binding.property;

    const properties = {
      [ propertyName ]: value || ''
    };

    if (adHoc) {
      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          properties,
          moddleElement: adHoc
        }
      });
    } else {
      adHoc = createElement('kunpeng:AdHoc', properties, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          ...context,
          moddleElement: extensionElements,
          properties: { values: [ ...extensionElements.get('values'), adHoc ] }
        }
      });
    }
  }



  if (commands.length) {
    const commandsToExecute = commands.filter((command) => command !== NO_OP);

    commandsToExecute.length && commandStack.execute(
      'element-templates.multi-command-executor',
      commandsToExecute
    );

    return;
  }

  // should never throw as templates are validated beforehand
  throw unknownBindingError(element, property);
}


// TODO(@barmac): fix translate usage (https://github.com/bpmn-io/bpmn-js-element-templates/pull/53#issuecomment-1906203270)
export function validateProperty(value, property, translate = defaultTranslate) {
  const {
    constraints = {},
    label
  } = property;

  const {
    maxLength,
    minLength,
    notEmpty
  } = constraints;

  if (notEmpty && isEmpty(value)) {
    return `${label} ${translate('must not be empty.')}`;
  }

  if (property.feel && isFeel(value)) {
    return;
  }

  if (maxLength && (value || '').length > maxLength) {
    return `${label} ${translate('must have max length {maxLength}.', { maxLength })}`;
  }

  if (minLength && (value || '').length < minLength) {
    return `${label} ${translate('must have min length {minLength}.', { minLength })}`;
  }

  let { pattern } = constraints;

  if (pattern) {
    let message;

    if (!isString(pattern)) {
      message = pattern.message;
      pattern = pattern.value;
    }

    if (!matchesPattern(value, pattern)) {
      if (message) {
        return `${label} ${translate(message)}`;
      }

      return `${label} ${translate('must match pattern {pattern}.', { pattern })}`;
    }
  }
}

// helpers
function unknownBindingError(element, property) {
  const businessObject = getBusinessObject(element);

  const id = businessObject.get('id');

  const { binding } = property;

  const { type } = binding;

  return new Error(`unknown binding <${ type }> for element <${ id }>, this should never happen`);
}

function isEmpty(value) {
  if (typeof value === 'string') {
    return !value.trim().length;
  }

  return value === undefined;
}

function matchesPattern(string, pattern) {
  return new RegExp(pattern).test(string);
}


function defaultTranslate(template, replacements) {

  replacements = replacements || {};

  return template.replace(/{([^}]+)}/g, function(_, key) {
    return replacements[key] || '{' + key + '}';
  });
}

function isFeel(value) {
  return isString(value) && value.trim().startsWith('=');
}
