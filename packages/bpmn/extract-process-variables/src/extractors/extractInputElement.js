import { forEach, isArray } from 'min-dash';
import { getMultiInstanceInputElement } from '../util/ExtensionElementsUtil.js';

import { createProcessVariable, addVariableToList } from '../util/ProcessVariablesUtil.js';

/**
 * Retrieves process variables defined in result variables, e.g.
 *
 * <bpmn:serviceTask id="ServiceTask">
 *   <bpmn:multiInstanceLoopCharacteristics>
 *     <bpmn:extensionElements>
 *       <kunpeng:loopCharacteristics inputElement="inputElement" outputCollection="outputCollection" />
 *     </bpmn:extensionElements>
 *   </bpmn:multiInstanceLoopCharacteristics>
 * </bpmn:serviceTask>
 *
 * => Adds one variable "inputElement" to the list.
 *
 */
export default function extractInputElement(options) {
  var elements = options.elements,
      processVariables = options.processVariables;

  if (!isArray(elements)) {
    elements = [ elements ];
  }

  forEach(elements, function(element) {

    var multiInstanceInputElement = getMultiInstanceInputElement(element);

    if (multiInstanceInputElement) {
      var newVariable = createProcessVariable(
        element,
        multiInstanceInputElement,
        element
      );

      addVariableToList(processVariables, newVariable);
    }
  });

  return processVariables;
}
