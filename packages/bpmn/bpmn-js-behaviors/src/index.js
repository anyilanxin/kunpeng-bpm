import CleanUpAdHocSubProcessBehavior from './CleanUpAdHocSubProcessBehavior';
import CleanUpBusinessRuleTaskBehavior from './CleanUpBusinessRuleTaskBehavior';
import CleanUpEndEventBehavior from './CleanUpEndEventBehavior';
import CleanUpExecutionListenersBehavior from './CleanUpExecutionListenersBehavior';
import CleanUpMessageRefBehavior from './CleanUpMessageRefBehavior';
import CleanUpTaskListenersBehavior from './CleanUpTaskListenersBehavior';
import CleanUpSubscriptionBehavior from './CleanUpSubscriptionBehavior';
import CleanUpTimerExpressionBehavior from './CleanUpTimerExpressionBehavior';
import CopyPasteBehavior from './CopyPasteBehavior';
import CreateKunpengCallActivityBehavior from './CreateKunpengCallActivityBehavior';
import CreateKunpengUserTaskBehavior from './CreateKunpengUserTaskBehavior';
import DeleteParticipantBehaviour from './shared/DeleteParticipantBehaviour';
import FormsBehavior from './FormsBehavior';
import RemoveAssignmentDefinitionBehavior from './RemoveAssignmentDefinitionBehavior';
import RemoveTaskScheduleBehavior from './RemoveTaskScheduleBehavior';
import CallActivityVariablesPropagationBehavior from './CallActivityVariablesPropagationBehavior';
import VersionTagBehavior from './VersionTagBehavior';

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
    'copyPasteBehavior',
    'createKunpengCallActivityBehavior',
    'createKunpengUserTaskBehavior',
    'deleteParticipantBehaviour',
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
  copyPasteBehavior: [ 'type', CopyPasteBehavior ],
  createKunpengCallActivityBehavior: [ 'type', CreateKunpengCallActivityBehavior ],
  createKunpengUserTaskBehavior: [ 'type', CreateKunpengUserTaskBehavior ],
  deleteParticipantBehaviour: [ 'type', DeleteParticipantBehaviour ],
  formsBehavior: [ 'type', FormsBehavior ],
  removeAssignmentDefinitionBehavior: [ 'type', RemoveAssignmentDefinitionBehavior ],
  removeTaskScheduleBehavior: [ 'type', RemoveTaskScheduleBehavior ],
  versionTagBehavior: [ 'type', VersionTagBehavior ]
};
