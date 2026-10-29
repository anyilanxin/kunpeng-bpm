const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const { createModdle, createProcess } = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const rule = require('../../rules/kunpeng/io-mapping');

const valid = [
  {
    name: 'complete io mapping',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:taskDefinition type="jobType" retries="" />
          <kunpeng:ioMapping>
            <kunpeng:input target="hello" source="=world" />
            <kunpeng:output target="hello" source="=world" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
  },
  {
    name: 'missing input source (allowed by Camunda >= 8.8)',
    config: { version: '8.8' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:taskDefinition type="jobType" retries="" />
          <kunpeng:ioMapping>
            <kunpeng:input target="hello" />
            <kunpeng:output target="hello" source="=world" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
  },
];

const invalid = [
  {
    name: 'missing all io mapping properties',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
       <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:taskDefinition type="jobType" retries="" />
          <kunpeng:ioMapping>
            <kunpeng:input target="" />
            <kunpeng:output target="" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
    report: [
      {
        id: 'ServiceTask',
        message: 'Element of type <kunpeng:Input> without property <source> only allowed by Camunda 8.8 or newer',
        path: [ 'extensionElements', 'values', 1, 'inputParameters', 0, 'source' ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'kunpeng:Input',
          parentNode: 'ServiceTask',
          requiredProperty: 'source',
          allowedVersion: '8.8',
        },
        category: 'error',
      },
      {
        id: 'ServiceTask',
        message: 'Element of type <kunpeng:Input> must have property <target>',
        path: [ 'extensionElements', 'values', 1, 'inputParameters', 0, 'target' ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'kunpeng:Input',
          parentNode: 'ServiceTask',
          requiredProperty: 'target',
        },
        category: 'error',
      },
      {
        id: 'ServiceTask',
        message: 'Element of type <kunpeng:Output> must have property <source>',
        path: [ 'extensionElements', 'values', 1, 'outputParameters', 0, 'source' ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'kunpeng:Output',
          parentNode: 'ServiceTask',
          requiredProperty: 'source',
        },
        category: 'error',
      },
      {
        id: 'ServiceTask',
        message: 'Element of type <kunpeng:Output> must have property <target>',
        path: [ 'extensionElements', 'values', 1, 'outputParameters', 0, 'target' ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'kunpeng:Output',
          parentNode: 'ServiceTask',
          requiredProperty: 'target',
        },
        category: 'error',
      },
    ],
  },
];

RuleTester.verify('io-mapping', rule, {
  valid,
  invalid,
});
