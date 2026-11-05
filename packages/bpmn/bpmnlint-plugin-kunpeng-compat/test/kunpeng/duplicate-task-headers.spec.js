const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/duplicate-task-headers');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'service task',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="key1" />
            <kunpeng:header key="key2" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'send task',
    moddleElement: createModdle(createProcess(`
      <bpmn:sendTask id="SendTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="key1" />
            <kunpeng:header key="key2" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:sendTask>
    `))
  },
  {
    name: 'user task',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="key1" />
            <kunpeng:header key="key2" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'business rule task',
    moddleElement: createModdle(createProcess(`
      <bpmn:businessRuleTask id="BusinessRuleTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskDefinition type="foo" />
          <kunpeng:taskHeaders>
            <kunpeng:header key="key1" />
            <kunpeng:header key="key2" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:businessRuleTask>
    `))
  },
  {
    name: 'script task',
    moddleElement: createModdle(createProcess(`
      <bpmn:scriptTask id="ScriptTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="key1" />
            <kunpeng:header key="key2" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:scriptTask>
    `))
  },
  {
    name: 'message throw event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateThrowEvent id="MessageEvent_1">
        <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="key1" />
            <kunpeng:header key="key2" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:intermediateThrowEvent>
    `))
  },
  {
    name: 'service task (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:serviceTask id="ServiceTask_1">
          <bpmn:extensionElements>
            <kunpeng:taskHeaders>
              <kunpeng:header key="foo" />
              <kunpeng:header key="foo" />
            </kunpeng:taskHeaders>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'service task',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="foo" />
            <kunpeng:header key="foo" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <foo>',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 0, 'values', 0, 'key' ],
        [ 'extensionElements', 'values', 0, 'values', 1, 'key' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
        node: 'kunpeng:TaskHeaders',
        parentNode: 'ServiceTask_1',
        duplicatedProperty: 'key',
        duplicatedPropertyValue: 'foo',
        properties: [
          'kunpeng:Header',
          'kunpeng:Header'
        ],
        propertiesName: 'values'
      }
    }
  },
  {
    name: 'service task (multiple duplicates)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="foo" />
            <kunpeng:header key="foo" />
            <kunpeng:header key="foo" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: [
      {
        id: 'ServiceTask_1',
        message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <foo>',
        path: null,
        paths: [
          [ 'extensionElements', 'values', 0, 'values', 0, 'key' ],
          [ 'extensionElements', 'values', 0, 'values', 1, 'key' ],
          [ 'extensionElements', 'values', 0, 'values', 2, 'key' ]
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
          node: 'kunpeng:TaskHeaders',
          parentNode: 'ServiceTask_1',
          duplicatedProperty: 'key',
          duplicatedPropertyValue: 'foo',
          properties: [
            'kunpeng:Header',
            'kunpeng:Header',
            'kunpeng:Header'
          ],
          propertiesName: 'values'
        }
      }
    ]
  },
  {
    name: 'service task (multiple duplicates)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="foo" />
            <kunpeng:header key="foo" />
            <kunpeng:header key="bar" />
            <kunpeng:header key="bar" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: [
      {
        id: 'ServiceTask_1',
        message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <foo>',
        path: null,
        paths: [
          [ 'extensionElements', 'values', 0, 'values', 0, 'key' ],
          [ 'extensionElements', 'values', 0, 'values', 1, 'key' ]
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
          node: 'kunpeng:TaskHeaders',
          parentNode: 'ServiceTask_1',
          duplicatedProperty: 'key',
          duplicatedPropertyValue: 'foo',
          properties: [
            'kunpeng:Header',
            'kunpeng:Header'
          ],
          propertiesName: 'values'
        }
      },
      {
        id: 'ServiceTask_1',
        message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <bar>',
        path: null,
        paths: [
          [ 'extensionElements', 'values', 0, 'values', 2, 'key' ],
          [ 'extensionElements', 'values', 0, 'values', 3, 'key' ]
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
          node: 'kunpeng:TaskHeaders',
          parentNode: 'ServiceTask_1',
          duplicatedProperty: 'key',
          duplicatedPropertyValue: 'bar',
          properties: [
            'kunpeng:Header',
            'kunpeng:Header'
          ],
          propertiesName: 'values'
        }
      }
    ]
  },
  {
    name: 'service task (no key)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header />
            <kunpeng:header />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <undefined>',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 0, 'values', 0, 'key' ],
        [ 'extensionElements', 'values', 0, 'values', 1, 'key' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
        node: 'kunpeng:TaskHeaders',
        parentNode: 'ServiceTask_1',
        duplicatedProperty: 'key',
        duplicatedPropertyValue: undefined,
        properties: [
          'kunpeng:Header',
          'kunpeng:Header'
        ],
        propertiesName: 'values'
      }
    }
  },
  {
    name: 'send task',
    moddleElement: createModdle(createProcess(`
      <bpmn:sendTask id="SendTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="foo" />
            <kunpeng:header key="foo" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:sendTask>
    `)),
    report: {
      id: 'SendTask_1',
      message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <foo>',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 0, 'values', 0, 'key' ],
        [ 'extensionElements', 'values', 0, 'values', 1, 'key' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
        node: 'kunpeng:TaskHeaders',
        parentNode: 'SendTask_1',
        duplicatedProperty: 'key',
        duplicatedPropertyValue: 'foo',
        properties: [
          'kunpeng:Header',
          'kunpeng:Header'
        ],
        propertiesName: 'values'
      }
    }
  },
  {
    name: 'user task',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="foo" />
            <kunpeng:header key="foo" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <foo>',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 0, 'values', 0, 'key' ],
        [ 'extensionElements', 'values', 0, 'values', 1, 'key' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
        node: 'kunpeng:TaskHeaders',
        parentNode: 'UserTask_1',
        duplicatedProperty: 'key',
        duplicatedPropertyValue: 'foo',
        properties: [
          'kunpeng:Header',
          'kunpeng:Header'
        ],
        propertiesName: 'values'
      }
    }
  },
  {
    name: 'business rule task',
    moddleElement: createModdle(createProcess(`
      <bpmn:businessRuleTask id="BusinessRuleTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskDefinition type="foo" />
          <kunpeng:taskHeaders>
            <kunpeng:header key="foo" />
            <kunpeng:header key="foo" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:businessRuleTask>
    `)),
    report: {
      id: 'BusinessRuleTask_1',
      message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <foo>',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 1, 'values', 0, 'key' ],
        [ 'extensionElements', 'values', 1, 'values', 1, 'key' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
        node: 'kunpeng:TaskHeaders',
        parentNode: 'BusinessRuleTask_1',
        duplicatedProperty: 'key',
        duplicatedPropertyValue: 'foo',
        properties: [
          'kunpeng:Header',
          'kunpeng:Header'
        ],
        propertiesName: 'values'
      }
    }
  },
  {
    name: 'script task',
    moddleElement: createModdle(createProcess(`
      <bpmn:scriptTask id="ScriptTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="foo" />
            <kunpeng:header key="foo" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:scriptTask>
    `)),
    report: {
      id: 'ScriptTask_1',
      message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <foo>',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 0, 'values', 0, 'key' ],
        [ 'extensionElements', 'values', 0, 'values', 1, 'key' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
        node: 'kunpeng:TaskHeaders',
        parentNode: 'ScriptTask_1',
        duplicatedProperty: 'key',
        duplicatedPropertyValue: 'foo',
        properties: [
          'kunpeng:Header',
          'kunpeng:Header'
        ],
        propertiesName: 'values'
      }
    }
  },
  {
    name: 'message throw event',
    moddleElement: createModdle(createProcess(`
      <bpmn:intermediateThrowEvent id="MessageEvent_1">
        <bpmn:messageEventDefinition id="MessageEventDefinition_1" />
        <bpmn:extensionElements>
          <kunpeng:taskHeaders>
            <kunpeng:header key="foo" />
            <kunpeng:header key="foo" />
          </kunpeng:taskHeaders>
        </bpmn:extensionElements>
      </bpmn:intermediateThrowEvent>
    `)),
    report: {
      id: 'MessageEvent_1',
      message: 'Properties of type <kunpeng:Header> have property <key> with duplicate value of <foo>',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 0, 'values', 0, 'key' ],
        [ 'extensionElements', 'values', 0, 'values', 1, 'key' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
        node: 'kunpeng:TaskHeaders',
        parentNode: 'MessageEvent_1',
        duplicatedProperty: 'key',
        duplicatedPropertyValue: 'foo',
        properties: [
          'kunpeng:Header',
          'kunpeng:Header'
        ],
        propertiesName: 'values'
      }
    }
  }
];

RuleTester.verify('task-headers', rule, {
  valid,
  invalid
});