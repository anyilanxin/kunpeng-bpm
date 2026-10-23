var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';
import { getPrefixedId } from "./IdsUtil";
import { getExtensionElementsList } from "./ExtensionElementsUtil";
const FORM_KEY_PREFIX = "kunpeng-forms:bpmn:", USER_TASK_FORM_ID_PREFIX = "UserTaskForm_";
function getFormDefinition(element) {
  const businessObject = getBusinessObject(element);
  const formDefinitions = getExtensionElementsList(businessObject, "kunpeng:FormDefinition");
  return formDefinitions[0];
}
__name(getFormDefinition, "getFormDefinition");
function getUserTaskForm(element, options = {}) {
  let {
    formKey,
    rootElement
  } = options;
  rootElement = rootElement || getRootElement(element);
  if (!formKey) {
    const formDefinition = getFormDefinition(element);
    if (!formDefinition) {
      return;
    }
    formKey = formDefinition.get("formKey");
  }
  const userTaskForms = getExtensionElementsList(rootElement, "kunpeng:UserTaskForm");
  return userTaskForms.find((userTaskForm) => {
    return userTaskFormIdToFormKey(userTaskForm.get("id")) === formKey;
  });
}
__name(getUserTaskForm, "getUserTaskForm");
function userTaskFormIdToFormKey(userTaskFormId) {
  return `${FORM_KEY_PREFIX}${userTaskFormId}`;
}
__name(userTaskFormIdToFormKey, "userTaskFormIdToFormKey");
function formKeyToUserTaskFormId(formKey) {
  return formKey.replace(FORM_KEY_PREFIX, "");
}
__name(formKeyToUserTaskFormId, "formKeyToUserTaskFormId");
function isUserTaskFormKey(formKey) {
  return formKey && formKey.startsWith(FORM_KEY_PREFIX);
}
__name(isUserTaskFormKey, "isUserTaskFormKey");
function createUserTaskFormId() {
  return getPrefixedId(USER_TASK_FORM_ID_PREFIX);
}
__name(createUserTaskFormId, "createUserTaskFormId");
function getRootElement(element) {
  const businessObject = getBusinessObject(element);
  let parent = businessObject;
  while (parent.$parent && !is(parent, "bpmn:Process")) {
    parent = parent.$parent;
  }
  return parent;
}
__name(getRootElement, "getRootElement");
export {
  createUserTaskFormId,
  formKeyToUserTaskFormId,
  getFormDefinition,
  getRootElement,
  getUserTaskForm,
  isUserTaskFormKey,
  userTaskFormIdToFormKey
};
//# sourceMappingURL=FormsUtil.js.map
