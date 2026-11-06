import CleanUpAdHocSubProcessBehavior from './CleanUpAdHocSubProcessBehavior.js';
import CleanUpBusinessRuleTaskBehavior from './CleanUpBusinessRuleTaskBehavior.js';
import CleanUpEndEventBehavior from './CleanUpEndEventBehavior.js';
import CleanUpExecutionListenersBehavior from './CleanUpExecutionListenersBehavior.js';
import CleanUpMessageRefBehavior from './CleanUpMessageRefBehavior.js';
import CleanUpTaskListenersBehavior from './CleanUpTaskListenersBehavior.js';
import CleanUpSubscriptionBehavior from './CleanUpSubscriptionBehavior.js';
import CleanUpTimerExpressionBehavior from './CleanUpTimerExpressionBehavior.js';
import CreateKunpengCallActivityBehavior from './CreateKunpengCallActivityBehavior.js';
import FormsBehavior from './FormsBehavior.js';
import RemoveAssignmentDefinitionBehavior from './RemoveAssignmentDefinitionBehavior.js';
import RemoveTaskScheduleBehavior from './RemoveTaskScheduleBehavior.js';
import CallActivityVariablesPropagationBehavior from './CallActivityVariablesPropagationBehavior.js';
import VersionTagBehavior from './VersionTagBehavior.js';

/**
 * kunpeng 扩展缺省行为集（面向 @kunpeng-io/bpmn-js 新内核）。
 *
 * 移植裁决（2026-10-29，@kunpeng-js 线撤架全清，见 design-docs/@kunpeng-js遗留全清评估与计划.md）：
 * - CopyPasteBehavior 删除——事件源 moddleCopy.canCopyProperty 属 bpmn.io BpmnModdleCopy，
 *   新内核未装配 copy-paste，钩子永不触发；
 * - DeleteParticipantBehaviour 删除——依赖旧线 shape.delete 的 context.collaborationRoot
 *   与"删末池根回退 Process"语义，新内核删除走 elements.delete 且删池后根保持
 *   Collaboration（前向不回滚契约），行为前提不成立。
 */
export default {
  __init__: [
    'callActivityVariablesPropagationBehavior',
    'cleanUpAdHocSubProcessBehavior',
    'cleanUpBusinessRuleTaskBehavior',
    'cleanUpEndEventBehavior',
    'cleanUpExecutionListenersBehavior',
    'cleanUpMessageRefBehavior',
    'cleanUpTaskListenersBehavior',
    'cleanUpSubscriptionBehavior',
    'cleanUpTimerExpressionBehavior',
    'createKunpengCallActivityBehavior',
    'formsBehavior',
    'removeAssignmentDefinitionBehavior',
    'removeTaskScheduleBehavior',
    'versionTagBehavior'
  ],
  callActivityVariablesPropagationBehavior: [ 'type', CallActivityVariablesPropagationBehavior ],
  cleanUpAdHocSubProcessBehavior: [ 'type', CleanUpAdHocSubProcessBehavior ],
  cleanUpBusinessRuleTaskBehavior: [ 'type', CleanUpBusinessRuleTaskBehavior ],
  cleanUpEndEventBehavior: [ 'type', CleanUpEndEventBehavior ],
  cleanUpExecutionListenersBehavior: [ 'type', CleanUpExecutionListenersBehavior ],
  cleanUpMessageRefBehavior: [ 'type', CleanUpMessageRefBehavior ],
  cleanUpTaskListenersBehavior: [ 'type', CleanUpTaskListenersBehavior ],
  cleanUpSubscriptionBehavior: [ 'type', CleanUpSubscriptionBehavior ],
  cleanUpTimerExpressionBehavior: [ 'type', CleanUpTimerExpressionBehavior ],
  createKunpengCallActivityBehavior: [ 'type', CreateKunpengCallActivityBehavior ],
  formsBehavior: [ 'type', FormsBehavior ],
  removeAssignmentDefinitionBehavior: [ 'type', RemoveAssignmentDefinitionBehavior ],
  removeTaskScheduleBehavior: [ 'type', RemoveTaskScheduleBehavior ],
  versionTagBehavior: [ 'type', VersionTagBehavior ]
};
