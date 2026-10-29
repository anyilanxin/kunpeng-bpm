import StaticResolver from 'bpmnlint/lib/resolver/static-resolver.js';
import rule from 'bpmnlint/rules/no-bpmndi.js';

export default {
  config: {
    rules: {
      'bpmnlint/no-bpmndi': 'warn'
    }
  },
  resolver: new StaticResolver({ 'rule:bpmnlint/no-bpmndi': rule })
};