const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

const versions = [
  '1.0',
  '1.1',
  '1.2',
  '1.3',
  '8.0',
  '8.1',
  '8.2',
  '8.3'
];

describe('integration - sequence-flow-condition', function() {

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
          const { root } = await readModdle('test/kunpeng/integration/sequence-flow-condition.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/sequence-flow-condition' ]).not.to.exist;
        });

      });


      describe('errors', function() {

        it('should have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/sequence-flow-condition-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/sequence-flow-condition' ]).to.exist;
        });

      });


      describe('broken diagram', function() {

        it('should not error on broken diagram with missing sourceRef', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/sequence-flow-condition-broken-diagram.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          // Should not throw an error, even though the diagram is broken
          expect(reports[ '@kunpeng/kunpeng-compat/sequence-flow-condition' ]).not.to.exist;
        });

      });

    });

  });

});