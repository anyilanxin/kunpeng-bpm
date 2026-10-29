const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

describe('integration - user-task-definition', function() {

  [
    '1.0',
    '1.1',
    '1.2',
    '1.3',
    '8.0',
    '8.1',
    '8.2',
    '8.3',
    '8.4'
  ].forEach(function(version) {

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
          const { root } = await readModdle('test/kunpeng/integration/user-task-definition.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/user-task-definition' ]).not.to.exist;
        });

      });


      describe('warnings', function() {

        it('should have warnings', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/user-task-definition-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/user-task-definition' ]).to.exist;
        });

      });

    });

  });

});