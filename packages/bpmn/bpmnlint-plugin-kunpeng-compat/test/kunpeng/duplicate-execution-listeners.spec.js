const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/duplicate-execution-listeners');

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
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
            <kunpeng:executionListener eventType="start" type="com.example.StartListener_2" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'send task',
    moddleElement: createModdle(createProcess(`
      <bpmn:sendTask id="SendTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
            <kunpeng:executionListener eventType="start" type="com.example.StartListener_2" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:sendTask>
    `))
  },
  {
    name: 'user task',
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
            <kunpeng:executionListener eventType="start" type="com.example.StartListener_2" />
          </kunpeng:executionListeners>
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
            <kunpeng:executionListeners>
              <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
              <kunpeng:executionListener eventType="start" type="com.example.StartListener_2" />
            </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:businessRuleTask>
    `))
  },
  {
    name: 'script task',
    moddleElement: createModdle(createProcess(`
      <bpmn:scriptTask id="ScriptTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
            <kunpeng:executionListener eventType="start" type="com.example.StartListener_2" />
            <kunpeng:executionListener eventType="end" type="com.example.StartListener" />
            <kunpeng:executionListener eventType="end" type="com.example.StartListener_2" />
          </kunpeng:executionListeners>
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
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
            <kunpeng:executionListener eventType="start" type="com.example.StartListener_2" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:intermediateThrowEvent>
    `))
  },
  {
    name: 'service task (non-executable process)',
    config: { version: '8.6' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:serviceTask id="ServiceTask_1">
          <bpmn:extensionElements>
            <kunpeng:executionListeners>
              <kunpeng:executionListener eventType="start" type="com.example.StartListener" />
              <kunpeng:executionListener eventType="start" type="com.example.StartListener_2" />
            </kunpeng:executionListeners>
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
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="duplicate" />
            <kunpeng:executionListener eventType="start" type="duplicate" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Properties of type <kunpeng:ExecutionListener> have properties with duplicate values (property <eventType> with duplicate value of <start>, property <type> with duplicate value of <duplicate>)',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 0, 'listeners', 0, 'type' ],
        [ 'extensionElements', 'values', 0, 'listeners', 1, 'type' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUES_DUPLICATED,
        node: 'kunpeng:ExecutionListeners',
        parentNode: 'ServiceTask_1',
        'duplicatedProperties': {
          'eventType': 'start',
          'type': 'duplicate'
        },
        properties: [
          'kunpeng:ExecutionListener',
          'kunpeng:ExecutionListener'
        ],
        propertiesName: 'listeners'
      }
    }
  },
  {
    name: 'service task (multiple duplicates)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="duplicate" />
            <kunpeng:executionListener eventType="start" type="duplicate" />
            <kunpeng:executionListener eventType="start" type="duplicate" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: [
      {
        id: 'ServiceTask_1',
        message: 'Properties of type <kunpeng:ExecutionListener> have properties with duplicate values (property <eventType> with duplicate value of <start>, property <type> with duplicate value of <duplicate>)',
        path: null,
        paths: [
          [ 'extensionElements', 'values', 0, 'listeners', 0, 'type' ],
          [ 'extensionElements', 'values', 0, 'listeners', 1, 'type' ],
          [ 'extensionElements', 'values', 0, 'listeners', 2, 'type' ]
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUES_DUPLICATED,
          node: 'kunpeng:ExecutionListeners',
          parentNode: 'ServiceTask_1',
          'duplicatedProperties': {
            'eventType': 'start',
            'type': 'duplicate'
          },
          properties: [
            'kunpeng:ExecutionListener',
            'kunpeng:ExecutionListener',
            'kunpeng:ExecutionListener'
          ],
          propertiesName: 'listeners'
        }
      },
      {
        id: 'ServiceTask_1',
        message: 'Properties of type <kunpeng:ExecutionListener> have properties with duplicate values (property <eventType> with duplicate value of <start>, property <type> with duplicate value of <duplicate>)',
        path: null,
        paths: [
          [ 'extensionElements', 'values', 0, 'listeners', 0, 'type' ],
          [ 'extensionElements', 'values', 0, 'listeners', 1, 'type' ],
          [ 'extensionElements', 'values', 0, 'listeners', 2, 'type' ]
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUES_DUPLICATED,
          node: 'kunpeng:ExecutionListeners',
          parentNode: 'ServiceTask_1',
          'duplicatedProperties': {
            'eventType': 'start',
            'type': 'duplicate'
          },
          properties: [
            'kunpeng:ExecutionListener',
            'kunpeng:ExecutionListener',
            'kunpeng:ExecutionListener'
          ],
          propertiesName: 'listeners'
        }
      }
    ]
  },
  {
    name: 'service task (multiple duplicates)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="duplicate" />
            <kunpeng:executionListener eventType="start" type="duplicate" />
            <kunpeng:executionListener eventType="start" type="duplicate_2" />
            <kunpeng:executionListener eventType="start" type="duplicate_2" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: [
      {
        id: 'ServiceTask_1',
        message: 'Properties of type <kunpeng:ExecutionListener> have properties with duplicate values (property <eventType> with duplicate value of <start>, property <type> with duplicate value of <duplicate>)',
        path: null,
        paths: [
          [ 'extensionElements', 'values', 0, 'listeners', 0, 'type' ],
          [ 'extensionElements', 'values', 0, 'listeners', 1, 'type' ]
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUES_DUPLICATED,
          node: 'kunpeng:ExecutionListeners',
          parentNode: 'ServiceTask_1',
          'duplicatedProperties': {
            'eventType': 'start',
            'type': 'duplicate'
          },
          properties: [
            'kunpeng:ExecutionListener',
            'kunpeng:ExecutionListener'
          ],
          propertiesName: 'listeners'
        }
      },
      {
        id: 'ServiceTask_1',
        message: 'Properties of type <kunpeng:ExecutionListener> have properties with duplicate values (property <eventType> with duplicate value of <start>, property <type> with duplicate value of <duplicate_2>)',
        path: null,
        paths: [
          [ 'extensionElements', 'values', 0, 'listeners', 2, 'type' ],
          [ 'extensionElements', 'values', 0, 'listeners', 3, 'type' ]
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUES_DUPLICATED,
          node: 'kunpeng:ExecutionListeners',
          parentNode: 'ServiceTask_1',
          'duplicatedProperties': {
            'eventType': 'start',
            'type': 'duplicate_2'
          },
          properties: [
            'kunpeng:ExecutionListener',
            'kunpeng:ExecutionListener'
          ],
          propertiesName: 'listeners'
        }
      }
    ]
  },
  {
    name: 'service task (no type)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:extensionElements>
          <kunpeng:executionListeners>
            <kunpeng:executionListener eventType="start" type="" />
            <kunpeng:executionListener eventType="start" type="" />
          </kunpeng:executionListeners>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Properties of type <kunpeng:ExecutionListener> have properties with duplicate values (property <eventType> with duplicate value of <start>, property <type> with duplicate value of <>)',
      path: null,
      paths: [
        [ 'extensionElements', 'values', 0, 'listeners', 0, 'type' ],
        [ 'extensionElements', 'values', 0, 'listeners', 1, 'type' ]
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUES_DUPLICATED,
        node: 'kunpeng:ExecutionListeners',
        parentNode: 'ServiceTask_1',
        'duplicatedProperties': {
          'eventType': 'start',
          'type': ''
        },
        properties: [
          'kunpeng:ExecutionListener',
          'kunpeng:ExecutionListener'
        ],
        propertiesName: 'listeners'
      }
    }
  }
];

RuleTester.verify('duplicate-execution-listeners', rule, {
  valid,
  invalid
});