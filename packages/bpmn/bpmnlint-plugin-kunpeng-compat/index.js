const { omit } = require('min-dash');

const camundaCloud10Rules = withConfig({
  'implementation': 'error',
  'called-element': 'error',
  'collapsed-subprocess': 'error',
  'duplicate-task-headers': 'error',
  'element-type': 'error',
  'error-reference': 'error',
  'event-based-gateway-target': 'error',
  'executable-process': 'error',
  'loop-characteristics': 'error',
  'message-reference': 'error',
  'io-mapping': 'error',
  'no-binding-type': 'error',
  'no-business-id': 'error',
  'no-candidate-users': 'error',
  'no-cancel-execution-listener': 'error',
  'no-execution-listener-headers': 'error',
  'no-execution-listeners': 'error',
  'no-expression': 'error',
  'no-job-priority-definition': 'error',
  'no-loop': 'error',
  'no-multiple-none-start-events': 'error',
  'no-priority-definition': 'error',
  'no-propagate-all-parent-variables': 'error',
  'no-task-listeners': 'error',
  'no-task-schedule': 'error',
  'no-template': 'error',
  'no-version-tag': 'error',
  'no-zeebe-properties': 'error',
  'no-zeebe-user-task': 'error',
  'sequence-flow-condition': 'error',
  'start-event-form': 'error',
  'subscription': 'error',
  'timer': 'error',
  'user-task-definition': 'warn',
  'user-task-form': 'error',
  'variable-name': 'error',
  'feel': 'error',
  'feel-compatibility': 'error',
  'bpmnlint/start-event-required': 'error',
}, { version: '1.0' });

const camundaCloud11Rules = withConfig(camundaCloud10Rules, { version: '1.1' });

const camundaCloud12Rules = withConfig(camundaCloud11Rules, { version: '1.2' });

const camundaCloud13Rules = withConfig(camundaCloud12Rules, { version: '1.3' });

const camundaCloud80Rules = withConfig({
  ...omit(camundaCloud13Rules, 'no-template'),
  'connector-properties': 'warn'
}, { version: '8.0' });

const camundaCloud81Rules = withConfig({
  ...omit(camundaCloud80Rules, 'no-zeebe-properties'),
  'inclusive-gateway': 'error'
}, { version: '8.1' });

const camundaCloud82Rules = withConfig({
  ...omit(camundaCloud81Rules, [
    'no-candidate-users',
    'no-propagate-all-parent-variables',
    'no-task-schedule'
  ]),
  'escalation-boundary-event-attached-to-ref': 'error',
  'escalation-reference': 'error',
  'link-event': 'error',
  'no-signal-event-sub-process': 'error',
  'task-schedule': 'error'
}, { version: '8.2' });

const camundaCloud83Rules = withConfig({
  ...omit(camundaCloud82Rules, 'no-signal-event-sub-process'),
  'secrets': 'warn',
  'signal-reference': 'error'
}, { version: '8.3' });

const camundaCloud84Rules = withConfig(
  omit(camundaCloud83Rules, 'collapsed-subprocess'), { version: '8.4' });

const camundaCloud85Rules = withConfig({
  ...omit(camundaCloud83Rules, [
    'collapsed-subprocess',
    'no-zeebe-user-task'
  ]),
  'wait-for-completion': 'error'
}, { version: '8.5' });

const camundaCloud86Rules = withConfig({
  ...omit(camundaCloud85Rules, [
    'inclusive-gateway',
    'no-binding-type',
    'no-execution-listeners',
    'no-priority-definition',
    'no-version-tag'
  ]),
  'duplicate-execution-listeners': 'error',
  'execution-listener': 'error',
  'no-before-all-execution-listener': 'error',
  'priority-definition': 'error',
  'version-tag': 'error',
  'zeebe-user-task': 'warn',
}, { version: '8.6' });

const camundaCloud87Rules = withConfig({
  ...camundaCloud86Rules,
  'ad-hoc-sub-process': 'error',
  'no-interrupting-event-subprocess': 'error'
}, { version: '8.7' });

const camundaCloud88Rules = withConfig({
  ...omit(camundaCloud87Rules, [ 'no-task-listeners' ]),
  'agent-tool-documentation': 'warn',
  'agent-tool-output-key': 'warn',
  'agent-fromai-contract': 'error',
  'task-listener': 'error'
}, { version: '8.8' });

const camundaCloud89Rules = withConfig({
  ...camundaCloud88Rules,
  'start-event-form-embedded': 'warn'
}, { version: '8.9' });

const camundaCloud810Rules = withConfig({
  ...omit(camundaCloud89Rules, [
    'no-business-id',
    'no-execution-listener-headers',
    'no-before-all-execution-listener',
    'no-cancel-execution-listener',
    'no-job-priority-definition'
  ]),
  'before-all-execution-listener': 'error',
  'cancel-execution-listener': 'error',
  'duplicate-execution-listener-headers': 'error'
}, { version: '8.10' });

const bpmnlintRules = [
  'bpmnlint/start-event-required'
];

const rules = {
  'ad-hoc-sub-process': './rules/kunpeng/ad-hoc-sub-process',
  'agent-fromai-contract': './rules/kunpeng/agent-fromai-contract',
  'agent-tool-documentation': './rules/kunpeng/agent-tool-documentation',
  'agent-tool-output-key': './rules/kunpeng/agent-tool-output-key',
  'before-all-execution-listener': './rules/kunpeng/before-all-execution-listener',
  'element-type': './rules/kunpeng/element-type',
  'cancel-execution-listener': './rules/kunpeng/cancel-execution-listener',
  'called-element': './rules/kunpeng/called-element',
  'collapsed-subprocess': './rules/kunpeng/collapsed-subprocess',
  'connector-properties': './rules/kunpeng/connector-properties',
  'duplicate-execution-listener-headers': './rules/kunpeng/duplicate-execution-listener-headers',
  'duplicate-execution-listeners': './rules/kunpeng/duplicate-execution-listeners',
  'duplicate-task-headers': './rules/kunpeng/duplicate-task-headers',
  'error-reference': './rules/kunpeng/error-reference',
  'escalation-boundary-event-attached-to-ref': './rules/kunpeng/escalation-boundary-event-attached-to-ref',
  'escalation-reference': './rules/kunpeng/escalation-reference',
  'event-based-gateway-target': './rules/kunpeng/event-based-gateway-target',
  'executable-process': './rules/kunpeng/executable-process',
  'execution-listener': './rules/kunpeng/execution-listener',
  'feel': './rules/kunpeng/feel',
  'feel-compatibility': './rules/kunpeng/feel-compatibility',
  'implementation': './rules/kunpeng/implementation',
  'inclusive-gateway': './rules/kunpeng/inclusive-gateway',
  'link-event': './rules/kunpeng/link-event',
  'loop-characteristics': './rules/kunpeng/loop-characteristics',
  'io-mapping': './rules/kunpeng/io-mapping',
  'message-reference': './rules/kunpeng/message-reference',
  'no-binding-type': './rules/kunpeng/no-binding-type',
  'no-business-id': './rules/kunpeng/no-business-id',
  'no-before-all-execution-listener': './rules/kunpeng/no-before-all-execution-listener',
  'no-candidate-users': './rules/kunpeng/no-candidate-users',
  'no-cancel-execution-listener': './rules/kunpeng/no-cancel-execution-listener',
  'no-execution-listener-headers': './rules/kunpeng/no-execution-listener-headers',
  'no-execution-listeners': './rules/kunpeng/no-execution-listeners',
  'no-expression': './rules/kunpeng/no-expression',
  'no-interrupting-event-subprocess': './rules/kunpeng/no-interrupting-event-subprocess',
  'no-job-priority-definition': './rules/kunpeng/no-job-priority-definition',
  'no-loop': './rules/kunpeng/no-loop',
  'no-multiple-none-start-events': './rules/kunpeng/no-multiple-none-start-events',
  'no-priority-definition': './rules/kunpeng/no-priority-definition',
  'no-propagate-all-parent-variables': './rules/kunpeng/no-propagate-all-parent-variables',
  'no-signal-event-sub-process': './rules/kunpeng/no-signal-event-sub-process',
  'no-task-schedule': './rules/kunpeng/no-task-schedule',
  'no-task-listeners': './rules/kunpeng/no-task-listeners',
  'no-template': './rules/kunpeng/no-template',
  'no-version-tag': './rules/kunpeng/no-version-tag',
  'no-zeebe-properties': './rules/kunpeng/no-zeebe-properties',
  'no-zeebe-user-task': './rules/kunpeng/no-zeebe-user-task',
  'priority-definition': './rules/kunpeng/priority-definition',
  'zeebe-user-task': './rules/kunpeng/zeebe-user-task',
  'secrets': './rules/kunpeng/secrets',
  'sequence-flow-condition': './rules/kunpeng/sequence-flow-condition',
  'signal-reference': './rules/kunpeng/signal-reference',
  'start-event-form': './rules/kunpeng/start-event-form',
  'start-event-form-embedded': './rules/kunpeng/start-event-form-embedded',
  'subscription': './rules/kunpeng/subscription',
  'task-listener': './rules/kunpeng/task-listener',
  'task-schedule': './rules/kunpeng/task-schedule',
  'timer': './rules/kunpeng/timer',
  'user-task-definition': './rules/kunpeng/user-task-definition',
  'user-task-form': './rules/kunpeng/user-task-form',
  'variable-name': './rules/kunpeng/variable-name',
  'version-tag': './rules/kunpeng/version-tag',
  'wait-for-completion': './rules/kunpeng/wait-for-completion',
  ...bpmnlintRules.reduce((rules, rule) => {
    rules[ rule ] = rule ;
    return rules;
  }, {}),
};

const configs = {
  'camunda-cloud-1-0': {
    rules: camundaCloud10Rules
  },
  'camunda-cloud-1-1': {
    rules: camundaCloud11Rules
  },
  'camunda-cloud-1-2': {
    rules: camundaCloud12Rules
  },
  'camunda-cloud-1-3': {
    rules: camundaCloud13Rules
  },
  'camunda-cloud-8-0': {
    rules: camundaCloud80Rules
  },
  'camunda-cloud-8-1': {
    rules: camundaCloud81Rules
  },
  'camunda-cloud-8-2': {
    rules: camundaCloud82Rules
  },
  'camunda-cloud-8-3': {
    rules: camundaCloud83Rules
  },
  'camunda-cloud-8-4': {
    rules: camundaCloud84Rules
  },
  'camunda-cloud-8-5': {
    rules: camundaCloud85Rules
  },
  'camunda-cloud-8-6': {
    rules: camundaCloud86Rules
  },
  'camunda-cloud-8-7': {
    rules: camundaCloud87Rules
  },
  'camunda-cloud-8-8': {
    rules: camundaCloud88Rules
  },
  'camunda-cloud-8-9': {
    rules: camundaCloud89Rules
  },
  'camunda-cloud-8-10': {
    rules: camundaCloud810Rules
  }
};

module.exports = {
  configs: {
    ...configs,
    'all': {
      rules: Object.keys(rules).reduce((allRules, rule) => {
        return {
          ...allRules,
          [ rule ]: Object.values(configs).reduce((type, { rules }) => {
            if (type) {
              return type;
            }

            if (rules[ rule ]) {
              return Array.isArray(rules[ rule ]) ? rules[ rule ][0] : rules[ rule ];
            }

            return type;
          }, null)
        };
      }, {})
    }
  },
  rules
};

function withConfig(rules, config) {
  let rulesWithConfig = {};

  for (let name in rules) {
    const type = Array.isArray(rules[ name ]) ? rules[ name ][0] : rules[ name ];
    rulesWithConfig[ name ] = [ type, config ];
  }

  return rulesWithConfig;
}
