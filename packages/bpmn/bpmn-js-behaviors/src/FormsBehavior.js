import { isUndefined, without } from 'min-dash';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { createElement } from './util/ElementUtil.js';
import { getExtensionElementsList } from './util/ExtensionElementsUtil.js';

import { is } from '@kunpeng-io/bpmn-js';

import {
  createUserTaskFormId,
  formKeyToUserTaskFormId,
  getFormDefinition,
  getRootElement,
  getUserTaskForm,
  isUserTaskFormKey,
  userTaskFormIdToFormKey
} from './util/FormsUtil.js';


/**
 * Kunpeng BPMN specific forms behavior.
 */
export default class FormsBehavior extends CommandInterceptor {
  constructor(bpmnFactory, elementRegistry, eventBus, modeling) {
    super(eventBus);

    this._modeling = modeling;

    function removeUserTaskForm(element, moddleElement, userTaskForm) {
      const extensionElements = moddleElement.get('extensionElements');

      const values = without(extensionElements.get('values'), userTaskForm);

      modeling.updateModdleProperties(element, extensionElements, {
        values
      });

      if (!values.length) {
        modeling.updateModdleProperties(element, moddleElement, {
          extensionElements: undefined
        });
      }
    }

    /**
     * Remove kunpeng:UserTaskForm on user task removed.
     * （新内核删除走 elements.delete 批量命令：preExecute 时语义树 parent 链完好，
     * oldParent 语境由 elements 数组 + getRootElement 爬链替代）
     */
    this.preExecute('elements.delete', function(context) {
      const {
        elements
      } = context;

      const userTasks = (elements || []).filter(shape => is(shape, 'bpmn:UserTask'));

      for (const shape of userTasks) {
        const rootElement = getRootElement(shape);

        const userTaskForm = getUserTaskForm(shape, { rootElement });

        if (!userTaskForm) {
          continue;
        }

        removeUserTaskForm(shape, rootElement, userTaskForm);
      }
    }, true);


    /**
     * Create and reference new kunpeng:UserTaskForm when user task is created
     * that references existing kunpeng:UserTaskForm that is already referenced by
     * existing user task.
     */
    this.postExecute('shape.create', function(context) {
      const { shape } = context;

      if (!is(shape, 'bpmn:UserTask')) {
        return;
      }

      const oldFormDefinition = getFormDefinition(shape);

      if (!oldFormDefinition) {
        return;
      }

      const oldUserTaskForm = getUserTaskForm(shape);

      if (!oldUserTaskForm) {
        return;
      }

      const isReferenced = elementRegistry.filter(element => {
        if (element === shape) {
          return false;
        }

        const formDefinition = getFormDefinition(element);

        return formDefinition
          && formDefinition.get('formKey')
          && formKeyToUserTaskFormId(formDefinition.get('formKey')) === oldUserTaskForm.get('id');
      });

      if (!isReferenced.length) {
        return;
      }

      const rootElement = getRootElement(shape);

      let extensionElements = rootElement.get('extensionElements');

      // (1) ensure extension elements exist
      if (!extensionElements) {
        extensionElements = createElement('bpmn:ExtensionElements', {
          values: []
        }, rootElement, bpmnFactory);

        modeling.updateModdleProperties(shape, rootElement, {
          extensionElements
        });
      }

      // (2) create new user task form
      const userTaskFormId = createUserTaskFormId();

      const userTaskForm = createElement('kunpeng:UserTaskForm', {
        id: userTaskFormId,
        body: oldUserTaskForm.get('body')
      }, extensionElements, bpmnFactory);

      modeling.updateModdleProperties(shape, extensionElements, {
        values: [
          ...(extensionElements.get('values') || []),
          userTaskForm
        ]
      });

      // (3) reference new user task form
      modeling.updateModdleProperties(shape, oldFormDefinition, {
        formKey: userTaskFormIdToFormKey(userTaskFormId)
      });
    }, true);


    /**
     * Ensure that a user task only has one of the following:
     *
     * 1. kunpeng:FormDefinition with kunpeng:formId (linked Camunda form)
     * 2. kunpeng:FormDefinition with kunpeng:formKey in the format of camunda-forms:bpmn:UserTaskForm_1 (embedded Camunda form)
     * 3. kunpeng:FormDefinition with kunpeng:formKey (custom form)
     * 4. kunpeng:FormDefinition with kunpeng:externalReference (external form)
     *
     * Furthermore, ensure that:
     *
     * 1. kunpeng:bindingType only exists if kunpeng:formId is set (linked Camunda form)
     */
    this.preExecute('element.updateModdleProperties', function(context) {
      const {
        moddleElement,
        properties
      } = context;

      if (is(moddleElement, 'kunpeng:FormDefinition')) {
        if ('formId' in properties) {
          properties.formKey = undefined;
          properties.externalReference = undefined;
        } else if ('formKey' in properties) {
          properties.formId = undefined;
          properties.externalReference = undefined;
          properties.bindingType = undefined;
        } else if ('externalReference' in properties) {
          properties.formId = undefined;
          properties.formKey = undefined;
          properties.bindingType = undefined;
        }

        if ('bindingType' in properties && !('formId' in properties) && !moddleElement.get('formId')) {
          properties.externalReference = undefined;
          properties.formId = '';
          properties.formKey = undefined;
        }
      }
    }, true);

    /**
     * Clean up user task form after form key or definition is removed. Clean up
     * empty extension elements after form definition is removed.
     */
    this.postExecute('element.updateModdleProperties', function(context) {
      const {
        element,
        moddleElement,
        oldProperties
      } = context;

      if (is(moddleElement, 'kunpeng:FormDefinition')) {
        const formKey = moddleElement.get('formKey');

        if (!formKey || !isUserTaskFormKey(formKey)) {
          const userTaskForm = getUserTaskForm(element, { formKey: oldProperties.formKey });

          if (userTaskForm) {
            removeUserTaskForm(element, getRootElement(element), userTaskForm);
          }
        }
      } else if (isExtensionElementRemoved(context, 'kunpeng:FormDefinition')) {
        const formDefinition = oldProperties.values.find(value => is(value, 'kunpeng:FormDefinition'));

        const userTaskForm = getUserTaskForm(element, { formKey: formDefinition.get('formKey') });

        if (userTaskForm) {
          removeUserTaskForm(element, getRootElement(element), userTaskForm);
        }

        if (!moddleElement.get('values').length) {
          modeling.updateProperties(element, {
            extensionElements: undefined
          });
        }
      }
    }, true);

    this._registerKunpengUserTaskSupport();
  }

  _registerKunpengUserTaskSupport() {

    /**
     * Handle `formKey` for `kunpeng:UserTask`.
     * 1. Remove if embedded form is used.
     * 2. Convert to externalReference if custom form key.
     */
    this.postExecute('element.updateModdleProperties', ({ element }) => {

      if (!is(element, 'bpmn:UserTask') || !hasKunpengUserTask(element)) {
        return;
      }

      const formDefinition = getFormDefinition(element);

      if (!formDefinition) {
        return;
      }

      const formKey = formDefinition.get('formKey');

      if (isUndefined(formKey)) {
        return;
      }

      if (isUserTaskFormKey(formKey)) {
        this._modeling.updateModdleProperties(element, formDefinition, { formKey: undefined });
      } else {
        this._modeling.updateModdleProperties(element, formDefinition, {
          externalReference: formKey
        });
      }
    }, true);

    /**
     * Replace `externalReference` with `formKey` for non-`kunpeng:UserTask`.
     */
    this.postExecute('element.updateModdleProperties', ({ element }) => {

      if (!is(element, 'bpmn:UserTask') || hasKunpengUserTask(element)) {
        return;
      }

      const formDefinition = getFormDefinition(element);

      if (!formDefinition) {
        return;
      }

      const externalReference = formDefinition.get('externalReference');

      if (isUndefined(externalReference)) {
        return;
      }

      this._modeling.updateModdleProperties(element, formDefinition, {
        externalReference: undefined,
        formKey: externalReference
      });
    }, true);
  }
}

FormsBehavior.$inject = [
  'bpmnFactory',
  'elementRegistry',
  'eventBus',
  'modeling'
];

function isExtensionElementRemoved(context, type) {
  const {
    moddleElement,
    oldProperties,
    properties
  } = context;

  return is(moddleElement, 'bpmn:ExtensionElements')
    && 'values' in oldProperties
    && 'values' in properties
    && oldProperties.values.find(value => is(value, type))
    && !properties.values.find(value => is(value, type));
}

function hasKunpengUserTask(userTask) {
  return getExtensionElementsList(userTask, 'kunpeng:UserTask').length;
}
