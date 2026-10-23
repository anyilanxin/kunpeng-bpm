import { forEach, isArray } from 'min-dash';
import { getCalledDecision, getScript } from '../util/ExtensionElementsUtil.js';

import { createProcessVariable, addVariableToList } from '../util/ProcessVariablesUtil.js';

/**
 * Extracts process variables from extension elements that have a result
 * variable, e.g. given the following element:
 *
 * <bpmn:businessRuleTask id="Task_1">
 *   <bpmn:extensionElements>
 *     <kunpeng:calledDecision resultVariable="foo" />
 *   </bpmn:extensionElements>
 * </bpmn:businessRuleTask>
 *
 * a process variable with name 'foo' is extracted.
 *
 * If output variables exist, the scope is set to the element.
 *
 * If an output variable with the same name exists, e.g. given the following
 * element:
 *
 * <bpmn:businessRuleTask id="Task_1">
 *   <bpmn:extensionElements>
 *     <kunpeng:calledDecision resultVariable="foo" />
 *     <kunpeng:ioMapping>
 *       <kunpeng:output target="foo" />
 *     </kunpeng:ioMapping>
 *   </bpmn:extensionElements>
 * </bpmn:businessRuleTask>
 *
 * no process variable is created.
 *
 * @param {Object} options
 * @param {Array<ModdleElement>} options.elements
 * @param {ModdleElement} options.containerElement
 * @param {Array<ProcessVariable>} options.processVariables
 *
 * @return {Array<ProcessVariable>}
 */
export default function extractResultVariables(options) {
  var elements = options.elements,
      containerElement = options.containerElement,
      processVariables = options.processVariables;

  if (!isArray(elements)) {
    elements = [ elements ];
  }

  forEach(elements, function(element) {

    var extensionElement = getCalledDecision(element) || getScript(element);

    if (!extensionElement) {
      return;
    }

    var resultVariable = extensionElement.resultVariable;

    if (resultVariable) {
      var newVariable = createProcessVariable(
        element,
        resultVariable,
        containerElement,
        true
      );

      addVariableToList(processVariables, newVariable);
    }
  });

  return processVariables;
}
