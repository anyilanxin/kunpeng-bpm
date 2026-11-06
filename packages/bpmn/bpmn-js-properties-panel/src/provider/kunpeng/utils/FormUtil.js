import { isDefined } from 'min-dash';

import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import { nextId } from '../../../utils/ElementUtil';

import { getExtensionElementsList } from '../../../utils/ExtensionElementsUtil';

const FORM_KEY_PREFIX = 'kunpeng-forms:bpmn:',
      USER_TASK_FORM_ID_PREFIX = 'UserTaskForm_';

export const FORM_TYPES = {
  KUNPENG_FORM_EMBEDDED: 'kunpeng-form-embedded',
  KUNPENG_FORM_LINKED: 'kunpeng-form-linked',
  CUSTOM_FORM: 'custom-form',
  EXTERNAL_REFERENCE: 'external-reference'
};

export const DEFAULT_FORM_TYPE = FORM_TYPES.KUNPENG_FORM_LINKED;

export function getFormDefinition(element) {
  const businessObject = getBusinessObject(element);

  const formDefinitions = getExtensionElementsList(businessObject, 'kunpeng:FormDefinition');

  return formDefinitions[ 0 ];
}

export function getUserTaskForm(element, rootElement) {
  rootElement = rootElement || getRootElement(element);

  const formDefinition = getFormDefinition(element);

  if (!formDefinition) {
    return;
  }

  const formKey = formDefinition.get('formKey');

  const userTaskForms = getExtensionElementsList(rootElement, 'kunpeng:UserTaskForm');

  return userTaskForms.find(userTaskForm => {
    return userTaskFormIdToFormKey(userTaskForm.get('id')) === formKey;
  });
}

export function userTaskFormIdToFormKey(userTaskFormId) {
  return `${ FORM_KEY_PREFIX }${ userTaskFormId }`;
}

export function formKeyToUserTaskFormId(formKey) {
  return formKey.replace(FORM_KEY_PREFIX, '');
}

export function createUserTaskFormId() {
  return nextId(USER_TASK_FORM_ID_PREFIX);
}

export function getRootElement(element) {
  const businessObject = getBusinessObject(element);

  let parent = businessObject;

  while (parent.$parent && !is(parent, 'bpmn:Process')) {
    parent = parent.$parent;
  }

  return parent;
}

export function getFormType(element) {
  const formDefinition = getFormDefinition(element);

  if (!formDefinition) {
    return;
  }

  const formId = formDefinition.get('formId'),
        formKey = formDefinition.get('formKey'),
        externalReference = formDefinition.get('externalReference');

  if (isDefined(formId)) {
    return FORM_TYPES.KUNPENG_FORM_LINKED;
  }

  if (isDefined(externalReference)) {
    return FORM_TYPES.EXTERNAL_REFERENCE;
  }

  if (isDefined(formKey)) {

    if (getUserTaskForm(element)) {
      return FORM_TYPES.KUNPENG_FORM_EMBEDDED;
    }

    return FORM_TYPES.CUSTOM_FORM;
  }
}

export function isKunpengUserTask(element) {
  // 引擎只有一种用户任务（kunpeng:userTask 标记已拔除），用户任务即 kunpeng 用户任务
  return is(element, 'bpmn:UserTask');
}
