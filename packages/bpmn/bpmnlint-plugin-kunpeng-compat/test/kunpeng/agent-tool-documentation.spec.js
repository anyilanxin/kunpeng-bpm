const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/agent-tool-documentation');

const {
  createDefinitions,
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/error-types');

function agenticAHSP(taskXml) {
  return createProcess(`
    <bpmn:adHocSubProcess id="AHSP_1">
      <bpmn:extensionElements>
        <kunpeng:properties>
          <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
        </kunpeng:properties>
      </bpmn:extensionElements>
      ${taskXml}
    </bpmn:adHocSubProcess>
  `);
}

const valid = [
  {
    name: 'tool task with documentation inside agentic AHSP',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:documentation>Searches the web for relevant information based on a user query string.</bpmn:documentation>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'tool task with multi-element documentation inside agentic AHSP',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:documentation>Fetches data from the external REST API endpoint.</bpmn:documentation>
        <bpmn:documentation>Returns a JSON response for further processing.</bpmn:documentation>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'undocumented tool inside a bare kunpeng:AdHoc AHSP — not agentic, skipped (property marker required, at every version)',
    config: { version: '8.10' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:adHoc />
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'task inside regular SubProcess (not AHSP) — skipped',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:subProcess id="Sub_1">
        <bpmn:serviceTask id="Task_1" />
      </bpmn:subProcess>
    `))
  },
  {
    name: 'task inside AHSP with no agentic marker — not agentic, skipped',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:serviceTask id="Task_1" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'agentic AHSP itself — skipped (no ancestor AHSP)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:documentation>Searches the web for information.</bpmn:documentation>
        </bpmn:serviceTask>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'activity with incoming sequence flow — skipped (reached via routing, not invoked directly by agent)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:documentation>Entry point tool.</bpmn:documentation>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_2">
          <bpmn:incoming>Flow_1</bpmn:incoming>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'exclusive gateway inside agentic AHSP — skipped (not an Activity)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:exclusiveGateway id="Gateway_1" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'event sub-process inside agentic AHSP — skipped (triggered by event, not invoked by agent)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:subProcess id="EventSub_1" triggeredByEvent="true" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'unicode documentation text',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:documentation>获取给定查询的 API 数据 🔍</bpmn:documentation>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'non-executable process — skipped',
    config: { version: '8.8' },
    moddleElement: createModdle(createDefinitions(`
      <bpmn:process id="Process_1" isExecutable="false">
        <bpmn:adHocSubProcess id="AHSP_1">
          <bpmn:extensionElements>
            <kunpeng:properties>
              <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
            </kunpeng:properties>
          </bpmn:extensionElements>
          <bpmn:serviceTask id="Task_1" />
        </bpmn:adHocSubProcess>
      </bpmn:process>
    `))
  },
  {
    name: 'documented sub-process tool with an undocumented inner task — inner is not a separate tool, skipped',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:subProcess id="Sub_1">
        <bpmn:documentation>Fetches and returns data from the external API.</bpmn:documentation>
        <bpmn:serviceTask id="Inner_1" />
      </bpmn:subProcess>
    `))
  },
  {
    name: 'documented tool inside legacy AI Agent template AHSP — treated as agentic',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1" kunpeng:modelerTemplate="io.camunda.connectors.agenticai.aiagent.jobworker.v1">
        <bpmn:serviceTask id="Task_1">
          <bpmn:documentation>Searches the web for relevant information.</bpmn:documentation>
        </bpmn:serviceTask>
      </bpmn:adHocSubProcess>
    `))
  }
];

const invalid = [
  {
    name: 'tool task with no documentation inside agentic AHSP',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:serviceTask id="Task_1" />
    `)),
    report: {
      id: 'Task_1',
      message: 'Tool documentation is missing.',
      data: { type: ERROR_TYPES.AGENT_TOOL_DOCUMENTATION_MISSING },
      path: [ 'documentation' ]
    }
  },
  {
    name: 'tool task with empty documentation inside agentic AHSP',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:documentation></bpmn:documentation>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'Task_1',
      message: 'Tool documentation is missing.',
      data: { type: ERROR_TYPES.AGENT_TOOL_DOCUMENTATION_MISSING },
      path: [ 'documentation' ]
    }
  },
  {
    name: 'user task with no documentation inside agentic AHSP',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:userTask id="Task_1" />
    `)),
    report: {
      id: 'Task_1',
      message: 'Tool documentation is missing.',
      data: { type: ERROR_TYPES.AGENT_TOOL_DOCUMENTATION_MISSING },
      path: [ 'documentation' ]
    }
  },
  {
    name: 'whitespace-only documentation inside agentic AHSP',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:documentation>   </bpmn:documentation>
      </bpmn:serviceTask>
    `)),
    report: {
      id: 'Task_1',
      message: 'Tool documentation is missing.',
      data: { type: ERROR_TYPES.AGENT_TOOL_DOCUMENTATION_MISSING },
      path: [ 'documentation' ]
    }
  },
  {
    name: 'entry activity with attached boundary event still requires documentation',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:serviceTask id="Task_1" />
      <bpmn:boundaryEvent id="Boundary_1" attachedToRef="Task_1" />
    `)),
    report: {
      id: 'Task_1',
      message: 'Tool documentation is missing.',
      data: { type: ERROR_TYPES.AGENT_TOOL_DOCUMENTATION_MISSING },
      path: [ 'documentation' ]
    }
  },
  {
    name: 'call activity as tool requires documentation',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticAHSP(`
      <bpmn:callActivity id="Task_1" />
    `)),
    report: {
      id: 'Task_1',
      message: 'Tool documentation is missing.',
      data: { type: ERROR_TYPES.AGENT_TOOL_DOCUMENTATION_MISSING },
      path: [ 'documentation' ]
    }
  },
  {
    name: 'undocumented tool inside legacy AI Agent template AHSP — treated as agentic, reported',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1" kunpeng:modelerTemplate="io.camunda.connectors.agenticai.aiagent.jobworker.v1">
        <bpmn:serviceTask id="Task_1" />
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Task_1',
      message: 'Tool documentation is missing.',
      data: { type: ERROR_TYPES.AGENT_TOOL_DOCUMENTATION_MISSING },
      path: [ 'documentation' ]
    }
  }
];

RuleTester.verify('agent-tool-documentation', rule, {
  valid,
  invalid
});
