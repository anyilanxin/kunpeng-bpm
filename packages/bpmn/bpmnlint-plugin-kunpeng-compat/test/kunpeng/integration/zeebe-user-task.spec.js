const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

const versions = [
  '8.6',
  '8.7'
];

describe('integration - zeebe-user-task', function() {

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
          const { root } = await readModdle('test/kunpeng/integration/zeebe-user-task.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/zeebe-user-task' ]).to.be.undefined;
        });

      });


      describe('errors', function() {

        it('should have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/zeebe-user-task-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/zeebe-user-task' ]).to.exist;
          expect(reports[ '@kunpeng/kunpeng-compat/zeebe-user-task' ]).to.have.lengthOf(1);

          const [ error ] = reports[ '@kunpeng/kunpeng-compat/zeebe-user-task' ];

          expect(error.message).to.equal('Element of type <bpmn:UserTask> must have one extension element of type <kunpeng:UserTask>');
          expect(error.id).to.equal('UserTask_1');
        });

      });

    });

  });

});
