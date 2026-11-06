import { getBusinessObject, is } from '@kunpeng-io/bpmn-js';

import {
  findExtension,
  findMessage,
  findSignal,
  findTimerEventDefinition,
  getDefaultFixedValue,
  getDefaultValue,
  getTemplateVersion,
  getTemplateId,
  getTemplateIcon,
} from '../Helper';

import {
  createInputParameter,
  createOutputParameter,
  createTaskHeader,
  createKunpengProperty,
  shouldUpdate,
} from '../CreateHelper';

import { find, without } from 'min-dash';

import {
  MESSAGE_BINDING_TYPES,
  MESSAGE_PROPERTY_TYPE,
  MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE,
  SIGNAL_PROPERTY_TYPE,
  TIMER_EVENT_DEFINITION_PROPERTY_TYPE,
  TASK_DEFINITION_TYPES,
  KUNPENG_CALLED_DECISION,
  KUNPENG_CALLED_ELEMENT,
  KUNPENG_LINKED_RESOURCE_PROPERTY,
  KUNPENG_SCRIPT_TASK,
  KUNPENG_FORM_DEFINITION,
  KUNPENG_ASSIGNMENT_DEFINITION,
  KUNPENG_PRIORITY_DEFINITION,
  KUNPENG_AD_HOC,
  KUNPENG_TASK_SCHEDULE,
} from '../util/bindingTypes';

import { getTaskDefinitionPropertyName } from '../util/taskDefinition';

import { createElement, getRoot } from '../../utils/ElementUtil';
import { removeMessage, removeSignal } from '../util/rootElementUtil';
import { isExpression, createExpression } from '../util/bpmnExpressionUtil';

/**
 * @typedef {import('@kunpeng-io/bpmn-js/lib/model/Types').Element} Element
 */

/**
 * Applies an element template to an element. Sets `kunpeng:modelerTemplate` and
 * `kunpeng:modelerTemplateVersion`.
 */
export default class ChangeElementTemplateHandler {
  constructor(
    bpmnFactory,
    bpmnReplace,
    commandStack,
    modeling,
    moddleCopy,
    injector,
  ) {
    this._bpmnFactory = bpmnFactory;
    this._bpmnReplace = bpmnReplace;

    this._modeling = modeling;
    this._moddleCopy = moddleCopy;
    this._commandStack = commandStack;

    this._injector = injector;
  }

  /**
   * Change element template. If new template is specified, apply it. If old
   * template is specified, too, update from old to new. If only old template is
   * specified, remove it. Optionally, remove old template properties.
   *
   * @param {Object} context
   * @param {Element} context.element
   * @param {Object} [context.oldTemplate]
   * @param {Object} [context.newTemplate]
   * @param {boolean} [context.removeProperties=false]
   */
  preExecute(context) {
    const { newTemplate, oldTemplate, removeProperties = false } = context;

    let element = context.element;

    // update kunpeng:modelerTemplate attribute
    this._updateKunpengModelerTemplate(element, newTemplate);

    // update kunpeng:modelerTemplateIcon
    this._updateKunpengModelerTemplateIcon(element, newTemplate);

    // update element type
    element = context.element = this._updateElementType(
      element,
      oldTemplate,
      newTemplate,
    );

    if (!newTemplate && !removeProperties) {
      return;
    }

    // update properties
    this._updateProperties(element, oldTemplate, newTemplate);

    // update kunpeng:TaskDefinition
    this._updateKunpengTaskDefinition(element, oldTemplate, newTemplate);

    // update kunpeng:Input and kunpeng:Output properties
    this._updateKunpengInputOutputParameterProperties(
      element,
      oldTemplate,
      newTemplate,
    );

    // update kunpeng:Header properties
    this._updateKunpengTaskHeaderProperties(element, oldTemplate, newTemplate);

    // update kunpeng:Property properties
    this._updateKunpengPropertyProperties(element, oldTemplate, newTemplate);

    this._updateMessage(element, oldTemplate, newTemplate);

    this._updateSignal(element, oldTemplate, newTemplate);

    this._updateTimerEventDefinition(element, oldTemplate, newTemplate);

    this._updateKunpengModelerTemplateOnReferencedElement(
      element,
      oldTemplate,
      newTemplate,
    );

    this._updateCalledElement(element, oldTemplate, newTemplate);

    this._updateLinkedResources(element, oldTemplate, newTemplate);

    this._updateCalledDecision(element, oldTemplate, newTemplate);

    this._updateKunpengFormDefinition(element, oldTemplate, newTemplate);

    this._updateScriptTask(element, oldTemplate, newTemplate);

    this._updateKunpengAssignmentDefinition(element, oldTemplate, newTemplate);

    this._updateKunpengPriorityDefinition(element, oldTemplate, newTemplate);

    this._updateAdHoc(element, oldTemplate, newTemplate);

    this._updateKunpengTaskSchedule(element, oldTemplate, newTemplate);
  }

  _getOrCreateExtensionElements(
    element,
    businessObject = getBusinessObject(element),
  ) {
    const bpmnFactory = this._bpmnFactory,
      modeling = this._modeling;

    let extensionElements = businessObject.get('extensionElements');

    if (!extensionElements) {
      extensionElements = bpmnFactory.create('bpmn:ExtensionElements', {
        values: [],
      });

      extensionElements.$parent = businessObject;

      modeling.updateModdleProperties(element, businessObject, {
        extensionElements: extensionElements,
      });
    }

    return extensionElements;
  }

  /**
   * Update kunpeng:modelerTemplate property.
   *
   * @param {Element} element
   * @param {Object} [newTemplate]
   */
  _updateKunpengModelerTemplate(element, newTemplate) {
    const modeling = this._modeling;

    if (!newTemplate) {
      modeling.updateProperties(element, {
        'kunpeng:modelerTemplate': undefined,
        'kunpeng:modelerTemplateVersion': undefined,
      });

      return;
    }

    const newId = newTemplate.id;
    const newVersion = newTemplate.version;

    if (
      getTemplateId(element) !== newId ||
      getTemplateVersion(element) !== newVersion
    ) {
      modeling.updateProperties(element, {
        'kunpeng:modelerTemplate': newId,
        'kunpeng:modelerTemplateVersion': newVersion,
      });
    }
  }

  /**
   * Update kunpeng:modelerTemplateIcon property.
   *
   * @param {Element} element
   * @param {Object} [newTemplate]
   */
  _updateKunpengModelerTemplateIcon(element, newTemplate) {
    const modeling = this._modeling;

    if (!newTemplate) {
      modeling.updateProperties(element, {
        'kunpeng:modelerTemplateIcon': undefined,
      });

      return;
    }

    const newIcon = newTemplate.icon;
    const newIconContents = newIcon && newIcon.contents;

    if (getTemplateIcon(element) !== newIconContents) {
      modeling.updateProperties(element, {
        'kunpeng:modelerTemplateIcon': newIconContents,
      });
    }
  }

  /**
   * Update BPMN properties.
   *
   * @param {Element} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   *
   * @returns {Element}
   */
  _updateProperties(element, oldTemplate, newTemplate) {
    const commandStack = this._commandStack;
    const businessObject = getBusinessObject(element);

    let oldProperties = [],
      newProperties = [];

    if (oldTemplate) {
      oldProperties = oldTemplate.properties.filter((oldProperty) => {
        const oldBinding = oldProperty.binding,
          oldBindingType = oldBinding.type;

        return oldBindingType === 'property';
      });
    }

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return newBindingType === 'property';
      });
    }

    // Remove old properties
    const propertiesToRemove = oldProperties.filter((oldProperty) => {
      return !newProperties.find(
        (newProperty) => newProperty.binding.name === oldProperty.binding.name,
      );
    });

    if (propertiesToRemove.length) {
      const properties = propertiesToRemove.reduce((properties, property) => {
        properties[property.binding.name] = undefined;

        return properties;
      }, {});

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: businessObject,
        properties,
      });
    }

    if (!newProperties.length) {
      return;
    }

    // Add new or update old properties
    newProperties.forEach((newProperty) => {
      const oldProperty = findOldProperty(oldTemplate, newProperty),
        newBinding = newProperty.binding,
        newBindingName = newBinding.name,
        newPropertyValue = getDefaultValue(newProperty),
        changedElement = businessObject;

      const properties = {};

      if (shouldKeepValue(changedElement, oldProperty, newProperty)) {
        return;
      }

      let assignedValue = newPropertyValue;

      if (isExpression(businessObject, newBindingName)) {
        assignedValue = createExpression(
          newPropertyValue,
          businessObject,
          this._bpmnFactory,
        );
      }

      properties[newBindingName] = assignedValue;

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: businessObject,
        properties,
      });
    });
  }

  /**
   * Update `kunpeng:TaskDefinition` properties of specified business object. This
   * can only exist in `bpmn:ExtensionElements`.
   *
   * @param {Element} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   */
  _updateKunpengTaskDefinition(element, oldTemplate, newTemplate) {
    this._updateSingleExtensionElement(element, oldTemplate, newTemplate, {
      bindingTypes: TASK_DEFINITION_TYPES,
      extensionType: 'kunpeng:TaskDefinition',
      getPropertyName: getTaskDefinitionPropertyName,
    });
  }

  /**
   * Update `kunpeng:Input` and `kunpeng:Output` properties of specified business
   * object. Both can only exist in `kunpeng:ioMapping` which can exist in `bpmn:ExtensionElements`.
   *
   * @param {Element} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   */
  _updateKunpengInputOutputParameterProperties(
    element,
    oldTemplate,
    newTemplate,
  ) {
    const bpmnFactory = this._bpmnFactory,
      commandStack = this._commandStack;

    let newProperties = [];

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return (
          newBindingType === 'kunpeng:input' ||
          newBindingType === 'kunpeng:output'
        );
      });
    }

    const businessObject = this._getOrCreateExtensionElements(element);

    let ioMapping = findExtension(businessObject, 'kunpeng:IoMapping');

    // (1) remove old mappings if no new specified
    if (!newProperties.length) {
      if (!ioMapping) {
        return;
      }

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: businessObject,
        properties: {
          values: without(businessObject.get('values'), ioMapping),
        },
      });
    }

    if (!ioMapping) {
      ioMapping = bpmnFactory.create('kunpeng:IoMapping');

      ioMapping.$parent = businessObject;

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: businessObject,
        properties: {
          values: [...businessObject.get('values'), ioMapping],
        },
      });
    }

    const oldInputs = ioMapping.get('kunpeng:inputParameters')
      ? ioMapping.get('kunpeng:inputParameters').slice()
      : [];

    const oldOutputs = ioMapping.get('kunpeng:outputParameters')
      ? ioMapping.get('kunpeng:outputParameters').slice()
      : [];

    let propertyName;

    newProperties.forEach((newProperty) => {
      const oldProperty = findOldProperty(oldTemplate, newProperty),
        inputOrOutput = findBusinessObject(businessObject, newProperty),
        newPropertyValue = getDefaultValue(newProperty),
        newBinding = newProperty.binding,
        newBindingType = newBinding.type;

      let newInputOrOutput, properties;

      // (2) update old inputs and outputs
      if (inputOrOutput) {
        // (2a) exclude old inputs and outputs from cleanup, unless
        // a) optional and has empty value, and
        // b) not changed
        if (
          shouldUpdate(newPropertyValue, newProperty) ||
          shouldKeepValue(inputOrOutput, oldProperty, newProperty)
        ) {
          if (is(inputOrOutput, 'kunpeng:Input')) {
            remove(oldInputs, inputOrOutput);
          } else {
            remove(oldOutputs, inputOrOutput);
          }
        }

        // (2a) do updates (unless changed)
        if (!shouldKeepValue(inputOrOutput, oldProperty, newProperty)) {
          if (is(inputOrOutput, 'kunpeng:Input')) {
            properties = {
              source: newPropertyValue,
            };
          } else {
            properties = {
              target: newPropertyValue,
            };
          }

          commandStack.execute('element.updateModdleProperties', {
            element,
            moddleElement: inputOrOutput,
            properties,
          });
        }
      }

      // (3) add new inputs and outputs (unless optional)
      else if (shouldUpdate(newPropertyValue, newProperty)) {
        if (newBindingType === 'kunpeng:input') {
          propertyName = 'inputParameters';

          newInputOrOutput = createInputParameter(
            newBinding,
            newPropertyValue,
            bpmnFactory,
          );
        } else {
          propertyName = 'outputParameters';

          newInputOrOutput = createOutputParameter(
            newBinding,
            newPropertyValue,
            bpmnFactory,
          );
        }

        newInputOrOutput.$parent = ioMapping;

        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: ioMapping,
          properties: {
            [propertyName]: [...ioMapping.get(propertyName), newInputOrOutput],
          },
        });
      }
    });

    // (4) remove old inputs and outputs
    if (oldInputs.length) {
      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: ioMapping,
        properties: {
          inputParameters: without(
            ioMapping.get('inputParameters'),
            (inputParameter) => oldInputs.includes(inputParameter),
          ),
        },
      });
    }

    if (oldOutputs.length) {
      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: ioMapping,
        properties: {
          outputParameters: without(
            ioMapping.get('outputParameters'),
            (outputParameter) => oldOutputs.includes(outputParameter),
          ),
        },
      });
    }
  }

  /**
   * Update `kunpeng:Header` properties of specified business
   * object. Those can only exist in `kunpeng:additionDynamics` which can exist in `bpmn:ExtensionElements`.
   *
   * @param {Element} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   */
  _updateKunpengTaskHeaderProperties(element, oldTemplate, newTemplate) {
    const bpmnFactory = this._bpmnFactory,
      commandStack = this._commandStack;

    let newProperties = [];

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return newBindingType === 'kunpeng:taskHeader';
      });
    }

    const businessObject = this._getOrCreateExtensionElements(element);

    let additionDynamics = findExtension(businessObject, 'kunpeng:additionDynamics');

    // (1) remove old headers if no new specified
    if (!newProperties.length) {
      if (!additionDynamics) {
        return;
      }

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: businessObject,
        properties: {
          values: without(businessObject.get('values'), additionDynamics),
        },
      });
    }

    if (!additionDynamics) {
      additionDynamics = bpmnFactory.create('kunpeng:additionDynamics');

      additionDynamics.$parent = businessObject;

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: businessObject,
        properties: {
          values: [...businessObject.get('values'), additionDynamics],
        },
      });
    }

    const oldHeaders = additionDynamics.get('kunpeng:values')
      ? additionDynamics.get('kunpeng:values').slice()
      : [];

    newProperties.forEach((newProperty) => {
      const oldProperty = findOldProperty(oldTemplate, newProperty),
        oldHeader = findBusinessObject(businessObject, newProperty),
        newPropertyValue = getDefaultValue(newProperty),
        newBinding = newProperty.binding;

      // (2) update old headers
      if (oldHeader) {
        if (!shouldKeepValue(oldHeader, oldProperty, newProperty)) {
          const properties = {
            value: newPropertyValue,
          };

          commandStack.execute('element.updateModdleProperties', {
            element,
            moddleElement: oldHeader,
            properties,
          });
        }

        remove(oldHeaders, oldHeader);
      }

      // (3) add new (non-empty) headers
      else if (newPropertyValue) {
        const newHeader = createTaskHeader(
          newBinding,
          newPropertyValue,
          bpmnFactory,
        );

        newHeader.$parent = additionDynamics;

        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: additionDynamics,
          properties: {
            values: [...additionDynamics.get('values'), newHeader],
          },
        });
      }
    });

    // (4) remove old headers
    if (oldHeaders.length) {
      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: additionDynamics,
        properties: {
          values: without(additionDynamics.get('values'), (header) =>
            oldHeaders.includes(header),
          ),
        },
      });
    }
  }

  /**
   * Update kunpeng:Property properties of kunpeng:Properties extension element.
   *
   * @param {Element} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   */
  _updateKunpengPropertyProperties(element, oldTemplate, newTemplate) {
    const bpmnFactory = this._bpmnFactory,
      commandStack = this._commandStack;

    let newProperties = [];

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return newBindingType === 'kunpeng:property';
      });
    }

    const businessObject = this._getOrCreateExtensionElements(element);

    let zeebeProperties = findExtension(businessObject, 'kunpeng:Properties');

    // (1) remove old kunpeng:Properties if no new kunpeng:Property properties
    if (!newProperties.length) {
      if (!zeebeProperties) {
        return;
      }

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: businessObject,
        properties: {
          values: without(businessObject.get('values'), zeebeProperties),
        },
      });
    }

    if (!zeebeProperties) {
      zeebeProperties = bpmnFactory.create('kunpeng:Properties');

      zeebeProperties.$parent = businessObject;

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: businessObject,
        properties: {
          values: [...businessObject.get('values'), zeebeProperties],
        },
      });
    }

    const oldKunpengProperties = zeebeProperties.get('properties')
      ? zeebeProperties.get('properties').slice()
      : [];

    newProperties.forEach((newProperty) => {
      const oldProperty = findOldProperty(oldTemplate, newProperty),
        oldKunpengProperty = findBusinessObject(businessObject, newProperty),
        newPropertyValue = getDefaultValue(newProperty),
        newBinding = newProperty.binding;

      // (2) update old kunpeng:Property
      if (oldKunpengProperty) {
        if (
          shouldUpdate(newPropertyValue, newProperty) ||
          shouldKeepValue(oldKunpengProperty, oldProperty, newProperty)
        ) {
          remove(oldKunpengProperties, oldKunpengProperty);
        }

        if (!shouldKeepValue(oldKunpengProperty, oldProperty, newProperty)) {
          commandStack.execute('element.updateModdleProperties', {
            element,
            moddleElement: oldKunpengProperty,
            properties: {
              value: newPropertyValue,
            },
          });
        }
      }

      // (3) add new kunpeng:Property
      else if (shouldUpdate(newPropertyValue, newProperty)) {
        const newProperty = createKunpengProperty(
          newBinding,
          newPropertyValue,
          bpmnFactory,
        );

        newProperty.$parent = zeebeProperties;

        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: zeebeProperties,
          properties: {
            properties: [...zeebeProperties.get('properties'), newProperty],
          },
        });
      }
    });

    // (4) remove old kunpeng:Property
    if (oldKunpengProperties.length) {
      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: zeebeProperties,
        properties: {
          properties: without(
            zeebeProperties.get('properties'),
            (zeebeProperty) => oldKunpengProperties.includes(zeebeProperty),
          ),
        },
      });
    }
  }

  _updateMessage(element, oldTemplate, newTemplate) {
    // update bpmn:Message properties
    this._updateMessageProperties(element, oldTemplate, newTemplate);

    // update bpmn:Message kunpeng:subscription properties
    this._updateMessageKunpengSubscriptionProperties(
      element,
      oldTemplate,
      newTemplate,
    );

    if (!newTemplate || !hasMessageProperties(newTemplate)) {
      removeMessage(element, this._injector);
    }
  }

  _updateSignal(element, oldTemplate, newTemplate) {
    // update bpmn:Signal properties
    this._updateSignalProperties(element, oldTemplate, newTemplate);

    if (!newTemplate || !hasSignalProperties(newTemplate)) {
      removeSignal(element, this._injector);
    }
  }

  /**
   * Update bpmn:Message properties.
   *
   * @param {Element} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   */
  _updateMessageProperties(element, oldTemplate, newTemplate) {
    let oldProperties = [],
      newProperties = [];

    if (oldTemplate) {
      oldProperties = oldTemplate.properties.filter((oldProperty) => {
        const oldBinding = oldProperty.binding,
          oldBindingType = oldBinding.type;

        return oldBindingType === MESSAGE_PROPERTY_TYPE;
      });
    }

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return newBindingType === MESSAGE_PROPERTY_TYPE;
      });
    }

    const removedProperties = oldProperties.filter((oldProperty) => {
      return !newProperties.find(
        (newProperty) => newProperty.binding.name === oldProperty.binding.name,
      );
    });

    let message = this._getMessage(element);

    message &&
      removedProperties.forEach((removedProperty) => {
        this._modeling.updateModdleProperties(element, message, {
          [removedProperty.binding.name]: undefined,
        });
      });

    if (!newProperties.length) {
      return;
    }

    message = this._ensureMessage(element, newTemplate);

    newProperties.forEach((newProperty) => {
      const oldProperty = findOldProperty(oldTemplate, newProperty),
        newBinding = newProperty.binding,
        newBindingName = newBinding.name,
        newPropertyValue = getDefaultValue(newProperty),
        changedElement = message;

      let properties = {};

      if (shouldKeepValue(changedElement, oldProperty, newProperty)) {
        return;
      }

      properties[newBindingName] = newPropertyValue;

      this._modeling.updateModdleProperties(
        element,
        changedElement,
        properties,
      );
    });
  }

  /**
   * Update bpmn:Signal properties.
   *
   * @param {djs.model.Base} element
   * @param {Object} oldTemplate
   * @param {Object} newTemplate
   */
  _updateSignalProperties(element, oldTemplate, newTemplate) {
    let oldProperties = [],
      newProperties = [];

    if (oldTemplate) {
      oldProperties = oldTemplate.properties.filter((oldProperty) => {
        const oldBinding = oldProperty.binding,
          oldBindingType = oldBinding.type;

        return oldBindingType === SIGNAL_PROPERTY_TYPE;
      });
    }

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return newBindingType === SIGNAL_PROPERTY_TYPE;
      });
    }

    const removedProperties = oldProperties.filter((oldProperty) => {
      return !newProperties.find(
        (newProperty) => newProperty.binding.name === oldProperty.binding.name,
      );
    });

    let signal = this._getSignal(element);

    signal &&
      removedProperties.forEach((removedProperty) => {
        this._modeling.updateModdleProperties(element, signal, {
          [removedProperty.binding.name]: undefined,
        });
      });

    if (!newProperties.length) {
      return;
    }

    // The template schema guarantees that if signal#property is active
    signal = this._ensureSignal(element, newTemplate);

    newProperties.forEach((newProperty) => {
      const oldProperty = findOldProperty(oldTemplate, newProperty),
        newBinding = newProperty.binding,
        newBindingName = newBinding.name,
        newPropertyValue = getDefaultValue(newProperty),
        changedElement = signal;

      let properties = {};

      if (shouldKeepValue(changedElement, oldProperty, newProperty)) {
        return;
      }

      properties[newBindingName] = newPropertyValue;

      this._modeling.updateModdleProperties(
        element,
        changedElement,
        properties,
      );
    });
  }

  /**
   * Update bpmn:TimerEventDefinition properties.
   *
   * @param {djs.model.Base} element
   * @param {Object} oldTemplate
   * @param {Object} newTemplate
   */
  _updateTimerEventDefinition(element, oldTemplate, newTemplate) {
    const commandStack = this._commandStack;

    let oldProperties = [],
      newProperties = [];

    if (oldTemplate) {
      oldProperties = oldTemplate.properties.filter((oldProperty) => {
        const oldBinding = oldProperty.binding,
          oldBindingType = oldBinding.type;

        return oldBindingType === TIMER_EVENT_DEFINITION_PROPERTY_TYPE;
      });
    }

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return newBindingType === TIMER_EVENT_DEFINITION_PROPERTY_TYPE;
      });
    }

    const removedProperties = oldProperties.filter((oldProperty) => {
      return !newProperties.find(
        (newProperty) => newProperty.binding.name === oldProperty.binding.name,
      );
    });

    const timerEventDefinition = findTimerEventDefinition(element);

    if (!timerEventDefinition) {
      return;
    }

    // Remove old timer properties that are no longer in the template
    removedProperties.forEach((removedProperty) => {
      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: timerEventDefinition,
        properties: {
          [removedProperty.binding.name]: undefined,
        },
      });
    });

    if (!newProperties.length) {
      return;
    }

    // First, check if we need to auto-convert to non-interrupting for timeCycle
    // This must happen BEFORE setting the timer property, otherwise the
    // CleanUpTimerExpressionBehavior will remove it
    const hasTimeCycle = newProperties.some(
      (p) => p.binding.name === 'timeCycle',
    );
    if (hasTimeCycle) {
      this._ensureNonInterruptingForTimeCycle(element);
    }

    // Set new timer properties
    newProperties.forEach((newProperty) => {
      const oldProperty = findOldProperty(oldTemplate, newProperty),
        newBinding = newProperty.binding,
        newBindingName = newBinding.name,
        newPropertyValue = getDefaultValue(newProperty);

      // Check if we should keep the existing value
      if (shouldKeepValue(timerEventDefinition, oldProperty, newProperty)) {
        return;
      }

      // Create or update the FormalExpression
      let expression = timerEventDefinition.get(newBindingName);

      if (!expression) {
        expression = createExpression(
          newPropertyValue,
          timerEventDefinition,
          this._bpmnFactory,
        );

        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: timerEventDefinition,
          properties: {
            // remove any existing timer values, satisfying that there is only one
            timeDate: undefined,
            timeDuration: undefined,
            timeCycle: undefined,
            [newBindingName]: expression,
          },
        });
      } else {
        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: expression,
          properties: {
            body: newPropertyValue,
          },
        });
      }
    });
  }

  /**
   * Ensure element is non-interrupting when using timeCycle.
   * - Boundary events: set cancelActivity to false
   * - Event subprocess start events: set isInterrupting to false
   *
   * @param {djs.model.Base} element
   */
  _ensureNonInterruptingForTimeCycle(element) {
    const commandStack = this._commandStack;
    const businessObject = getBusinessObject(element);

    // Boundary events with timeCycle must be non-interrupting
    if (is(element, 'bpmn:BoundaryEvent')) {
      if (businessObject.get('cancelActivity') !== false) {
        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: businessObject,
          properties: {
            cancelActivity: false,
          },
        });
      }
      return;
    }

    // Start events in event subprocess with timeCycle must be non-interrupting
    if (is(element, 'bpmn:StartEvent')) {
      const parent = businessObject.$parent;
      if (is(parent, 'bpmn:SubProcess') && parent.get('triggeredByEvent')) {
        if (businessObject.get('isInterrupting') !== false) {
          commandStack.execute('element.updateModdleProperties', {
            element,
            moddleElement: businessObject,
            properties: {
              isInterrupting: false,
            },
          });
        }
      }
    }
  }

  /**
   * Update bpmn:Message#kunpeng:subscription properties.
   *
   * @param {Element} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   */
  _updateMessageKunpengSubscriptionProperties(
    element,
    oldTemplate,
    newTemplate,
  ) {
    let oldProperties = [],
      newProperties = [];

    if (oldTemplate) {
      oldProperties = oldTemplate.properties.filter((oldProperty) => {
        const oldBinding = oldProperty.binding,
          oldBindingType = oldBinding.type;

        return oldBindingType === MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE;
      });
    }

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return newBindingType === MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE;
      });
    }

    const removedProperties = oldProperties.filter((oldProperty) => {
      return !newProperties.find(
        (newProperty) => newProperty.binding.name === oldProperty.binding.name,
      );
    });

    if (!newProperties.length && !removedProperties.length) {
      return;
    }

    let message = this._getMessage(element);

    if (!newProperties.length && !message) {
      return;
    }

    message = this._ensureMessage(element, newTemplate);

    const messageExtensionElements = this._getOrCreateExtensionElements(
      element,
      message,
    );
    const zeebeSubscription = this._getSubscription(element, message);

    const propertiesToSet = newProperties.reduce((properties, newProperty) => {
      const oldProperty = findOldProperty(oldTemplate, newProperty),
        newBinding = newProperty.binding,
        newBindingName = newBinding.name,
        newPropertyValue = getDefaultValue(newProperty),
        changedElement = zeebeSubscription;

      if (shouldKeepValue(changedElement, oldProperty, newProperty)) {
        return properties;
      }

      properties[newBindingName] = newPropertyValue;
      return properties;
    }, {});

    // Update zeebe Subscription
    if (zeebeSubscription) {
      this._modeling.updateModdleProperties(
        element,
        zeebeSubscription,
        propertiesToSet,
      );
    } else {
      // create new Subscription
      const newSubscription = createElement(
        'kunpeng:Subscription',
        propertiesToSet,
        message,
        this._bpmnFactory,
      );
      this._modeling.updateModdleProperties(element, messageExtensionElements, {
        values: [...messageExtensionElements.get('values'), newSubscription],
      });
    }

    // Remove old properties
    if (!oldTemplate || !zeebeSubscription) {
      return;
    }

    const propertiesToRemove = removedProperties.reduce(
      (properties, removedProperty) => {
        properties[removedProperty.binding.name] = undefined;
        return properties;
      },
      {},
    );

    this._modeling.updateModdleProperties(
      element,
      zeebeSubscription,
      propertiesToRemove,
    );
  }

  _updateKunpengModelerTemplateOnReferencedElement(
    element,
    oldTemplate,
    newTemplate,
  ) {
    const businessObject = getBusinessObject(element);

    const referencedElement =
      findMessage(businessObject) || findSignal(businessObject);

    if (
      referencedElement &&
      newTemplate &&
      getTemplateId(referencedElement) !== newTemplate.id
    ) {
      this._modeling.updateModdleProperties(element, referencedElement, {
        'kunpeng:modelerTemplate': newTemplate.id,
      });
    }
  }

  _getSubscription(element, bo) {
    const extensionElements = this._getOrCreateExtensionElements(element, bo);

    const extension = findExtension(extensionElements, 'kunpeng:Subscription');

    if (extension) {
      return extension;
    }
  }

  _createMessage(element, template) {
    let bo = getBusinessObject(element);

    if (is(bo, 'bpmn:Event')) {
      bo = bo.get('eventDefinitions')[0];
    }

    const message = this._bpmnFactory.create('bpmn:Message', {
      'kunpeng:modelerTemplate': template.id,
    });

    message.$parent = getRoot(bo);

    this._modeling.updateModdleProperties(element, bo, { messageRef: message });

    return message;
  }

  _createSignal(element, template) {
    let bo = getBusinessObject(element);

    if (is(bo, 'bpmn:Event')) {
      bo = bo.get('eventDefinitions')[0];
    }

    const signal = this._bpmnFactory.create('bpmn:Signal', {
      'kunpeng:modelerTemplate': template.id,
    });

    signal.$parent = getRoot(bo);

    this._modeling.updateModdleProperties(element, bo, { signalRef: signal });

    return signal;
  }

  _getMessage(element) {
    let bo = getBusinessObject(element);

    if (is(bo, 'bpmn:Event')) {
      bo = bo.get('eventDefinitions')[0];
    }

    return bo && bo.get('messageRef');
  }

  _getSignal(element) {
    let bo = getBusinessObject(element);

    if (!is(bo, 'bpmn:Event')) {
      return;
    }

    const eventDefinition = bo.get('eventDefinitions')[0];

    return eventDefinition && eventDefinition.get('signalRef');
  }

  _ensureMessage(element, newTemplate) {
    const message = this._getMessage(element);

    if (!newTemplate) {
      return message;
    }

    // message is already templated, so we use it
    if (message && message.get('kunpeng:modelerTemplate')) {
      return message;
    }

    const newMessage = this._createMessage(element, newTemplate);

    // no message is set on the element, so no properties to copy
    if (!message) {
      return newMessage;
    }

    return this._moddleCopy.copyElement(message, newMessage, [
      'name',
      'extensionElements',
    ]);
  }

  _ensureSignal(element, newTemplate) {
    const signal = this._getSignal(element);

    if (!newTemplate) {
      return signal;
    }

    // signal is already templated, so we use it
    if (signal && signal.get('kunpeng:modelerTemplate')) {
      return signal;
    }

    const newSignal = this._createSignal(element, newTemplate);

    // no signal is set on the element, so no properties to copy
    if (!signal) {
      return newSignal;
    }

    return this._moddleCopy.copyElement(signal, newSignal, ['name']);
  }

  /**
   * Update `kunpeng:CalledElement` properties of specified business object. This
   * can only exist in `bpmn:ExtensionElements`.
   *
   * @param {Element} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   */
  _updateCalledElement(element, oldTemplate, newTemplate) {
    this._updateSingleExtensionElement(element, oldTemplate, newTemplate, {
      bindingTypes: [KUNPENG_CALLED_ELEMENT],
      extensionType: 'kunpeng:CalledElement',
      getPropertyName: (binding) => binding.property,
    });
  }

  /**
   * Update `kunpeng:CalledDecision` properties of specified business object. This
   * can only exist in `bpmn:ExtensionElements`.
   *
   * @param {djs.model.Base} element
   * @param {Object} oldTemplate
   * @param {Object} newTemplate
   */
  _updateCalledDecision(element, oldTemplate, newTemplate) {
    this._updateSingleExtensionElement(element, oldTemplate, newTemplate, {
      bindingTypes: [KUNPENG_CALLED_DECISION],
      extensionType: 'kunpeng:CalledDecision',
      getPropertyName: (binding) => binding.property,
    });
  }

  /**
   * Update `kunpeng:Script` properties of specified business object. This
   * can only exist in `bpmn:ExtensionElements`.
   *
   * @param {djs.model.Base} element
   * @param {Object} oldTemplate
   * @param {Object} newTemplate
   */
  _updateScriptTask(element, oldTemplate, newTemplate) {
    this._updateSingleExtensionElement(element, oldTemplate, newTemplate, {
      bindingTypes: [KUNPENG_SCRIPT_TASK],
      extensionType: 'kunpeng:Script',
      getPropertyName: (binding) => binding.property,
    });
  }

  _updateKunpengAssignmentDefinition(element, oldTemplate, newTemplate) {
    this._updateSingleExtensionElement(element, oldTemplate, newTemplate, {
      bindingTypes: [KUNPENG_ASSIGNMENT_DEFINITION],
      extensionType: 'kunpeng:AssignmentDefinition',
      getPropertyName: (binding) => binding.property,
    });
  }

  _updateKunpengPriorityDefinition(element, oldTemplate, newTemplate) {
    this._updateSingleExtensionElement(element, oldTemplate, newTemplate, {
      bindingTypes: [KUNPENG_PRIORITY_DEFINITION],
      extensionType: 'kunpeng:PriorityDefinition',
      getPropertyName: (binding) => binding.property,
    });
  }

  _updateAdHoc(element, oldTemplate, newTemplate) {
    this._updateSingleExtensionElement(element, oldTemplate, newTemplate, {
      bindingTypes: [KUNPENG_AD_HOC],
      extensionType: 'kunpeng:AdHoc',
      getPropertyName: (binding) => binding.property,
    });
  }

  _updateKunpengTaskSchedule(element, oldTemplate, newTemplate) {
    this._updateSingleExtensionElement(element, oldTemplate, newTemplate, {
      bindingTypes: [KUNPENG_TASK_SCHEDULE],
      extensionType: 'kunpeng:TaskSchedule',
      getPropertyName: (binding) => binding.property,
    });
  }

  /**
   * Replaces the element with the specified elementType.
   * Takes into account the eventDefinition for events.
   *
   * @param {djs.model.Base} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   */
  _updateElementType(element, oldTemplate, newTemplate) {
    if (!newTemplate) {
      return element;
    }

    // determine new task type
    const newType = newTemplate.elementType;

    if (!newType) {
      return element;
    }

    // Do not replace if the element type did not change
    if (!shouldUpdateElementType(element, oldTemplate, newType)) {
      return element;
    }

    const replacement = { type: newType.value };

    if (newType.eventDefinition) {
      replacement.eventDefinitionType = newType.eventDefinition;
    }

    const replacedElement = this._bpmnReplace.replaceElement(
      element,
      replacement,
    );

    return replacedElement;
  }

  _updateLinkedResources(element, oldTemplate, newTemplate) {
    const bpmnFactory = this._bpmnFactory,
      commandStack = this._commandStack;

    let oldProperties = [],
      newProperties = [];

    if (oldTemplate) {
      oldProperties = oldTemplate.properties.filter((oldProperty) => {
        const oldBinding = oldProperty.binding,
          oldBindingType = oldBinding.type;

        return oldBindingType === KUNPENG_LINKED_RESOURCE_PROPERTY;
      });
    }

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return newBindingType === KUNPENG_LINKED_RESOURCE_PROPERTY;
      });
    }

    const extensionElements = this._getOrCreateExtensionElements(element);

    let linkedResources = findExtension(
      extensionElements,
      'kunpeng:LinkedResources',
    );

    // (1) remove properties if no new specified
    if (!newProperties.length) {
      if (!linkedResources) {
        return;
      }

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: extensionElements,
        properties: {
          values: without(extensionElements.get('values'), linkedResources),
        },
      });
      return;
    }

    if (!linkedResources) {
      linkedResources = bpmnFactory.create('kunpeng:LinkedResources');

      linkedResources.$parent = extensionElements;

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: extensionElements,
        properties: {
          values: [...extensionElements.get('values'), linkedResources],
        },
      });
    }

    const unusedLinkedResources = linkedResources.get('values').slice();
    const propertiesToRemove = oldProperties.slice();

    newProperties.forEach((newLinkedResource) => {
      const oldProperty = findOldProperty(oldTemplate, newLinkedResource),
        oldLinkedResource = findBusinessObject(
          extensionElements,
          newLinkedResource,
        ),
        newPropertyValue = getDefaultValue(newLinkedResource),
        newBinding = newLinkedResource.binding;

      if (oldProperty) {
        remove(propertiesToRemove, oldProperty);
      }

      // (2) update old LinkedResources
      if (oldLinkedResource) {
        if (
          shouldUpdate(newPropertyValue, newLinkedResource) ||
          shouldKeepValue(oldLinkedResource, oldProperty, newLinkedResource)
        ) {
          remove(unusedLinkedResources, oldLinkedResource);
        }

        if (
          !shouldKeepValue(oldLinkedResource, oldProperty, newLinkedResource)
        ) {
          commandStack.execute('element.updateModdleProperties', {
            element,
            moddleElement: oldLinkedResource,
            properties: {
              [newBinding.property]: newPropertyValue,
            },
          });
        }
      }

      // (3) add new linkedResources
      else if (shouldUpdate(newPropertyValue, newLinkedResource)) {
        const newProperties = {
          linkName: newBinding.linkName,
          [newBinding.property]: newPropertyValue,
        };

        const newLinkedResource = createElement(
          'kunpeng:LinkedResource',
          newProperties,
          extensionElements,
          bpmnFactory,
        );

        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: linkedResources,
          properties: {
            values: [...linkedResources.get('values'), newLinkedResource],
          },
        });
      }
    });

    // (4) remove unused linkedResources
    if (unusedLinkedResources.length) {
      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: linkedResources,
        properties: {
          values: without(linkedResources.get('values'), (linkedResource) =>
            unusedLinkedResources.includes(linkedResource),
          ),
        },
      });
    }

    // (5) remove unused resource properties
    propertiesToRemove.forEach((unusedResourceProperty) => {
      const oldLinkedResource = findBusinessObject(
        extensionElements,
        unusedResourceProperty,
      );

      const oldBinding = unusedResourceProperty.binding;

      // No property was reused and element was removed in previous step
      if (!oldLinkedResource) {
        return;
      }

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: oldLinkedResource,
        properties: {
          [oldBinding.property]: undefined,
        },
      });
    });
  }

  /**
   * @param {djs.model.Base} element
   * @param {Object} oldTemplate
   * @param {Object} newTemplate
   */
  _updateKunpengFormDefinition = function (element, oldTemplate, newTemplate) {
    this._updateSingleExtensionElement(element, oldTemplate, newTemplate, {
      bindingTypes: [KUNPENG_FORM_DEFINITION],
      extensionType: 'kunpeng:FormDefinition',
      getPropertyName: (binding) => binding.property,
    });
  };

  /**
   * Generic handler for updating extension elements that are single instances with properties.
   *
   * @example
   * For this template
   * ```json
   * {
   *   properties: [
   *    { binding: { type: 'kunpeng:taskDefinition', property: 'type' }, value: 'myTaskType' },
   *    {binding: { type: 'kunpeng:taskDefinition', property: 'retries' }, value: 3}
   *   ]
   * }
   *```
   * `getPropertyName` should return `binding.property`.
   *
   * `bindingTypes` should be an array of binding types to consider, e.g. `['kunpeng:taskDefinition']`.
   *
   * `extensionType` should be the type of the extension element to update, e.g. `'kunpeng:TaskDefinition'`.
   *
   * The resulting XML will look like this:
   *
   * ```xml
   * <bpmn:extensionElements>
   *   <kunpeng:taskDefinition type="myTaskType" retries="3" />
   * </bpmn:extensionElements>
   *```
   * @param {Element} element
   * @param {Object} [oldTemplate]
   * @param {Object} [newTemplate]
   * @param {Object} options
   * @param {Array<string>} options.bindingTypes - binding types to consider
   * @param {string} options.extensionType - type of the extension element to update
   * @param {(binding: Object) => string} options.getPropertyName - function to get the property name for the binding
   */
  _updateSingleExtensionElement(element, oldTemplate, newTemplate, options) {
    const { bindingTypes, extensionType, getPropertyName } = options;
    const bpmnFactory = this._bpmnFactory,
      commandStack = this._commandStack;

    let newProperties = [];

    if (newTemplate) {
      newProperties = newTemplate.properties.filter((newProperty) => {
        const newBinding = newProperty.binding,
          newBindingType = newBinding.type;

        return bindingTypes.includes(newBindingType);
      });
    }

    const businessObject = this._getOrCreateExtensionElements(element);
    let extensionElement = findExtension(businessObject, extensionType);

    // (1) Remove extension if no new properties

    if (!newProperties.length) {
      if (!extensionElement) {
        return;
      }

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: businessObject,
        properties: {
          values: without(businessObject.get('values'), extensionElement),
        },
      });

      return;
    }

    // If there are new properties:
    newProperties.forEach((newProperty) => {
      const oldProperty = findOldProperty(oldTemplate, newProperty),
        newPropertyValue = getDefaultValue(newProperty),
        newBinding = newProperty.binding,
        propertyName = getPropertyName(newBinding);

      // (2) Update old extension with new property values
      if (extensionElement) {
        if (!shouldKeepValue(extensionElement, oldProperty, newProperty)) {
          const properties = {
            [propertyName]: newPropertyValue,
          };
          commandStack.execute('element.updateModdleProperties', {
            element,
            moddleElement: extensionElement,
            properties,
          });
        }
      }

      // (3) Add new extension with properties if it does not exist
      else {
        const properties = {
          [propertyName]: newPropertyValue,
        };

        extensionElement = bpmnFactory.create(extensionType, properties);

        extensionElement.$parent = businessObject;

        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: businessObject,
          properties: {
            values: [...businessObject.get('values'), extensionElement],
          },
        });
      }
    });

    // (4) Remove properties no longer templated
    const oldProperties =
      (oldTemplate &&
        oldTemplate.properties.filter((oldProperty) => {
          const oldBinding = oldProperty.binding,
            oldBindingType = oldBinding.type,
            oldPropertyName = getPropertyName(oldBinding);

          return (
            bindingTypes.includes(oldBindingType) &&
            !newProperties.find(
              (newProperty) =>
                oldPropertyName === getPropertyName(newProperty.binding),
            )
          );
        })) ||
      [];

    oldProperties.forEach((oldProperty) => {
      const properties = {
        [getPropertyName(oldProperty.binding)]: undefined,
      };

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: extensionElement,
        properties,
      });
    });
  }
}

ChangeElementTemplateHandler.$inject = [
  'bpmnFactory',
  'bpmnReplace',
  'commandStack',
  'modeling',
  'moddleCopy',
  'injector',
];

// helpers //////////

/**
 * Find business object matching specified property.
 *
 * @param {djs.model.Base|ModdleElement} element
 * @param {Object} property
 *
 * @returns {ModdleElement}
 */
function findBusinessObject(element, property) {
  const businessObject = getBusinessObject(element);

  const binding = property.binding,
    bindingType = binding.type;

  if (TASK_DEFINITION_TYPES.includes(bindingType)) {
    return findExtension(businessObject, 'kunpeng:TaskDefinition');
  }

  if (bindingType === 'kunpeng:input' || bindingType === 'kunpeng:output') {
    const extensionElements = findExtension(
      businessObject,
      'kunpeng:IoMapping',
    );

    if (!extensionElements) {
      return;
    }

    if (bindingType === 'kunpeng:input') {
      return find(
        extensionElements.get('kunpeng:inputParameters'),
        function (input) {
          return input.get('kunpeng:target') === binding.name;
        },
      );
    } else {
      return find(
        extensionElements.get('kunpeng:outputParameters'),
        function (output) {
          return output.get('kunpeng:source') === binding.source;
        },
      );
    }
  }

  if (bindingType === 'kunpeng:taskHeader') {
    const extensionElements = findExtension(
      businessObject,
      'kunpeng:additionDynamics',
    );

    if (!extensionElements) {
      return;
    }

    return find(extensionElements.get('kunpeng:values'), function (value) {
      return value.get('kunpeng:key') === binding.key;
    });
  }

  if (bindingType === 'kunpeng:property') {
    const zeebeProperties = findExtension(businessObject, 'kunpeng:Properties');

    if (!zeebeProperties) {
      return;
    }

    return zeebeProperties.get('properties').find((value) => {
      return value.get('name') === binding.name;
    });
  }

  if (bindingType === KUNPENG_LINKED_RESOURCE_PROPERTY) {
    const linkedResources = findExtension(
      businessObject,
      'kunpeng:LinkedResources',
    );

    if (!linkedResources) {
      return;
    }

    return linkedResources.get('values').find((value) => {
      return value.get('linkName') === binding.linkName;
    });
  }
}

/**
 * Find old property matching specified new property.
 *
 * @param {Object} oldTemplate
 * @param {Object} newProperty
 *
 * @returns {Object}
 */
export function findOldProperty(oldTemplate, newProperty) {
  if (!oldTemplate) {
    return;
  }

  const oldProperties = oldTemplate.properties,
    newBinding = newProperty.binding,
    newBindingName = newBinding.name,
    newBindingType = newBinding.type;

  if (newBindingType === 'property') {
    return find(oldProperties, function (oldProperty) {
      const oldBinding = oldProperty.binding,
        oldBindingName = oldBinding.name,
        oldBindingType = oldBinding.type;

      return oldBindingType === 'property' && oldBindingName === newBindingName;
    });
  }

  if (TASK_DEFINITION_TYPES.includes(newBindingType)) {
    return find(oldProperties, function (oldProperty) {
      const oldBinding = oldProperty.binding,
        oldPropertyName = getTaskDefinitionPropertyName(oldBinding),
        newPropertyName = getTaskDefinitionPropertyName(newBinding);

      return oldPropertyName === newPropertyName;
    });
  }

  if (newBindingType === 'kunpeng:input') {
    return find(oldProperties, function (oldProperty) {
      const oldBinding = oldProperty.binding,
        oldBindingName = oldBinding.name,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== 'kunpeng:input') {
        return;
      }

      return oldBindingName === newBindingName;
    });
  }

  if (newBindingType === 'kunpeng:output') {
    return find(oldProperties, function (oldProperty) {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== 'kunpeng:output') {
        return;
      }

      return oldBinding.source === newBinding.source;
    });
  }

  if (newBindingType === 'kunpeng:taskHeader') {
    return find(oldProperties, function (oldProperty) {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== 'kunpeng:taskHeader') {
        return;
      }

      return oldBinding.key === newBinding.key;
    });
  }

  if (newBindingType === 'kunpeng:property') {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== 'kunpeng:property') {
        return;
      }

      return oldBinding.name === newBinding.name;
    });
  }

  if (newBindingType === MESSAGE_PROPERTY_TYPE) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== MESSAGE_PROPERTY_TYPE) {
        return;
      }

      return oldBinding.name === newBinding.name;
    });
  }

  if (newBindingType === MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE) {
        return;
      }

      return oldBinding.name === newBinding.name;
    });
  }

  if (newBindingType === SIGNAL_PROPERTY_TYPE) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== SIGNAL_PROPERTY_TYPE) {
        return;
      }

      return oldBinding.name === newBinding.name;
    });
  }

  if (newBindingType === KUNPENG_LINKED_RESOURCE_PROPERTY) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== KUNPENG_LINKED_RESOURCE_PROPERTY) {
        return;
      }

      return (
        oldBinding.linkName === newBinding.linkName &&
        oldBinding.property === newBinding.property
      );
    });
  }

  if (newBindingType === KUNPENG_CALLED_DECISION) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== KUNPENG_CALLED_DECISION) {
        return;
      }

      return (
        oldBindingType === newBindingType &&
        oldBinding.property === newBinding.property
      );
    });
  }

  if (newBindingType === KUNPENG_SCRIPT_TASK) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== KUNPENG_SCRIPT_TASK) {
        return;
      }

      return (
        oldBindingType === newBindingType &&
        oldBinding.property === newBinding.property
      );
    });
  }

  if (newBindingType === KUNPENG_FORM_DEFINITION) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== KUNPENG_FORM_DEFINITION) {
        return;
      }

      return (
        oldBindingType === newBindingType &&
        oldBinding.property === newBinding.property
      );
    });
  }

  if (newBindingType === KUNPENG_ASSIGNMENT_DEFINITION) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== KUNPENG_ASSIGNMENT_DEFINITION) {
        return;
      }

      return (
        oldBindingType === newBindingType &&
        oldBinding.property === newBinding.property
      );
    });
  }

  if (newBindingType === KUNPENG_PRIORITY_DEFINITION) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== KUNPENG_PRIORITY_DEFINITION) {
        return;
      }

      return (
        oldBindingType === newBindingType &&
        oldBinding.property === newBinding.property
      );
    });
  }

  if (newBindingType === KUNPENG_AD_HOC) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== KUNPENG_AD_HOC) {
        return;
      }

      return (
        oldBindingType === newBindingType &&
        oldBinding.property === newBinding.property
      );
    });
  }

  if (newBindingType === KUNPENG_TASK_SCHEDULE) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== KUNPENG_TASK_SCHEDULE) {
        return;
      }

      return (
        oldBindingType === newBindingType &&
        oldBinding.property === newBinding.property
      );
    });
  }

  if (newBindingType === TIMER_EVENT_DEFINITION_PROPERTY_TYPE) {
    return oldProperties.find((oldProperty) => {
      const oldBinding = oldProperty.binding,
        oldBindingType = oldBinding.type;

      if (oldBindingType !== TIMER_EVENT_DEFINITION_PROPERTY_TYPE) {
        return;
      }

      return oldBinding.name === newBinding.name;
    });
  }
}

/**
 * Check whether the existing property should be kept. This is the case if
 *  - an old template was set and the value differs from the default
 *  - no template was set but the property was set manually
 *
 * @param {djs.model.Base|ModdleElement} element
 * @param {Object} oldProperty
 * @param {Object} newProperty
 *
 * @returns {boolean}
 */
function shouldKeepValue(element, oldProperty, newProperty) {
  // "Hidden" values are treated as a constant
  if (newProperty.type === 'Hidden') {
    return false;
  }

  // Dropdowns should keep existing configuration
  // cf. https://github.com/bpmn-io/bpmn-js-properties-panel/issues/767
  if (newProperty.type === 'Dropdown') {
    const currentValue = getPropertyValue(element, newProperty);

    // only keep value if old value is a valid option
    return (
      newProperty.choices &&
      newProperty.choices.some((choice) => choice.value === currentValue)
    );
  }

  // keep existing old property if
  // user changed it from the original
  if (oldProperty) {
    return propertyChanged(element, oldProperty);
  }

  // keep existing property value
  return !!getPropertyValue(element, newProperty);
}

/**
 * Check whether property was changed after being set by template.
 *
 * @param {djs.model.Base|ModdleElement} element
 * @param {Object} oldProperty
 *
 * @returns {boolean}
 */
function propertyChanged(element, oldProperty) {
  const oldPropertyValue = getDefaultFixedValue(oldProperty);

  return getPropertyValue(element, oldProperty) !== oldPropertyValue;
}

function getPropertyValue(element, property) {
  const businessObject = getBusinessObject(element);

  if (!businessObject) {
    return;
  }

  const binding = property.binding,
    bindingName = binding.name,
    bindingType = binding.type,
    bindingProperty = binding.property;

  if (bindingType === 'property') {
    return businessObject.get(bindingName);
  }

  if (TASK_DEFINITION_TYPES.includes(bindingType)) {
    return businessObject.get(getTaskDefinitionPropertyName(binding));
  }

  if (bindingType === 'kunpeng:input') {
    return businessObject.get('kunpeng:source');
  }

  if (bindingType === 'kunpeng:output') {
    return businessObject.get('kunpeng:target');
  }

  if (bindingType === 'kunpeng:taskHeader') {
    return businessObject.get('kunpeng:value');
  }

  if (bindingType === 'kunpeng:property') {
    return businessObject.get('kunpeng:value');
  }

  if (bindingType === MESSAGE_PROPERTY_TYPE) {
    return businessObject.get(bindingName);
  }

  if (bindingType === MESSAGE_KUNPENG_SUBSCRIPTION_PROPERTY_TYPE) {
    return businessObject.get(bindingName);
  }

  if (bindingType === SIGNAL_PROPERTY_TYPE) {
    return businessObject.get(bindingName);
  }

  if (bindingType === KUNPENG_LINKED_RESOURCE_PROPERTY) {
    return businessObject.get(bindingProperty);
  }

  if (bindingType === KUNPENG_CALLED_DECISION) {
    return businessObject.get(bindingProperty);
  }

  if (bindingType === KUNPENG_CALLED_ELEMENT) {
    return businessObject.get(bindingProperty);
  }

  if (bindingType === KUNPENG_FORM_DEFINITION) {
    return businessObject.get(bindingProperty);
  }

  if (bindingType === KUNPENG_SCRIPT_TASK) {
    return businessObject.get(bindingProperty);
  }

  if (bindingType === KUNPENG_ASSIGNMENT_DEFINITION) {
    return businessObject.get(bindingProperty);
  }

  if (bindingType === KUNPENG_PRIORITY_DEFINITION) {
    return businessObject.get(bindingProperty);
  }

  if (bindingType === KUNPENG_AD_HOC) {
    return businessObject.get(bindingProperty);
  }

  if (bindingType === KUNPENG_TASK_SCHEDULE) {
    return businessObject.get(bindingProperty);
  }

  if (bindingType === TIMER_EVENT_DEFINITION_PROPERTY_TYPE) {
    // the actual value is nested in an Expression
    return businessObject.get(bindingName)?.get('body');
  }
}

function remove(array, item) {
  const index = array.indexOf(item);

  if (index < 0) {
    return array;
  }

  array.splice(index, 1);

  return array;
}

function hasMessageProperties(template) {
  return template.properties.some((p) =>
    MESSAGE_BINDING_TYPES.includes(p.binding.type),
  );
}

function hasSignalProperties(template) {
  return template.properties.some(
    (p) => p.binding.type === SIGNAL_PROPERTY_TYPE,
  );
}

function shouldUpdateElementType(element, oldTemplate, newType) {
  // Never reuse existing eventDefinition when applying a new template
  if (!oldTemplate && newType.eventDefinition) {
    return true;
  }

  const oldType = (oldTemplate && oldTemplate.elementType) || {
    value: element.type,
    eventDefinition: getEventDefinitionType(element),
  };

  // Do not update if the element type did not change
  if (
    oldType &&
    oldType.value === newType.value &&
    oldType.eventDefinition === newType.eventDefinition
  ) {
    return false;
  }

  return true;
}

function getEventDefinitionType(element) {
  const businessObject = getBusinessObject(element);
  if (!businessObject.eventDefinitions) {
    return;
  }

  const eventDefinition = businessObject.eventDefinitions[0];

  if (!eventDefinition) {
    return;
  }

  return eventDefinition.$type;
}
