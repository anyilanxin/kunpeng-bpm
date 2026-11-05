const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../../helper');

const versions = [

  '8.5',
  '8.6',
  '8.7'
];

describe('integration - bpmnlint/start-event-required', function() {

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
          const { root } = await readModdle('test/kunpeng/integration/bpmnlint/start-event-required.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ 'start-event-required' ]).not.to.exist;
        });

      });


      describe('errors', function() {

        it('should have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/bpmnlint/start-event-required-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ 'start-event-required' ]).to.exist;
        });

      });

    });

  });

});