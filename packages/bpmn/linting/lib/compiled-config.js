
const cache = {};

/**
 * A resolver that caches rules and configuration as part of the bundle,
 * making them accessible in the browser.
 *
 * @param {Object} cache
 */
function Resolver() {}

Resolver.prototype.resolveRule = function(pkg, ruleName) {

  const rule = cache[pkg + '/' + ruleName];

  if (!rule) {
    throw new Error('cannot resolve rule <' + pkg + '/' + ruleName + '>: not bundled');
  }

  return rule;
};

Resolver.prototype.resolveConfig = function(pkg, configName) {
  throw new Error(
    'cannot resolve config <' + configName + '> in <' + pkg +'>: not bundled'
  );
};

const resolver = new Resolver();

const rules = {
  "@kunpeng-io/kunpeng-compat/ad-hoc-sub-process": "error",
  "@kunpeng-io/kunpeng-compat/agent-fromai-contract": "error",
  "@kunpeng-io/kunpeng-compat/agent-tool-documentation": "warn",
  "@kunpeng-io/kunpeng-compat/agent-tool-output-key": "warn",
  "@kunpeng-io/kunpeng-compat/before-all-execution-listener": "error",
  "@kunpeng-io/kunpeng-compat/element-type": "error",
  "@kunpeng-io/kunpeng-compat/cancel-execution-listener": "error",
  "@kunpeng-io/kunpeng-compat/called-element": "error",
  "@kunpeng-io/kunpeng-compat/collapsed-subprocess": "error",
  "@kunpeng-io/kunpeng-compat/connector-properties": "warn",
  "@kunpeng-io/kunpeng-compat/duplicate-execution-listener-headers": "error",
  "@kunpeng-io/kunpeng-compat/duplicate-execution-listeners": "error",
  "@kunpeng-io/kunpeng-compat/duplicate-task-headers": "error",
  "@kunpeng-io/kunpeng-compat/error-reference": "error",
  "@kunpeng-io/kunpeng-compat/escalation-boundary-event-attached-to-ref": "error",
  "@kunpeng-io/kunpeng-compat/escalation-reference": "error",
  "@kunpeng-io/kunpeng-compat/event-based-gateway-target": "error",
  "@kunpeng-io/kunpeng-compat/executable-process": "error",
  "@kunpeng-io/kunpeng-compat/execution-listener": "error",
  "@kunpeng-io/kunpeng-compat/feel": "error",
  "@kunpeng-io/kunpeng-compat/feel-compatibility": "error",
  "@kunpeng-io/kunpeng-compat/implementation": "error",
  "@kunpeng-io/kunpeng-compat/inclusive-gateway": "error",
  "@kunpeng-io/kunpeng-compat/link-event": "error",
  "@kunpeng-io/kunpeng-compat/loop-characteristics": "error",
  "@kunpeng-io/kunpeng-compat/io-mapping": "error",
  "@kunpeng-io/kunpeng-compat/message-reference": "error",
  "@kunpeng-io/kunpeng-compat/no-binding-type": "error",
  "@kunpeng-io/kunpeng-compat/no-business-id": "error",
  "@kunpeng-io/kunpeng-compat/no-before-all-execution-listener": "error",
  "@kunpeng-io/kunpeng-compat/no-candidate-users": "error",
  "@kunpeng-io/kunpeng-compat/no-cancel-execution-listener": "error",
  "@kunpeng-io/kunpeng-compat/no-execution-listener-headers": "error",
  "@kunpeng-io/kunpeng-compat/no-execution-listeners": "error",
  "@kunpeng-io/kunpeng-compat/no-expression": "error",
  "@kunpeng-io/kunpeng-compat/no-interrupting-event-subprocess": "error",
  "@kunpeng-io/kunpeng-compat/no-job-priority-definition": "error",
  "@kunpeng-io/kunpeng-compat/no-loop": "error",
  "@kunpeng-io/kunpeng-compat/no-multiple-none-start-events": "error",
  "@kunpeng-io/kunpeng-compat/no-priority-definition": "error",
  "@kunpeng-io/kunpeng-compat/no-propagate-all-parent-variables": "error",
  "@kunpeng-io/kunpeng-compat/no-signal-event-sub-process": "error",
  "@kunpeng-io/kunpeng-compat/no-task-schedule": "error",
  "@kunpeng-io/kunpeng-compat/no-task-listeners": "error",
  "@kunpeng-io/kunpeng-compat/no-template": "error",
  "@kunpeng-io/kunpeng-compat/no-version-tag": "error",
  "@kunpeng-io/kunpeng-compat/no-zeebe-properties": "error",
  "@kunpeng-io/kunpeng-compat/no-zeebe-user-task": "error",
  "@kunpeng-io/kunpeng-compat/priority-definition": "error",
  "@kunpeng-io/kunpeng-compat/zeebe-user-task": "warn",
  "@kunpeng-io/kunpeng-compat/secrets": "warn",
  "@kunpeng-io/kunpeng-compat/sequence-flow-condition": "error",
  "@kunpeng-io/kunpeng-compat/signal-reference": "error",
  "@kunpeng-io/kunpeng-compat/start-event-form": "error",
  "@kunpeng-io/kunpeng-compat/start-event-form-embedded": "warn",
  "@kunpeng-io/kunpeng-compat/subscription": "error",
  "@kunpeng-io/kunpeng-compat/task-listener": "error",
  "@kunpeng-io/kunpeng-compat/task-schedule": "error",
  "@kunpeng-io/kunpeng-compat/timer": "error",
  "@kunpeng-io/kunpeng-compat/user-task-definition": "warn",
  "@kunpeng-io/kunpeng-compat/user-task-form": "error",
  "@kunpeng-io/kunpeng-compat/variable-name": "error",
  "@kunpeng-io/kunpeng-compat/version-tag": "error",
  "@kunpeng-io/kunpeng-compat/wait-for-completion": "error",
  "start-event-required": "error",
  "ad-hoc-sub-process": "error",
  "conditional-event": "error",
  "event-based-gateway": "error",
  "event-sub-process-typed-start-event": "error",
  "link-event": "error",
  "no-duplicate-sequence-flows": "warn",
  "sub-process-blank-start-event": "error",
  "single-blank-start-event": "error"
};

const config = {
  rules: rules
};

const moddleExtensions = {};

const bundle = {
  resolver: resolver,
  config: config,
  moddleExtensions: moddleExtensions
};

export { resolver, config, moddleExtensions };

export default bundle;

import rule_0 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/ad-hoc-sub-process';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/ad-hoc-sub-process'] = rule_0;

import rule_1 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/agent-fromai-contract';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/agent-fromai-contract'] = rule_1;

import rule_2 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/agent-tool-documentation';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/agent-tool-documentation'] = rule_2;

import rule_3 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/agent-tool-output-key';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/agent-tool-output-key'] = rule_3;

import rule_4 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/before-all-execution-listener';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/before-all-execution-listener'] = rule_4;

import rule_5 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/element-type';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/element-type'] = rule_5;

import rule_6 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/cancel-execution-listener';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/cancel-execution-listener'] = rule_6;

import rule_7 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/called-element';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/called-element'] = rule_7;

import rule_8 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/collapsed-subprocess';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/collapsed-subprocess'] = rule_8;

import rule_9 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/connector-properties';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/connector-properties'] = rule_9;

import rule_10 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/duplicate-execution-listener-headers';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/duplicate-execution-listener-headers'] = rule_10;

import rule_11 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/duplicate-execution-listeners';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/duplicate-execution-listeners'] = rule_11;

import rule_12 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/duplicate-task-headers';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/duplicate-task-headers'] = rule_12;

import rule_13 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/error-reference';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/error-reference'] = rule_13;

import rule_14 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/escalation-boundary-event-attached-to-ref';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/escalation-boundary-event-attached-to-ref'] = rule_14;

import rule_15 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/escalation-reference';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/escalation-reference'] = rule_15;

import rule_16 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/event-based-gateway-target';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/event-based-gateway-target'] = rule_16;

import rule_17 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/executable-process';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/executable-process'] = rule_17;

import rule_18 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/execution-listener';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/execution-listener'] = rule_18;

import rule_19 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/feel';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/feel'] = rule_19;

import rule_20 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/feel-compatibility';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/feel-compatibility'] = rule_20;

import rule_21 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/implementation';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/implementation'] = rule_21;

import rule_22 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/inclusive-gateway';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/inclusive-gateway'] = rule_22;

import rule_23 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/link-event';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/link-event'] = rule_23;

import rule_24 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/loop-characteristics';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/loop-characteristics'] = rule_24;

import rule_25 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/io-mapping';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/io-mapping'] = rule_25;

import rule_26 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/message-reference';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/message-reference'] = rule_26;

import rule_27 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-binding-type';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-binding-type'] = rule_27;

import rule_28 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-business-id';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-business-id'] = rule_28;

import rule_29 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-before-all-execution-listener';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-before-all-execution-listener'] = rule_29;

import rule_30 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-candidate-users';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-candidate-users'] = rule_30;

import rule_31 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-cancel-execution-listener';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-cancel-execution-listener'] = rule_31;

import rule_32 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-execution-listener-headers';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-execution-listener-headers'] = rule_32;

import rule_33 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-execution-listeners';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-execution-listeners'] = rule_33;

import rule_34 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-expression';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-expression'] = rule_34;

import rule_35 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-interrupting-event-subprocess';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-interrupting-event-subprocess'] = rule_35;

import rule_36 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-job-priority-definition';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-job-priority-definition'] = rule_36;

import rule_37 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-loop';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-loop'] = rule_37;

import rule_38 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-multiple-none-start-events';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-multiple-none-start-events'] = rule_38;

import rule_39 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-priority-definition';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-priority-definition'] = rule_39;

import rule_40 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-propagate-all-parent-variables';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-propagate-all-parent-variables'] = rule_40;

import rule_41 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-signal-event-sub-process';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-signal-event-sub-process'] = rule_41;

import rule_42 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-task-schedule';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-task-schedule'] = rule_42;

import rule_43 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-task-listeners';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-task-listeners'] = rule_43;

import rule_44 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-template';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-template'] = rule_44;

import rule_45 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-version-tag';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-version-tag'] = rule_45;

import rule_46 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-zeebe-properties';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-zeebe-properties'] = rule_46;

import rule_47 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/no-zeebe-user-task';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/no-zeebe-user-task'] = rule_47;

import rule_48 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/priority-definition';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/priority-definition'] = rule_48;

import rule_49 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/zeebe-user-task';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/zeebe-user-task'] = rule_49;

import rule_50 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/secrets';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/secrets'] = rule_50;

import rule_51 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/sequence-flow-condition';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/sequence-flow-condition'] = rule_51;

import rule_52 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/signal-reference';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/signal-reference'] = rule_52;

import rule_53 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/start-event-form';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/start-event-form'] = rule_53;

import rule_54 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/start-event-form-embedded';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/start-event-form-embedded'] = rule_54;

import rule_55 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/subscription';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/subscription'] = rule_55;

import rule_56 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/task-listener';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/task-listener'] = rule_56;

import rule_57 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/task-schedule';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/task-schedule'] = rule_57;

import rule_58 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/timer';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/timer'] = rule_58;

import rule_59 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/user-task-definition';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/user-task-definition'] = rule_59;

import rule_60 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/user-task-form';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/user-task-form'] = rule_60;

import rule_61 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/variable-name';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/variable-name'] = rule_61;

import rule_62 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/version-tag';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/version-tag'] = rule_62;

import rule_63 from '@kunpeng-js/bpmnlint-plugin-kunpeng-compat/rules/kunpeng/wait-for-completion';

cache['@kunpeng-js/bpmnlint-plugin-kunpeng-compat/wait-for-completion'] = rule_63;

import rule_64 from 'bpmnlint/rules/start-event-required';

cache['bpmnlint/start-event-required'] = rule_64;

import rule_65 from 'bpmnlint/rules/ad-hoc-sub-process';

cache['bpmnlint/ad-hoc-sub-process'] = rule_65;

import rule_66 from 'bpmnlint/rules/conditional-event';

cache['bpmnlint/conditional-event'] = rule_66;

import rule_67 from 'bpmnlint/rules/event-based-gateway';

cache['bpmnlint/event-based-gateway'] = rule_67;

import rule_68 from 'bpmnlint/rules/event-sub-process-typed-start-event';

cache['bpmnlint/event-sub-process-typed-start-event'] = rule_68;

import rule_69 from 'bpmnlint/rules/link-event';

cache['bpmnlint/link-event'] = rule_69;

import rule_70 from 'bpmnlint/rules/no-duplicate-sequence-flows';

cache['bpmnlint/no-duplicate-sequence-flows'] = rule_70;

import rule_71 from 'bpmnlint/rules/sub-process-blank-start-event';

cache['bpmnlint/sub-process-blank-start-event'] = rule_71;

import rule_72 from 'bpmnlint/rules/single-blank-start-event';

cache['bpmnlint/single-blank-start-event'] = rule_72;
