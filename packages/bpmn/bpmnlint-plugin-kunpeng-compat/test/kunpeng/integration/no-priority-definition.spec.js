const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

const versions = [
  '8.2',
  '8.3',
  '8.4',
  '8.5'
];

describe('integration - no-priority-definition', function() {

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
          const { root } = await readModdle('test/kunpeng/integration/no-priority-definition.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/no-priority-definition' ]).not.to.exist;
        });

      });


      describe('errors', function() {

        it('should have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/no-priority-definition-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/no-priority-definition' ]).to.exist;
        });

      });

    });

  });

});
