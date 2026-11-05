const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/element-type');

const {
  withConfig,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  ...require('./camunda-cloud-8-3-element-type.spec').valid
];

module.exports.valid = valid;

const invalid = [
  {
    name: 'ad-hoc subprocess',
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Subprocess_1',
      message: 'Element of type <bpmn:AdHocSubProcess> only allowed by Camunda 8.7 or newer',
      path: null,
      data: {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node: 'Subprocess_1',
        parentNode: null,
        allowedVersion: '8.7'
      }
    }
  }
];

RuleTester.verify('camunda-cloud-8-6-element-type', rule, {
  valid: withConfig(valid, { version: '8.6' }),
  invalid: withConfig(invalid, { version: '8.6' }),
});
