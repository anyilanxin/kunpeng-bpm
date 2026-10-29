const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/executable-process');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'process',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="true" />
    `))
  },
  {
    name: 'collaboration',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:collaboration id="Collaboration_1">
        <bpmn:participant id="Participant_1" processRef="Process_1" />
        <bpmn:participant id="Participant_2" processRef="Process_2" />
      </bpmn:collaboration>
      <bpmn:process id="Process_1" isExecutable="true" />
      <bpmn:process id="Process_2" isExecutable="false" />
    `))
  },
  {
    name: 'task',
    moddleElement: createModdle(createProcess('<bpmn:task id="Task_1" />'))
  }
];

const invalid = [
  {
    name: 'process (not executable)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" />
    `)),
    report: {
      id: 'Process_1',
      message: 'Property <isExecutable> must have value of <true>',
      path: [ 'isExecutable' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_REQUIRED,
        node: 'Process_1',
        parentNode: null,
        property: 'isExecutable',
        requiredValue: true
      }
    }
  },
  {
    name: 'collaboration (1 participant, no executable process)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:collaboration id="Collaboration_1">
        <bpmn:participant id="Participant_1" processRef="Process_1" />
      </bpmn:collaboration>
      <bpmn:process id="Process_1" isExecutable="false" />
    `)),
    report: {
      id: 'Participant_1',
      message: 'Property <isExecutable> must have value of <true>',
      path: [
        'rootElements',
        1,
        'isExecutable'
      ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_REQUIRED,
        node: 'Process_1',
        parentNode: 'Participant_1',
        property: 'isExecutable',
        requiredValue: true
      }
    }
  },
  {
    name: 'collaboration (2 participants, no executable process)',
    moddleElement: createModdle(createDefinitions(`
      <bpmn:collaboration id="Collaboration_1">
        <bpmn:participant id="Participant_1" processRef="Process_1" />
        <bpmn:participant id="Participant_2" processRef="Process_2" />
      </bpmn:collaboration>
      <bpmn:process id="Process_1" isExecutable="false" />
      <bpmn:process id="Process_2" isExecutable="false" />
    `)),
    report: [
      {
        id: 'Participant_1',
        message: 'Property <isExecutable> must have value of <true>',
        path: [
          'rootElements',
          1,
          'isExecutable'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_REQUIRED,
          node: 'Process_1',
          parentNode: 'Participant_1',
          property: 'isExecutable',
          requiredValue: true
        }
      },
      {
        id: 'Participant_2',
        message: 'Property <isExecutable> must have value of <true>',
        path: [
          'rootElements',
          2,
          'isExecutable'
        ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_REQUIRED,
          node: 'Process_2',
          parentNode: 'Participant_2',
          property: 'isExecutable',
          requiredValue: true
        }
      }
    ]
  }
];

RuleTester.verify('executable-process', rule, {
  valid,
  invalid
});