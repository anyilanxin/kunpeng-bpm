var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { isUndefined, without } from "min-dash";
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { createElement } from "./util/ElementUtil";
import { getExtensionElementsList } from "./util/ExtensionElementsUtil";
import { is } from '@kunpeng-io/bpmn-js';
import {
  createUserTaskFormId,
  formKeyToUserTaskFormId,
  getFormDefinition,
  getRootElement,
  getUserTaskForm,
  isUserTaskFormKey,
  userTaskFormIdToFormKey
} from "./util/FormsUtil";
const _FormsBehavior = class _FormsBehavior extends CommandInterceptor {
  constructor(bpmnFactory, elementRegistry, eventBus, modeling) {
    super(eventBus);
    this._modeling = modeling;
    function removeUserTaskForm(element, moddleElement, userTaskForm) {
      const extensionElements = moddleElement.get("extensionElements");
      const values = without(extensionElements.get("values"), userTaskForm);
      modeling.updateModdleProperties(element, extensionElements, {
        values
      });
      if (!values.length) {
        modeling.updateModdleProperties(element, moddleElement, {
          extensionElements: void 0
        });
      }
    }
    __name(removeUserTaskForm, "removeUserTaskForm");
    this.postExecute("shape.delete", function(context) {
      const {
        oldParent,
        shape
      } = context;
      const rootElement = getRootElement(oldParent);
      const userTaskForm = getUserTaskForm(shape, { rootElement });
      if (!is(shape, "bpmn:UserTask") || !userTaskForm) {
        return;
      }
      removeUserTaskForm(shape, rootElement, userTaskForm);
    }, true);
    this.postExecute("shape.create", function(context) {
      const { shape } = context;
      if (!is(shape, "bpmn:UserTask")) {
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
      const isReferenced = elementRegistry.filter((element) => {
        if (element === shape) {
          return false;
        }
        const formDefinition = getFormDefinition(element);
        return formDefinition && formDefinition.get("formKey") && formKeyToUserTaskFormId(formDefinition.get("formKey")) === oldUserTaskForm.get("id");
      });
      if (!isReferenced.length) {
        return;
      }
      const rootElement = getRootElement(shape);
      let extensionElements = rootElement.get("extensionElements");
      if (!extensionElements) {
        extensionElements = createElement("bpmn:ExtensionElements", {
          values: []
        }, rootElement, bpmnFactory);
        modeling.updateModdleProperties(shape, rootElement, {
          extensionElements
        });
      }
      const userTaskFormId = createUserTaskFormId();
      const userTaskForm = createElement("kunpeng:UserTaskForm", {
        id: userTaskFormId,
        body: oldUserTaskForm.get("body")
      }, extensionElements, bpmnFactory);
      modeling.updateModdleProperties(shape, extensionElements, {
        values: [
          ...extensionElements.get("values") || [],
          userTaskForm
        ]
      });
      modeling.updateModdleProperties(shape, oldFormDefinition, {
        formKey: userTaskFormIdToFormKey(userTaskFormId)
      });
    }, true);
    this.preExecute("element.updateModdleProperties", function(context) {
      const {
        moddleElement,
        properties
      } = context;
      if (is(moddleElement, "kunpeng:FormDefinition")) {
        if ("formId" in properties) {
          properties.formKey = void 0;
          properties.externalReference = void 0;
        } else if ("formKey" in properties) {
          properties.formId = void 0;
          properties.externalReference = void 0;
          properties.bindingType = void 0;
        } else if ("externalReference" in properties) {
          properties.formId = void 0;
          properties.formKey = void 0;
          properties.bindingType = void 0;
        }
        if ("bindingType" in properties && !("formId" in properties) && !moddleElement.get("formId")) {
          properties.externalReference = void 0;
          properties.formId = "";
          properties.formKey = void 0;
        }
      }
    }, true);
    this.postExecute("element.updateModdleProperties", function(context) {
      const {
        element,
        moddleElement,
        oldProperties
      } = context;
      if (is(moddleElement, "kunpeng:FormDefinition")) {
        const formKey = moddleElement.get("formKey");
        if (!formKey || !isUserTaskFormKey(formKey)) {
          const userTaskForm = getUserTaskForm(element, { formKey: oldProperties.formKey });
          if (userTaskForm) {
            removeUserTaskForm(element, getRootElement(element), userTaskForm);
          }
        }
      } else if (isExtensionElementRemoved(context, "kunpeng:FormDefinition")) {
        const formDefinition = oldProperties.values.find((value) => is(value, "kunpeng:FormDefinition"));
        const userTaskForm = getUserTaskForm(element, { formKey: formDefinition.get("formKey") });
        if (userTaskForm) {
          removeUserTaskForm(element, getRootElement(element), userTaskForm);
        }
        if (!moddleElement.get("values").length) {
          modeling.updateProperties(element, {
            extensionElements: void 0
          });
        }
      }
    }, true);
    this._registerKunpengUserTaskSupport();
  }
  _registerKunpengUserTaskSupport() {
    this.postExecute("element.updateModdleProperties", ({ element }) => {
      if (!is(element, "bpmn:UserTask") || !hasKunpengUserTask(element)) {
        return;
      }
      const formDefinition = getFormDefinition(element);
      if (!formDefinition) {
        return;
      }
      const formKey = formDefinition.get("formKey");
      if (isUndefined(formKey)) {
        return;
      }
      if (isUserTaskFormKey(formKey)) {
        this._modeling.updateModdleProperties(element, formDefinition, { formKey: void 0 });
      } else {
        this._modeling.updateModdleProperties(element, formDefinition, {
          externalReference: formKey
        });
      }
    }, true);
    this.postExecute("element.updateModdleProperties", ({ element }) => {
      if (!is(element, "bpmn:UserTask") || hasKunpengUserTask(element)) {
        return;
      }
      const formDefinition = getFormDefinition(element);
      if (!formDefinition) {
        return;
      }
      const externalReference = formDefinition.get("externalReference");
      if (isUndefined(externalReference)) {
        return;
      }
      this._modeling.updateModdleProperties(element, formDefinition, {
        externalReference: void 0,
        formKey: externalReference
      });
    }, true);
  }
};
__name(_FormsBehavior, "FormsBehavior");
let FormsBehavior = _FormsBehavior;
FormsBehavior.$inject = [
  "bpmnFactory",
  "elementRegistry",
  "eventBus",
  "modeling"
];
function isExtensionElementRemoved(context, type) {
  const {
    moddleElement,
    oldProperties,
    properties
  } = context;
  return is(moddleElement, "bpmn:ExtensionElements") && "values" in oldProperties && "values" in properties && oldProperties.values.find((value) => is(value, type)) && !properties.values.find((value) => is(value, type));
}
__name(isExtensionElementRemoved, "isExtensionElementRemoved");
function hasKunpengUserTask(userTask) {
  return getExtensionElementsList(userTask, "kunpeng:UserTask").length;
}
__name(hasKunpengUserTask, "hasKunpengUserTask");
export {
  FormsBehavior as default
};
//# sourceMappingURL=FormsBehavior.js.map
