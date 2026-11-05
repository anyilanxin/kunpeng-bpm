const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

const versions = [
  '8.2'
];

describe('integration - task schedule', function() {

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
          const { root } = await readModdle('test/kunpeng/integration/task-schedule.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/task-schedule' ]).not.to.exist;
        });

      });


      describe('errors', function() {

        it('should have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/task-schedule-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/task-schedule' ]).to.exist;
        });

      });

    });

  });

});