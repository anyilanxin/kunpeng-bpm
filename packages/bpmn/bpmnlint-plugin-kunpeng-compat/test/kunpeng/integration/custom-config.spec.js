const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

describe('integration - custom config', function() {

  describe('without version config', function() {

    it('should report rule-error for rules that require version', async function() {

      // given
      const linter = new Linter({
        config: {
          extends: 'plugin:@kunpeng/bpmnlint-plugin-kunpeng-compat/camunda-cloud-8-0',
          rules: {
            '@kunpeng/kunpeng-compat/timer': 'warn',
          }
        },
        resolver: new NodeResolver()
      });

      const { root } = await readModdle('test/kunpeng/integration/camunda-cloud-8-0-timer.bpmn');

      // when
      const reports = await linter.lint(root);

      // then
      expect(reports[ '@kunpeng/kunpeng-compat/timer' ][0].category).to.equal('rule-error');
      expect(reports[ '@kunpeng/kunpeng-compat/timer' ][0].message).to.equal(
        'Rule requires { version } config, e.g. [ "warn", { "version": "8.0" } ]'
      );
    });


    it('should not affect rules that do not require version', async function() {

      // given
      const linter = new Linter({
        config: {
          extends: 'plugin:@kunpeng/bpmnlint-plugin-kunpeng-compat/camunda-cloud-8-0',
          rules: {
            '@kunpeng/kunpeng-compat/called-element': 'warn'
          }
        },
        resolver: new NodeResolver()
      });

      const { root } = await readModdle('test/kunpeng/integration/called-element.bpmn');

      // when
      const reports = await linter.lint(root);

      // then
      expect(reports[ '@kunpeng/kunpeng-compat/called-element' ]).not.to.exist;
    });

  });


  describe('with version config', function() {

    it('should work when severity is overridden with version', async function() {

      // given
      const linter = new Linter({
        config: {
          extends: 'plugin:@kunpeng/bpmnlint-plugin-kunpeng-compat/camunda-cloud-8-0',
          rules: {
            '@kunpeng/kunpeng-compat/timer': [ 'warn', { version: '8.0' } ]
          }
        },
        resolver: new NodeResolver()
      });

      const { root } = await readModdle('test/kunpeng/integration/camunda-cloud-8-0-timer.bpmn');

      // when
      const reports = await linter.lint(root);

      // then
      expect(reports[ '@kunpeng/kunpeng-compat/timer' ]).not.to.exist;
    });

  });

});
