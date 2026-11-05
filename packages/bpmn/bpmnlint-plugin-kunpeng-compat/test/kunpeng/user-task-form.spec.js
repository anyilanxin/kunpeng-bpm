const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/user-task-form');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'user task (form key) (Camunda 8.0)',
    config: { version: '8.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:userTaskForm id="userTaskForm_1">{}</kunpeng:userTaskForm>
      </bpmn:extensionElements>
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="camunda-forms:bpmn:userTaskForm_1" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'user task (form key) (Camunda 8.0) (Web Modeler)',
    config: { modeler: 'web', version: '8.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:userTaskForm id="userTaskForm_1">{}</kunpeng:userTaskForm>
      </bpmn:extensionElements>
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="camunda-forms:bpmn:userTaskForm_1" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'user task (form ID) (Camunda 8.4)',
    config: { version: '8.4' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formId="foo" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'user task (form ID) (Camunda 8.0) (Web Modeler)',
    config: { modeler: 'web', version: '8.0' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formId="foo" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'user task (no form key) (non-executable process)',
    config: { version: '8.3' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:userTask id="UserTask_1">
          <bpmn:extensionElements>
            <kunpeng:formDefinition />
          </bpmn:extensionElements>
        </bpmn:userTask>
      </bpmn:process>
    `))
  },
  {
    name: 'zeebe user task (form id)',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:userTask />
          <kunpeng:formDefinition formId="customForm" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'zeebe user task (external reference)',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:userTask />
          <kunpeng:formDefinition externalReference="customForm" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  },
  {
    name: 'zeebe user task (prior to 8.5)',
    config: { version: '8.4' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:userTask />
          <kunpeng:formDefinition />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `))
  }
];

const invalid = [
  {
    name: 'user task (no form key) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey>',
      path: [
        'extensionElements',
        'values',
        0,
        'formKey'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        requiredProperty: 'formKey'
      }
    }
  },
  {
    name: 'user task (empty form key) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey>',
      path: [
        'extensionElements',
        'values',
        0,
        'formKey'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        requiredProperty: 'formKey'
      }
    }
  },
  {
    name: 'user task (no form key or form ID) (Camunda 8.4)',
    config: { version: '8.4' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey> or <formId>',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        requiredProperty: [
          'formKey',
          'formId'
        ]
      }
    }
  },
  {
    name: 'user task (empty form key) (Camunda 8.4)',
    config: { version: '8.4' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey> or <formId>',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        requiredProperty: [
          'formKey',
          'formId'
        ]
      }
    }
  },
  {
    name: 'user task (empty form ID) (Camunda 8.4)',
    config: { version: '8.4' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formId="" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey> or <formId>',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        requiredProperty: [
          'formKey',
          'formId'
        ]
      }
    }
  },
  {
    name: 'user task (form ID) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formId="foo" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Property <formId> only allowed by Camunda 8.4 or newer',
      path: [
        'extensionElements',
        'values',
        0,
        'formId'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        property: 'formId',
        allowedVersion: '8.4'
      }
    }
  },
  {
    name: 'user task (form key and form ID) (Camunda 8.4)',
    config: { version: '8.4' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="foo" formId="bar" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <formKey> or <formId>',
      path: [
        'extensionElements',
        'values',
        0
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        requiredProperty: [
          'formKey',
          'formId'
        ]
      }
    }
  },
  {
    name: 'user task (empty user task form) (Camunda 8.3)',
    config: { version: '8.3' },
    moddleElement: createModdle(createProcess(`
      <bpmn:extensionElements>
        <kunpeng:userTaskForm id="userTaskForm_1"></kunpeng:userTaskForm>
      </bpmn:extensionElements>
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:formDefinition formKey="camunda-forms:bpmn:userTaskForm_1" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
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
        parentNode: 'UserTask_1',
        requiredProperty: 'body'
      }
    }
  },
  {
    name: 'zeebe user task (external reference and form ID) (Camunda 8.5)',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:userTask />
          <kunpeng:formDefinition />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <externalReference> or <formId>',
      path: [
        'extensionElements',
        'values',
        1
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        requiredProperty: [
          'externalReference',
          'formId'
        ]
      }
    }
  },
  {
    name: 'zeebe user task (empty external reference) (Camunda 8.5)',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:userTask />
          <kunpeng:formDefinition externalReference="" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <externalReference> or <formId>',
      path: [
        'extensionElements',
        'values',
        1
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        requiredProperty: [
          'externalReference',
          'formId'
        ]
      }
    }
  },
  {
    name: 'zeebe user task (empty form ID) (Camunda 8.5)',
    config: { version: '8.5' },
    moddleElement: createModdle(createProcess(`
      <bpmn:userTask id="UserTask_1">
        <bpmn:extensionElements>
          <kunpeng:userTask />
          <kunpeng:formDefinition formId="" />
        </bpmn:extensionElements>
      </bpmn:userTask>
    `)),
    report: {
      id: 'UserTask_1',
      message: 'Element of type <kunpeng:FormDefinition> must have property <externalReference> or <formId>',
      path: [
        'extensionElements',
        'values',
        1
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: 'kunpeng:FormDefinition',
        parentNode: 'UserTask_1',
        requiredProperty: [
          'externalReference',
          'formId'
        ]
      }
    }
  }
];

RuleTester.verify('user-task-form', rule, {
  valid,
  invalid
});