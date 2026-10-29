const chai = require('chai');

const { expect } = chai;

const sinon = require('sinon');

const { default: sinonChai } = require('sinon-chai');

chai.use(sinonChai);

const {
  getName,
  reportErrors
} = require('../../rules/utils/reporter');

const { createElement } = require('../helper');

describe('utils/reporter', function() {

  describe('#getName', function() {

    it('group', function() {

      // given
      const group = createElement('bpmn:Group', {
        categoryValueRef: createElement('bpmn:CategoryValue', {
          value: 'Foo'
        })
      });

      // when
      const name = getName(group);

      // then
      expect(name).to.equal('Foo');
    });


    it('flow element', function() {

      // given
      const task = createElement('bpmn:Task', {
        name: 'Foo'
      });

      // when
      const name = getName(task);

      // then
      expect(name).to.equal('Foo');
    });


    it('text annotation', function() {

      // given
      const textAnnotation = createElement('bpmn:TextAnnotation', {
        text: 'Foo'
      });

      // when
      const name = getName(textAnnotation);

      // then
      expect(name).to.equal('Foo');
    });

  });

  describe('#reportErrors', function() {

    it('should report errors', function() {

      // given
      const node = createElement('bpmn:Task', {
        id: 'Task_1'
      });

      const reportSpy = sinon.spy();

      const reporter = {
        report: reportSpy
      };

      const errors = [
        {
          message: 'foo',
          foo: 'bar'
        },
        {
          message: 'bar'
        }
      ];

      // when
      reportErrors(node, reporter, errors);

      // then
      expect(reportSpy).to.have.been.calledTwice;

      expect(reportSpy.firstCall.args).to.eql([
        'Task_1',
        'foo',
        {
          foo: 'bar'
        }
      ]);

      expect(reportSpy.secondCall.args).to.eql([
        'Task_1',
        'bar',
        {}
      ]);
    });


    it('should add name', function() {

      // given
      const node = createElement('bpmn:Task', {
        id: 'Task_1',
        name: 'Foo'
      });

      const reportSpy = sinon.spy();

      const reporter = {
        report: reportSpy
      };

      const errors = [
        {
          message: 'foo',
          foo: 'bar'
        }
      ];

      // when
      reportErrors(node, reporter, errors);

      // then
      expect(reportSpy).to.have.been.calledOnce;

      expect(reportSpy.firstCall.args).to.eql([
        'Task_1',
        'foo',
        {
          foo: 'bar',
          name: 'Foo'
        }
      ]);
    });

  });

});