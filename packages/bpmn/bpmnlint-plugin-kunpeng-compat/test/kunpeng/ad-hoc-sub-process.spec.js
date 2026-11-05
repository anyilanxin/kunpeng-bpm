const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/ad-hoc-sub-process');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'ad hoc sub process (with task)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:task id="Task_1" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'ad hoc sub process (with subprocess)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:subProcess id="SubProcess" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'ad hoc sub process (with call activity)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:callActivity id="CallActivity" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'ad hoc sub process (with completionCondition)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:task id="Task_1" />
        <bpmn:completionCondition xsi:type="bpmn:tFormalExpression">=myCondition</bpmn:completionCondition>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'ad hoc sub process (with cancelRemainingInstances attribute)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1" cancelRemainingInstances="false">
        <bpmn:task id="Task_1" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'ad hoc sub process (with completionCondition and cancelRemainingInstances attribute)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1" cancelRemainingInstances="false">
        <bpmn:task id="Task_1" />
        <bpmn:completionCondition xsi:type="bpmn:tFormalExpression">=myCondition</bpmn:completionCondition>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'ad hoc sub process (with output collection and output element attributes)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:extensionElements>
          <kunpeng:adHoc outputCollection="myCollection" outputElement="=myElement" />
        </bpmn:extensionElements>
        <bpmn:task id="Task_1" />
      </bpmn:adHocSubProcess>
    `))
  }
];

const invalid = [
  {
    name: 'ad hoc sub process (empty)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Subprocess_1',
      message: 'Element of type <bpmn:AdHocSubProcess> must contain at least one activity',
      data: {
        type: ERROR_TYPES.CHILD_ELEMENT_OF_TYPE_REQUIRED,
        node: 'Subprocess_1',
        parentNode: null,
        requiredType: 'bpmn:Activity'
      }
    }
  },
  {
    name: 'ad hoc sub process (no activity)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:exclusiveGateway id="Gateway_1" />
        <bpmn:intermediateThrowEvent id="Event_1" />
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Subprocess_1',
      message: 'Element of type <bpmn:AdHocSubProcess> must contain at least one activity',
      data: {
        type: ERROR_TYPES.CHILD_ELEMENT_OF_TYPE_REQUIRED,
        node: 'Subprocess_1',
        parentNode: null,
        requiredType: 'bpmn:Activity'
      }
    }
  },
  {
    name: 'ad hoc sub process (with completionCondition)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:task id="Task_1" />
        <bpmn:completionCondition xsi:type="bpmn:tFormalExpression">=myCondition</bpmn:completionCondition>
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Subprocess_1',
      message: 'Property <completionCondition> only allowed by Camunda 8.8 or newer',
      path: [
        'completionCondition'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'Subprocess_1',
        parentNode: null,
        property: 'completionCondition',
        allowedVersion: '8.8'
      }
    }
  },
  {
    name: 'ad hoc sub process (with cancelRemainingInstances attribute)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1" cancelRemainingInstances="false">
        <bpmn:task id="Task_1" />
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Subprocess_1',
      message: 'Property value of <false> only allowed by Camunda 8.8 or newer',
      path: [
        'cancelRemainingInstances'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'Subprocess_1',
        parentNode: null,
        property: 'cancelRemainingInstances',
        allowedVersion: '8.8'
      }
    }
  },
  {
    name: 'ad hoc sub process (with output collection)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:extensionElements>
          <kunpeng:adHoc outputCollection="myCollection" />
        </bpmn:extensionElements>
        <bpmn:task id="Task_1" />
      </bpmn:adHocSubProcess>
    `)),
    report: [
      {
        id: 'Subprocess_1',
        message: 'Property <outputCollection> only allowed by Camunda 8.8 or newer',
        path: [
          'extensionElements',
          'values',
          0,
          'outputCollection'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
          node: 'kunpeng:AdHoc',
          parentNode: 'Subprocess_1',
          property: 'outputCollection',
          allowedVersion: '8.8'
        }
      }
    ]
  },
  {
    name: 'ad hoc sub process (with output element)',
    config: { version: '8.7' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:extensionElements>
          <kunpeng:adHoc outputElement="=myElement" />
        </bpmn:extensionElements>
        <bpmn:task id="Task_1" />
      </bpmn:adHocSubProcess>
    `)),
    report: [
      {
        id: 'Subprocess_1',
        message: 'Property <outputElement> only allowed by Camunda 8.8 or newer',
        path: [
          'extensionElements',
          'values',
          0,
          'outputElement'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
          node: 'kunpeng:AdHoc',
          parentNode: 'Subprocess_1',
          property: 'outputElement',
          allowedVersion: '8.8'
        }
      }
    ]
  },
  {
    name: 'ad hoc sub process (with output collection, without output element)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:extensionElements>
          <kunpeng:adHoc outputCollection="myCollection" />
        </bpmn:extensionElements>
        <bpmn:task id="Task_1" />
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Subprocess_1',
      message: 'Element of type <kunpeng:AdHoc> must have property <outputElement> if it has property <outputCollection>',
      path: [
        'extensionElements',
        'values',
        0,
        'outputElement'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_DEPENDENT_REQUIRED,
        node: 'kunpeng:AdHoc',
        parentNode: 'Subprocess_1',
        property: 'outputCollection',
        dependentRequiredProperty: 'outputElement'
      }
    }
  },
  {
    name: 'ad hoc sub process (with output element, without output collection)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="Subprocess_1">
        <bpmn:extensionElements>
          <kunpeng:adHoc outputElement="=myElement" />
        </bpmn:extensionElements>
        <bpmn:task id="Task_1" />
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Subprocess_1',
      message: 'Element of type <kunpeng:AdHoc> must have property <outputCollection> if it has property <outputElement>',
      path: [
        'extensionElements',
        'values',
        0,
        'outputCollection'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_DEPENDENT_REQUIRED,
        node: 'kunpeng:AdHoc',
        parentNode: 'Subprocess_1',
        property: 'outputElement',
        dependentRequiredProperty: 'outputCollection'
      }
    }
  }
];

RuleTester.verify('ad-hoc-sub-process', rule, {
  valid,
  invalid
});