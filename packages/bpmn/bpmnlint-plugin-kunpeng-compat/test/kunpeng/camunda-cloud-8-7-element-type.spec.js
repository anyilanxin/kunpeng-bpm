const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/element-type');

const {
  withConfig,
  createModdle,
  createProcess
} = require('../helper');

const valid = [
  ...require('./camunda-cloud-8-6-element-type.spec').valid,
  {
    name: 'ad-hoc subprocess',
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:extensionElements>
          <kunpeng:adHoc activeElementsCollection="=items" />
        </bpmn:extensionElements>
        <bpmn:task id="Activity_167ttdt" />
      </bpmn:adHocSubProcess>
    `))
  }
];

module.exports.valid = valid;

RuleTester.verify('camunda-cloud-8-7-element-type', rule, {
  valid: withConfig(valid, { version: '8.7' }),
  invalid: []
});
