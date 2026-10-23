import { forEach, isArray } from 'min-dash';

import { getInputMappings } from '../util/ExtensionElementsUtil.js';

import { createProcessVariable, addVariableToList } from '../util/ProcessVariablesUtil.js';


/**
 * Retrieves process variables defined in output mappings, e.g.
 *
 * <bpmn:serviceTask id="ServiceTask">
 *   <bpmn:extensionElements>
 *     <kunpeng:ioMapping>
 *       <kunpeng:input source="= source" target="variable1" />
 *     </kunpeng:ioMapping>
 *   </bpmn:extensionElements>
 * </bpmn:serviceTask>
 *
 * => Adds one variable "variable1" to the list.
 *
 */
export default function extractInputMappings(options) {
  var elements = options.elements,
      processVariables = options.processVariables;

  if (!isArray(elements)) {
    elements = [ elements ];
  }

  forEach(elements, function(element) {

    var inMappings = getInputMappings(element);

    // extract all variables with correct scope
    forEach(inMappings, function(mapping) {

      // skip invalid mappings
      if (!mapping.target) {
        return;
      }

      var newVariable = createProcessVariable(
        element,
        mapping.target,
        element,
        true
      );

      addVariableToList(processVariables, newVariable);
    });
  });

  return processVariables;
}
