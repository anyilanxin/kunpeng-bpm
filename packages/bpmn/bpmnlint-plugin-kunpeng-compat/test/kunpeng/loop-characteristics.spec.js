const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/loop-characteristics');

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
        <bpmn:multiInstanceLoopCharacteristics>
          <bpmn:extensionElements>
            <kunpeng:loopCharacteristics inputCollection="foo" />
          </bpmn:extensionElements>
        </bpmn:multiInstanceLoopCharacteristics>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'end event',
    moddleElement: createModdle(createProcess('<bpmn:endEvent id="EndEvent_1" />'))
  },
  {
    name: 'service task (standard loop characteristics) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:serviceTask id="ServiceTask_1">
          <bpmn:standardLoopCharacteristics />
        </bpmn:serviceTask>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'service task (standard loop characteristics)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:standardLoopCharacteristics />
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Property <loopCharacteristics> of type <bpmn:StandardLoopCharacteristics> not allowed',
      path: [
        'loopCharacteristics'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_TYPE_NOT_ALLOWED,
        node: 'ServiceTask_1',
        parentNode: null,
        property: 'loopCharacteristics',
        allowedPropertyType: 'bpmn:MultiInstanceLoopCharacteristics'
      }
    }
  },
  {
    name: 'service task (no loop characteristics)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:multiInstanceLoopCharacteristics />
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Element of type <bpmn:MultiInstanceLoopCharacteristics> must have one extension element of type <kunpeng:LoopCharacteristics>',
      path: [
        'loopCharacteristics'
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_REQUIRED,
        node: 'bpmn:MultiInstanceLoopCharacteristics',
        parentNode: 'ServiceTask_1',
        requiredExtensionElement: 'kunpeng:LoopCharacteristics'
      }
    }
  },
  {
    name: 'service task (no input collection)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:multiInstanceLoopCharacteristics>
          <bpmn:extensionElements>
            <kunpeng:loopCharacteristics />
          </bpmn:extensionElements>
        </bpmn:multiInstanceLoopCharacteristics>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Element of type <kunpeng:LoopCharacteristics> must have property <inputCollection>',
      path: [
        'loopCharacteristics',
        'extensionElements',
        'values',
        0,
        'inputCollection'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:LoopCharacteristics',
        parentNode: 'ServiceTask_1',
        requiredProperty: 'inputCollection'
      }
    }
  },
  {
    name: 'service task (no output collection)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:multiInstanceLoopCharacteristics>
          <bpmn:extensionElements>
            <kunpeng:loopCharacteristics inputCollection="foo" outputElement="bar" />
          </bpmn:extensionElements>
        </bpmn:multiInstanceLoopCharacteristics>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Element of type <kunpeng:LoopCharacteristics> must have property <outputCollection> if it has property <outputElement>',
      path: [
        'loopCharacteristics',
        'extensionElements',
        'values',
        0,
        'outputCollection'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_DEPENDENT_REQUIRED,
        node: 'kunpeng:LoopCharacteristics',
        parentNode: 'ServiceTask_1',
        property: 'outputElement',
        dependentRequiredProperty: 'outputCollection'
      }
    }
  },
  {
    name: 'service task (no output element)',
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="ServiceTask_1">
        <bpmn:multiInstanceLoopCharacteristics>
          <bpmn:extensionElements>
            <kunpeng:loopCharacteristics inputCollection="foo" outputCollection="bar" />
          </bpmn:extensionElements>
        </bpmn:multiInstanceLoopCharacteristics>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'ServiceTask_1',
      message: 'Element of type <kunpeng:LoopCharacteristics> must have property <outputElement> if it has property <outputCollection>',
      path: [
        'loopCharacteristics',
        'extensionElements',
        'values',
        0,
        'outputElement'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_DEPENDENT_REQUIRED,
        node: 'kunpeng:LoopCharacteristics',
        parentNode: 'ServiceTask_1',
        property: 'outputCollection',
        dependentRequiredProperty: 'outputElement'
      }
    }
  }
];

RuleTester.verify('loop-characteristics', rule, {
  valid,
  invalid
});