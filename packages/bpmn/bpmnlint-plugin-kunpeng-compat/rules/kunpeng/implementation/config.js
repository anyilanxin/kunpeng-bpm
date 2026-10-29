module.exports = {
  calledDecision: {
    'bpmn:BusinessRuleTask': '1.3'
  },
  taskDefinition: {
    'bpmn:AdHocSubProcess': '8.8',
    'bpmn:BusinessRuleTask': '1.1',
    'bpmn:IntermediateThrowEvent': {
      'bpmn:MessageEventDefinition': '1.2'
    },
    'bpmn:EndEvent': {
      'bpmn:MessageEventDefinition': '1.2'
    },
    'bpmn:ScriptTask': '1.1',
    'bpmn:SendTask': '1.1',
    'bpmn:ServiceTask': '1.0'
  },
  script: {
    'bpmn:ScriptTask': '8.2'
  }
};