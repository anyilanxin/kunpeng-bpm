import {
  getBusinessObject
} from '@kunpeng-io/bpmn-js';

import { find } from 'min-dash';

import PropertyBindingProvider from './PropertyBindingProvider';
import TaskDefinitionBindingProvider from './TaskDefinitionBindingProvider';
import InputBindingProvider from './InputBindingProvider';
import OutputBindingProvider from './OutputBindingProvider';
import TaskHeaderBindingProvider from './TaskHeaderBindingProvider';
import KunpengPropertiesProvider from './KunpengPropertiesProvider';
import { MessagePropertyBindingProvider } from './MessagePropertyBindingProvider';
import { MessageKunpengSubscriptionBindingProvider } from './MessageKunpengSubscriptionBindingProvider';
import { SignalPropertyBindingProvider } from './SignalPropertyBindingProvider';
import { TimerPropertyBindingProvider } from './TimerPropertyBindingProvider';
import { CalledElementBindingProvider } from './CalledElementBindingProvider';
import LinkedResourcePropertyBindingProvider from './LinkedResourceProvider';
import { CalledDecisionBindingProvider } from './CalledDecisionBindingProvider';
import { ScriptTaskBindingProvider } from './ScriptTaskBindingProvider';
import KunpengFormDefinitionBindingProvider from './FormDefinitionBindingProvider';
import KunpengAssignmentDefinitionBindingProvider from './AssignmentDefinitionBindingProvider';
import KunpengPriorityDefinitionBindingProvider from './PriorityDefinitionBindingProvider';
import AdHocBindingProvider from './AdHocBindingProvider';
import TaskScheduleBindingProvider from './TaskScheduleBindingProvider';

import {
  MESSAGE_PROPERTY_TYPE,
  MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE,
  PROPERTY_TYPE,
  SIGNAL_PROPERTY_TYPE,
  TIMER_EVENT_DEFINITION_PROPERTY_TYPE,
  KUNPENG_TASK_DEFINITION_TYPE_TYPE,
  KUNPENG_TASK_DEFINITION,
  KUNNG_INPUT_TYPE,
  KUNPENG_OUTPUT_TYPE,
  KUNPENG_TASK_HEADER_TYPE,
  KUNNG_PROPERTY_TYPE,
  KUNPENG_CALLED_ELEMENT,
  KUNPENG_LINKED_RESOURCE_PROPERTY,
  KUNPENG_CALLED_DECISION,
  KUNPENG_FORM_DEFINITION,
  KUNPENG_SCRIPT_TASK,
  KUNPENG_ASSIGNMENT_DEFINITION,
  KUNPENG_PRIORITY_DEFINITION,
  KUNPENG_AD_HOC,
  KUNPENG_TASK_SCHEDULE
} from '../util/bindingTypes';

import { isConditionMet } from '../Condition';
import { isSubprocess } from '../../utils/ElementUtil';

export default class TemplateElementFactory {

  constructor(bpmnFactory, elementFactory) {
    this._bpmnFactory = bpmnFactory;
    this._elementFactory = elementFactory;

    this._providers = {
      [PROPERTY_TYPE]: PropertyBindingProvider,
      [KUNPENG_TASK_DEFINITION_TYPE_TYPE]: TaskDefinitionBindingProvider,
      [KUNPENG_TASK_DEFINITION]: TaskDefinitionBindingProvider,
      [KUNNG_PROPERTY_TYPE]: KunpengPropertiesProvider,
      [KUNNG_INPUT_TYPE]: InputBindingProvider,
      [KUNPENG_OUTPUT_TYPE]: OutputBindingProvider,
      [KUNPENG_TASK_HEADER_TYPE]: TaskHeaderBindingProvider,
      [MESSAGE_PROPERTY_TYPE]: MessagePropertyBindingProvider,
      [MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE]: MessageKunpengSubscriptionBindingProvider,
      [SIGNAL_PROPERTY_TYPE]: SignalPropertyBindingProvider,
      [TIMER_EVENT_DEFINITION_PROPERTY_TYPE]: TimerPropertyBindingProvider,
      [KUNPENG_CALLED_ELEMENT]: CalledElementBindingProvider,
      [KUNPENG_LINKED_RESOURCE_PROPERTY]: LinkedResourcePropertyBindingProvider,
      [KUNPENG_CALLED_DECISION]: CalledDecisionBindingProvider,
      [KUNPENG_FORM_DEFINITION]: KunpengFormDefinitionBindingProvider,
      [KUNPENG_SCRIPT_TASK]: ScriptTaskBindingProvider,
      [KUNPENG_ASSIGNMENT_DEFINITION]: KunpengAssignmentDefinitionBindingProvider,
      [KUNPENG_PRIORITY_DEFINITION]: KunpengPriorityDefinitionBindingProvider,
      [KUNPENG_AD_HOC]: AdHocBindingProvider,
      [KUNPENG_TASK_SCHEDULE]: TaskScheduleBindingProvider
    };
  }

  /**
   * Create an element based on an element template.
   *
   * @param {ElementTemplate} template
   * @returns {djs.model.Base}
   */
  create(template) {

    const {
      properties
    } = template;

    // (1) base shape
    const element = this._createShape(template);

    // (2) apply template
    this._setModelerTemplate(element, template);

    // (3) apply icon
    if (hasIcon(template)) {
      this._setModelerTemplateIcon(element, template);
    }

    // (4) apply properties
    this._applyProperties(element, properties);

    return element;
  }

  _createShape(template) {
    const {
      appliesTo,
      elementType = {}
    } = template;
    const elementFactory = this._elementFactory;

    const attrs = {
      type: elementType.value || appliesTo[0]
    };

    if (isSubprocess(attrs.type)) {
      attrs.isExpanded = true;
    }

    // apply eventDefinition
    if (elementType.eventDefinition) {
      attrs.eventDefinitionType = elementType.eventDefinition;
    }

    const element = elementFactory.createShape(attrs);

    return element;
  }

  _ensureExtensionElements(element) {
    const bpmnFactory = this._bpmnFactory;
    const businessObject = getBusinessObject(element);

    let extensionElements = businessObject.get('extensionElements');

    if (!extensionElements) {
      extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
        values: []
      });

      extensionElements.$parent = businessObject;
      businessObject.set('extensionElements', extensionElements);
    }

    return extensionElements;
  }

  _setModelerTemplate(element, template) {
    const {
      id,
      version
    } = template;

    const businessObject = getBusinessObject(element);

    businessObject.set('kunpeng:modelerTemplate', id);
    businessObject.set('kunpeng:modelerTemplateVersion', version);
  }

  _setModelerTemplateIcon(element, template) {
    const {
      icon
    } = template;

    const {
      contents
    } = icon;

    const businessObject = getBusinessObject(element);

    businessObject.set('kunpeng:modelerTemplateIcon', contents);
  }

  /**
   * Apply properties to a given element.
   *
   * @param {djs.model.Base} element
   * @param {Array<Object>} properties
   */
  _applyProperties(element, properties) {
    const processedProperties = [];

    properties.forEach(
      property => this._applyProperty(element, property, properties, processedProperties)
    );
  }

  /**
   * Apply a property and its parent properties to an element based on conditions.
   *
   * @param {djs.model.Base} element
   * @param {Object} property
   * @param {Array<Object>} properties
   * @param {Array<Object>} processedProperties
   */
  _applyProperty(element, property, properties, processedProperties) {

    // skip if already processed
    if (processedProperties.includes(property)) {
      return;
    }

    // apply dependant property first if not already applied
    const dependentProperties = findDependentProperties(property, properties);

    dependentProperties.forEach(
      property => this._applyProperty(element, property, properties, processedProperties)
    );

    // check condition and apply property if condition is met
    if (isConditionMet(element, properties, property)) {
      this._bindProperty(property, element);
    }

    processedProperties.push(property);
  }

  /**
   * Bind property to element.
   * @param {Object} property
   * @param {djs.Model.Base} element
   */
  _bindProperty(property, element) {
    const {
      binding
    } = property;

    const {
      type: bindingType
    } = binding;

    const bindingProvider = this._providers[bindingType];

    bindingProvider.create(element, {
      property,
      bpmnFactory: this._bpmnFactory
    });
  }
}

TemplateElementFactory.$inject = [ 'bpmnFactory', 'elementFactory' ];


// helper ////////////////

function hasIcon(template) {
  const {
    icon
  } = template;

  return !!(icon && icon.contents);
}

function findDependentProperties(property, properties) {

  const {
    condition
  } = property;

  if (!condition) {
    return [];
  }

  const dependentProperty = findPropertyById(properties, condition.property);

  if (dependentProperty) {
    return [ dependentProperty ];
  }

  return [];
}

function findPropertyById(properties, id) {
  return find(properties, function(property) {
    return property.id === id;
  });
}
