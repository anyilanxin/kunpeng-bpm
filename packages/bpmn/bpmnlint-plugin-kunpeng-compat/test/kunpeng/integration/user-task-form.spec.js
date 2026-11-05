const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

describe('integration - user-task-form', function() {

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


    describe(`Camunda Cloud ${ version } (form key)`, function() {

      describe('no errors', function() {

        it('should not have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/user-task-form-form-key.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/user-task-form' ]).not.to.exist;
        });

      });


      describe('errors', function() {

        it('should have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/user-task-form-form-key-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/user-task-form' ]).to.exist;
        });

      });

    });

  });


  [
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


    describe(`Camunda Cloud ${ version } (form ID)`, function() {

      describe('no errors', function() {

        it('should not have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/user-task-form-form-id.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/user-task-form' ]).not.to.exist;
        });

      });


      describe('errors', function() {

        it('should have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/user-task-form-form-id-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/user-task-form' ]).to.exist;
        });

      });

    });

  });

});