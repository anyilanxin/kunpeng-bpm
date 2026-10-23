import { forEach, isArray } from 'min-dash';

import { getOutputMappings } from '../util/ExtensionElementsUtil.js';

import { createProcessVariable, addVariableToList } from '../util/ProcessVariablesUtil.js';


/**
 * Retrieves process variables defined in output mappings, e.g.
 *
 * <bpmn:serviceTask id="ServiceTask">
 *   <bpmn:extensionElements>
 *     <kunpeng:ioMapping>
 *       <kunpeng:output source="= source" target="variable1" />
 *     </kunpeng:ioMapping>
 *   </bpmn:extensionElements>
 * </bpmn:serviceTask>
 *
 * => Adds one variable "variable1" to the list.
 *
 */
export default function extractOutputMappings(options) {
  var elements = options.elements,
      containerElement = options.containerElement,
      processVariables = options.processVariables;

  if (!isArray(elements)) {
    elements = [ elements ];
  }

  forEach(elements, function(element) {

    var outMappings = getOutputMappings(element);

    // extract all variables with correct scope
    forEach(outMappings, function(mapping) {

      // skip invalid mappings
      if (!mapping.target) {
        return;
      }

      var newVariable = createProcessVariable(
        element,
        mapping.target,
        containerElement
      );

      addVariableToList(processVariables, newVariable);
    });
  });

  return processVariables;
}
