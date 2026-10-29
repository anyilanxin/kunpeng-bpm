const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/start-event-form');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'start event (form key) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:userTaskForm id="userTaskForm_1">{}</kunpeng:userTaskForm>
      </bpmn:extensionElements>
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="camunda-forms:bpmn:userTaskForm_1" />
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `))
  },
  {
    name: 'start event (form ID) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formId="foo" />
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `))
  },
  {
    name: 'start event',
    config: { version: '8.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1"></bpmn:startEvent>
    `))
  },
  {
    name: 'Start Event with formDefinition (8.2) (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:extensionElements>
          <kunpeng:userTaskForm id="userTaskForm_1">{}</kunpeng:userTaskForm>
        </bpmn:extensionElements>
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:extensionElements>
            <kunpeng:formDefinition formKey="camunda-forms:bpmn:userTaskForm_1" />
          </bpmn:extensionElements>
        </bpmn:startEvent>
      </bpmn:process>
    `))
  }
];

const invalid = [
  {
    name: 'start event (form definition) (Camunda 8.2)',
    config: { version: '8.2' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition />
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Extension element of type <kunpeng:FormDefinition> only allowed by Camunda 8.3',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: 'StartEvent_1',
        parentNode: null,
        extensionElement: 'kunpeng:FormDefinition',
        allowedVersion: '8.3'
      }
    }
  },
  {
    name: 'start (no form key or form ID) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition />
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey> or <formId>',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'StartEvent_1',
        requiredProperty: [
          'formKey',
          'formId'
        ]
      }
    }
  },
  {
    name: 'start event (empty form key) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="" />
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey> or <formId>',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'StartEvent_1',
        requiredProperty: [
          'formKey',
          'formId'
        ]
      }
    }
  },
  {
    name: 'start event (empty form ID) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formId="" />
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey> or <formId>',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'StartEvent_1',
        requiredProperty: [
          'formKey',
          'formId'
        ]
      }
    }
  },
  {
    name: 'start event (form key and form ID) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="foo" formId="bar" />
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey> or <formId>',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'StartEvent_1',
        requiredProperty: [
          'formKey',
          'formId'
        ]
      }
    }
  },
  {
    name: 'start event (empty user task form) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:userTaskForm id="userTaskForm_1"></kunpeng:userTaskForm>
      </bpmn:extensionElements>
      <bpmn:startEvent id="StartEvent_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="camunda-forms:bpmn:userTaskForm_1" />
        </bpmn:extensionElements>
      </bpmn:startEvent>
    `)),
    report: {
      id: 'StartEvent_1',
      message: 'Element of type <kunpeng:UserTaskForm> must have property <body>',
      path: [
        'rootElements',
        0,
        'extensionElements',
        'values',
        0,
        'body'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:UserTaskForm',
        parentNode: 'StartEvent_1',
        requiredProperty: 'body'
      }
    }
  }
];

RuleTester.verify('start-event-form', rule, {
  valid,
  invalid
});