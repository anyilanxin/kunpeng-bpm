const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/collapsed-subprocess');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const valid = [
  {
    name: 'expanded sub-process',
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" />
    `, `
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          <bpmndi:BPMNShape id="SubProcess_1_di" bpmnElement="SubProcess_1" isExpanded="true">
          <dc:Bounds x="160" y="120" width="350" height="200" />
          </bpmndi:BPMNShape>
      </bpmndi:BPMNPlane>
    `))
  },
  {
    name: 'expanded ad-hoc sub-process',
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="SubProcess_1" />
    `, `
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          <bpmndi:BPMNShape id="SubProcess_1_di" bpmnElement="SubProcess_1" isExpanded="true">
          <dc:Bounds x="160" y="120" width="350" height="200" />
          </bpmndi:BPMNShape>
      </bpmndi:BPMNPlane>
    `))
  },
  {
    name: 'collapsed sub-process (non-executable process)',
    config: { version: '8.2' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1">
        <bpmn:subProcess id="SubProcess_1" />
      </bpmn:process>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          <bpmndi:BPMNShape id="SubProcess_1_di" bpmnElement="SubProcess_1" isExpanded="false">
            <dc:Bounds x="155" y="80" width="100" height="80" />
          </bpmndi:BPMNShape>
        </bpmndi:BPMNPlane>
      </bpmndi:BPMNDiagram>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="SubProcess_1" />
      </bpmndi:BPMNDiagram>
    `))
  }
];

const invalid = [
  {
    name: 'collapsed sub-process',
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" />
    `, `
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          <bpmndi:BPMNShape id="SubProcess_1_di" bpmnElement="SubProcess_1" isExpanded="false">
            <dc:Bounds x="155" y="80" width="100" height="80" />
          </bpmndi:BPMNShape>
        </bpmndi:BPMNPlane>
      </bpmndi:BPMNDiagram>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="SubProcess_1" />
      </bpmndi:BPMNDiagram>
    `)),
    report: {
      id: 'SubProcess_1',
      message: 'A <bpmn:SubProcess> must be expanded',
      data: {
        type: ERROR_TYPES.ELEMENT_COLLAPSED_NOT_ALLOWED,
        node: 'SubProcess_1',
        parentNode: null,
        allowedVersion: '8.4'
      }
    }
  },
  {
    name: 'collapsed sub-process (no isExpanded attribute)',
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" />
    `, `
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          <bpmndi:BPMNShape id="SubProcess_1_di" bpmnElement="SubProcess_1">
            <dc:Bounds x="155" y="80" width="100" height="80" />
          </bpmndi:BPMNShape>
        </bpmndi:BPMNPlane>
      </bpmndi:BPMNDiagram>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="SubProcess_1" />
      </bpmndi:BPMNDiagram>
    `)),
    report: {
      id: 'SubProcess_1',
      message: 'A <bpmn:SubProcess> must be expanded',
      data: {
        type: ERROR_TYPES.ELEMENT_COLLAPSED_NOT_ALLOWED,
        node: 'SubProcess_1',
        parentNode: null,
        allowedVersion: '8.4'
      }
    }
  },
  {
    name: 'collapsed sub-process (legacy)',
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="SubProcess_1" />
    `, `
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          <bpmndi:BPMNShape id="SubProcess_1_di" bpmnElement="SubProcess_1" isExpanded="false">
            <dc:Bounds x="155" y="80" width="100" height="80" />
          </bpmndi:BPMNShape>
        </bpmndi:BPMNPlane>
      </bpmndi:BPMNDiagram>
    `)),
    report: {
      id: 'SubProcess_1',
      message: 'A <bpmn:SubProcess> must be expanded',
      data: {
        type: ERROR_TYPES.ELEMENT_COLLAPSED_NOT_ALLOWED,
        node: 'SubProcess_1',
        parentNode: null,
        allowedVersion: '8.4'
      }
    }
  },
  {
    name: 'collapsed ad-hoc sub-process',
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="SubProcess_1" />
    `, `
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
        <bpmndi:BPMNShape id="SubProcess_1_di" bpmnElement="SubProcess_1" isExpanded="false">
          <dc:Bounds x="155" y="80" width="100" height="80" />
        </bpmndi:BPMNShape>
      </bpmndi:BPMNPlane>
      </bpmndi:BPMNDiagram>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="SubProcess_1" />
      </bpmndi:BPMNDiagram>
    `)),
    report: {
      id: 'SubProcess_1',
      message: 'A <bpmn:AdHocSubProcess> must be expanded',
      data: {
        type: ERROR_TYPES.ELEMENT_COLLAPSED_NOT_ALLOWED,
        node: 'SubProcess_1',
        parentNode: null,
        allowedVersion: '8.4'
      }
    }
  }
];

RuleTester.verify('subprocess', rule, {
  valid,
  invalid
});