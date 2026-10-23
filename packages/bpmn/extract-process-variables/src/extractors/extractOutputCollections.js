import { forEach, isArray } from 'min-dash';
import { getMultiInstanceOutputCollection, getAdHocOutputCollection } from '../util/ExtensionElementsUtil.js';

import { createProcessVariable, addVariableToList } from '../util/ProcessVariablesUtil.js';

/**
 * Retrieves process variables defined in multi-instance output collection, e.g.
 *
 * <bpmn:serviceTask id="ServiceTask">
 *   <bpmn:multiInstanceLoopCharacteristics>
 *     <bpmn:extensionElements>
 *       <kunpeng:loopCharacteristics inputElement="inputElement" outputCollection="outputCollection" />
 *     </bpmn:extensionElements>
 *   </bpmn:multiInstanceLoopCharacteristics>
 * </bpmn:serviceTask>
 *
 * => Adds one variable "outputCollection" to the list.
 *
 * Retrieves variables defined in adHoc output collection, e.g.
 *
 * <bpmn:adHocSubProcess id="AdHocSubProcess">
 *   <bpmn:extensionElements>
 *     <kunpeng:adHoc outputCollection="executionResults" outputElement="executionResult" />
 *   </bpmn:extensionElements>
 *   ...
 * </bpmn:adHocSubProcess>
 *
 * => Adds one variable "executionResults" to the list.
 */
export default function extractOutputCollections(options) {
  let elements = options.elements,
      containerElement = options.containerElement,
      processVariables = options.processVariables;

  if (!isArray(elements)) {
    elements = [ elements ];
  }

  // <outputCollection> defines a local variable that always propagates
  // to the parent scope upon completion
  forEach(elements, function(element) {

    var multiInstanceOutputCollection = getMultiInstanceOutputCollection(element);

    if (multiInstanceOutputCollection) {

      // <outputCollection> declared variable is not available
      // in local scope, but only in the MI parent.
      const newVariable = createProcessVariable(
        element,
        multiInstanceOutputCollection,
        containerElement
      );

      addVariableToList(processVariables, newVariable);
    }

    const adHocOutputCollection = getAdHocOutputCollection(element);

    if (adHocOutputCollection) {

      // <outputCollection> declared variable is available in ad-hoc local
      // scope as a local variable
      const newLocalVariable = createProcessVariable(
        element,
        adHocOutputCollection,
        element
      );

      addVariableToList(processVariables, newLocalVariable);

      // <outputCollection> declared variable also "force propagates" to the
      // parent scope
      const newParentVariable = createProcessVariable(
        element,
        adHocOutputCollection,
        containerElement
      );

      addVariableToList(processVariables, newParentVariable);
    }
  });

  return processVariables;
}
