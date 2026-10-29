const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/no-version-tag');

const {
  createDefinitions,
  createModdle
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'process',
    config: { version: '8.5' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true" />
    `))
  },
  {
    name: 'process (version tag) (non-executable process)',
    config: { version: '8.5' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:extensionElements>
          <kunpeng:versionTag value="v1.0.0" />
        </bpmn:extensionElements>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'process (version tag)',
    config: { version: '8.5' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true">
        <bpmn:extensionElements>
          <kunpeng:versionTag value="v1.0.0" />
        </bpmn:extensionElements>
      </bpmn:process>
    `)),
    report: {
      id: 'Process_1',
      message: 'Extension element of type <kunpeng:VersionTag> only allowed by Camunda 8.6',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'Process_1',
        parentNode: null,
        extensionElement: 'kunpeng:VersionTag',
        allowedVersion: '8.6'
      }
    }
  }
];

RuleTester.verify('no-version-tag', rule, {
  valid,
  invalid
});