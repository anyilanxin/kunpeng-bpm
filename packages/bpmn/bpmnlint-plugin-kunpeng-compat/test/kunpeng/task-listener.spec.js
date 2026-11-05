const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/task-listener');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'task listener with type',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskListeners>
            <kunpeng:taskListener eventType="assigning" type="com.example.AssignmentListener" />
          </kunpeng:taskListeners>
          <kunpeng:userTask />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'task listener with outdated event type',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskListeners>
            <kunpeng:taskListener eventType="assignment" type="com.example.AssignmentListener" />
          </kunpeng:taskListeners>
          <kunpeng:userTask />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'job worker user task without tasklisteners',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1"/>
    `))
  }
];

const invalid = [
  {
    name: 'task listener with empty type',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskListeners>
            <kunpeng:taskListener eventType="complete" type="" />
          </kunpeng:taskListeners>
          <kunpeng:userTask />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:TaskListener> must have property <type>',
      path: [
        'extensionElements',
        'values',
        0,
        'listeners',
        0,
        'type'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:TaskListener',
        parentNode: 'UserTask_1',
        requiredProperty: 'type'
      }
    }
  },
  {
    name: 'task listener with no type',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskListeners>
            <kunpeng:taskListener eventType="assignment" />
          </kunpeng:taskListeners>
          <kunpeng:userTask />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:TaskListener> must have property <type>',
      path: [
        'extensionElements',
        'values',
        0,
        'listeners',
        0,
        'type'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:TaskListener',
        parentNode: 'UserTask_1',
        requiredProperty: 'type'
      }
    }
  },
  {
    name: 'multiple task listeners with no type',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:taskListeners>
            <kunpeng:taskListener eventType="complete" />
            <kunpeng:taskListener eventType="complete" />
            <kunpeng:taskListener eventType="complete" />
            <kunpeng:taskListener eventType="complete" />
          </kunpeng:taskListeners>
          <kunpeng:userTask />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: [
      {
        id: 'UserTask_1',
        message: 'Element of type <kunpeng:TaskListener> must have property <type>',
        path: [
          'extensionElements',
          'values',
          0,
          'listeners',
          0,
          'type'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'kunpeng:TaskListener',
          parentNode: 'UserTask_1',
          requiredProperty: 'type'
        }
      },
      {
        id: 'UserTask_1',
        message: 'Element of type <kunpeng:TaskListener> must have property <type>',
        path: [
          'extensionElements',
          'values',
          0,
          'listeners',
          1,
          'type'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'kunpeng:TaskListener',
          parentNode: 'UserTask_1',
          requiredProperty: 'type'
        }
      },
      {
        id: 'UserTask_1',
        message: 'Element of type <kunpeng:TaskListener> must have property <type>',
        path: [
          'extensionElements',
          'values',
          0,
          'listeners',
          2,
          'type'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'kunpeng:TaskListener',
          parentNode: 'UserTask_1',
          requiredProperty: 'type'
        }
      },
      {
        id: 'UserTask_1',
        message: 'Element of type <kunpeng:TaskListener> must have property <type>',
        path: [
          'extensionElements',
          'values',
          0,
          'listeners',
          3,
          'type'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: 'kunpeng:TaskListener',
          parentNode: 'UserTask_1',
          requiredProperty: 'type'
        }
      }
    ]
  }
];

RuleTester.verify('task-listener', rule, {
  valid,
  invalid
});