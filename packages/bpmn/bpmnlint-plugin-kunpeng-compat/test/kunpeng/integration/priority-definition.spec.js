const { expect } = require('chai');

const Linter = require('bpmnlint/lib/linter');

const NodeResolver = require('bpmnlint/lib/resolver/node-resolver');

const { readModdle } = require('../../helper');

const versions = [
  '8.6'
];

describe('integration - priority definition', function() {

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
          const { root } = await readModdle('test/kunpeng/integration/priority-definition.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/priority-definition' ]).not.to.exist;
        });


        it('should not have errors for number type', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/priority-definition.bpmn');

          root.rootElements[0].flowElements[0].extensionElements.values[0].priority = 40;

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/priority-definition' ]).not.to.exist;
        });

      });


      describe('errors', function() {

        it('should have errors', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/priority-definition-errors.bpmn');

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/priority-definition' ]).to.exist;
        });


        it('should not have errors for number type', async function() {

          // given
          const { root } = await readModdle('test/kunpeng/integration/priority-definition.bpmn');

          root.rootElements[0].flowElements[0].extensionElements.values[0].priority = -40;

          // when
          const reports = await linter.lint(root);

          // then
          expect(reports[ '@kunpeng/kunpeng-compat/priority-definition' ]).to.exist;
        });

      });

    });

  });

});
