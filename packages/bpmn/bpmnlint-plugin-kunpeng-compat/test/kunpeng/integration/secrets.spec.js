const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

const versions = [
  '8.3'
];

describe('integration - secrets', function() {

  versions.forEach(function(version) {

    let linter;

    beforeEach(function() {
      linter = new Linter({
        config: {
          extends: `plugin:@kunpeng/bpmnlint-plugin-kunpeng-compat/camunda-cloud-${ version.replace('.', '-') }`
        },
        resolver: new NodeResolver()
      });
    });


    describe(`Camunda Cloud ${ version }`, function() {

      describe('no warnings', function() {

        it('should not have warnings', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/secrets.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/secrets' ]).not.to.exist;
        });

      });


      describe('warnings', function() {

        it('should have warnings', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/secrets-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/secrets' ]).to.exist;
        });

      });

    });

  });

});
