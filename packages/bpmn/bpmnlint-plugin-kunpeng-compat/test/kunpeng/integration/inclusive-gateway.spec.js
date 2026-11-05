const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

const versions = [
  '8.1',
  '8.2'
];

describe('integration - inclusive-gateway', function() {

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

      describe('no errors', function() {

        it('should not have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/inclusive-gateway.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/inclusive-gateway' ]).not.to.exist;
        });

      });


      describe('errors', function() {

        it('should have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/inclusive-gateway-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/inclusive-gateway' ]).to.exist;
        });

      });

    });

  });

});