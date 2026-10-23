import { KUNPENG_TASK_DEFINITION_TYPE_TYPE } from './bindingTypes';

export function getTaskDefinitionPropertyName(binding) {
  return binding.type === KUNPENG_TASK_DEFINITION_TYPE_TYPE
    ? 'type'
    : binding.property;
}
