const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const rule = require('../../rules/kunpeng/agent-tool-output-key');

const {
  createModdle,
  createProcess
} = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/error-types');

const WARN_MESSAGE = '"toolCallResult" output is not mapped.';

const OUTPUT_TARGET_PATH = [ 'extensionElements', 'values', 0, 'outputParameters', 0, 'target' ];
const HEADER_VALUE_PATH = [ 'extensionElements', 'values', 0, 'values', 0, 'value' ];
const RESULT_VARIABLE_PATH = [ 'extensionElements', 'values', 0, 'resultVariable' ];
const OUTPUTS_ANCHOR_PATH = [ 'extensionElements', 'values', 0, 'outputParameters' ];

function agenticToolTask(outputXml = '') {
  return createProcess(`
    <bpmn:adHocSubProcess id="AHSP_1">
      <bpmn:extensionElements>
        <kunpeng:properties>
          <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
        </kunpeng:properties>
      </bpmn:extensionElements>
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input source="=toolCall.url" target="url" />
            ${outputXml}
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    </bpmn:adHocSubProcess>
  `);
}

const valid = [
  {
    name: 'toolCallResult output present',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticToolTask(`
      <kunpeng:output source="=taskResult" target="toolCallResult" />
    `))
  },
  {
    name: 'toolCallResult present among multiple outputs',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticToolTask(`
      <kunpeng:output source="=taskResult" target="toolCallResult" />
      <kunpeng:output source="=extra" target="extra" />
    `))
  },
  {
    name: 'task inside AHSP with no agentic marker — not agentic, skipped',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:serviceTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=taskResult" target="wrongKey" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'task outside AHSP — not scoped to agent context, skipped',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:serviceTask id="Task_1">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:output source="=taskResult" target="wrongKey" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `))
  },
  {
    name: 'period-target contribution (toolCallResult.statusCode)',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticToolTask(`
      <kunpeng:output source="=statusCode" target="toolCallResult.statusCode" />
    `))
  },
  {
    name: 'script task resultVariable is toolCallResult',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:scriptTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:script expression="=result" resultVariable="toolCallResult" />
            <kunpeng:ioMapping>
              <kunpeng:input source="=toolCall.query" target="query" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:scriptTask>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'connector resultExpression header contains toolCallResult',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:taskHeaders>
              <kunpeng:header key="resultExpression" value="={toolCallResult: response.body}" />
            </kunpeng:taskHeaders>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'connector resultVariable header is toolCallResult',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:taskHeaders>
              <kunpeng:header key="resultVariable" value="toolCallResult" />
            </kunpeng:taskHeaders>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'downstream element sets toolCallResult — entry activity stays silent',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:outgoing>Flow_1</bpmn:outgoing>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=intermediate" target="lookupData" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_2">
          <bpmn:incoming>Flow_1</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=lookupData" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'non-entry activity with misdirected outputs — reported via its entry, not itself',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:outgoing>Flow_1</bpmn:outgoing>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=result" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_2">
          <bpmn:incoming>Flow_1</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=extra" target="sideChannel" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'sub-process tool whose child sets toolCallResult',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:subProcess id="Sub_1">
          <bpmn:serviceTask id="Inner_1">
            <bpmn:extensionElements>
              <kunpeng:ioMapping>
                <kunpeng:output source="=result" target="toolCallResult" />
              </kunpeng:ioMapping>
            </bpmn:extensionElements>
          </bpmn:serviceTask>
        </bpmn:subProcess>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'entry sets toolCallResult, downstream appends via context put(): no overwrite',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:outgoing>Flow_1</bpmn:outgoing>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=a" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_2">
          <bpmn:incoming>Flow_1</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=context put(toolCallResult, &quot;confirmation&quot;, b)" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'entry and downstream write different toolCallResult parts: no overwrite',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:outgoing>Flow_1</bpmn:outgoing>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=a" target="toolCallResult.statusCode" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_2">
          <bpmn:incoming>Flow_1</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=b" target="toolCallResult.body" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'toolCallResult written on two mutually exclusive branches: no overwrite (branches never both run)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:outgoing>Flow_1</bpmn:outgoing>
        </bpmn:serviceTask>
        <bpmn:exclusiveGateway id="Gateway_1">
          <bpmn:incoming>Flow_1</bpmn:incoming>
          <bpmn:outgoing>Flow_2</bpmn:outgoing>
          <bpmn:outgoing>Flow_3</bpmn:outgoing>
        </bpmn:exclusiveGateway>
        <bpmn:serviceTask id="Task_A">
          <bpmn:incoming>Flow_2</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=a" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_B">
          <bpmn:incoming>Flow_3</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=b" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Gateway_1" />
        <bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_1" targetRef="Task_A" />
        <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="Task_B" />
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'sub-process tool sets toolCallResult itself; inner task writes nothing — inner is not a separate tool',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:subProcess id="Sub_1">
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=result" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
          <bpmn:serviceTask id="Inner_1" />
        </bpmn:subProcess>
      </bpmn:adHocSubProcess>
    `))
  },
  {
    name: 'toolCallResult output present inside legacy AI Agent template AHSP — treated as agentic',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1" kunpeng:modelerTemplate="io.camunda.connectors.agenticai.aiagent.jobworker.v1">
        <bpmn:serviceTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:input source="=toolCall.url" target="url" />
              <kunpeng:output source="=taskResult" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:adHocSubProcess>
    `))
  }
];

const invalid = [
  {
    name: 'wrong output target key',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticToolTask(`
      <kunpeng:output source="=taskResult" target="result" />
    `)),
    report: {
      id: 'Task_1',
      message: WARN_MESSAGE,
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_INVALID },
      path: OUTPUT_TARGET_PATH
    }
  },
  {
    name: 'blank output target',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticToolTask(`
      <kunpeng:output source="=taskResult" target="" />
    `)),
    report: {
      id: 'Task_1',
      message: WARN_MESSAGE,
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_INVALID },
      path: OUTPUT_TARGET_PATH
    }
  },
  {
    name: 'FEEL-prefixed output target',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticToolTask(`
      <kunpeng:output source="=taskResult" target="= toolCallResult" />
    `)),
    report: {
      id: 'Task_1',
      message: WARN_MESSAGE,
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_INVALID },
      path: OUTPUT_TARGET_PATH
    }
  },
  {
    name: 'wrong casing in output target (toolcallresult)',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticToolTask(`
      <kunpeng:output source="=taskResult" target="toolcallresult" />
    `)),
    report: {
      id: 'Task_1',
      message: 'Wrong casing "toolcallresult": use toolCallResult (case-sensitive).',
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_CASING_INVALID },
      path: OUTPUT_TARGET_PATH
    }
  },
  {
    name: 'wrong casing in connector resultExpression header (toolcallresult)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:taskHeaders>
              <kunpeng:header key="resultExpression" value="={toolcallresult: response.body}" />
            </kunpeng:taskHeaders>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Task_1',
      message: 'Wrong casing "toolcallresult": use toolCallResult (case-sensitive).',
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_CASING_INVALID },
      path: HEADER_VALUE_PATH
    }
  },
  {
    name: 'multiple outputs, none is toolCallResult',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticToolTask(`
      <kunpeng:output source="=a" target="foo" />
      <kunpeng:output source="=b" target="bar" />
    `)),
    report: {
      id: 'Task_1',
      message: WARN_MESSAGE,
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_INVALID },
      path: OUTPUT_TARGET_PATH
    }
  },
  {
    name: 'misdirected result across the tool flow: reported on the element that wrote it, not the entry',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:outgoing>Flow_1</bpmn:outgoing>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_2">
          <bpmn:incoming>Flow_1</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=result" target="toolCalResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Task_2',
      message: WARN_MESSAGE,
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_INVALID },
      path: OUTPUT_TARGET_PATH
    }
  },
  {
    name: 'wrong casing on a downstream element: reported there, not on the entry',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:outgoing>Flow_1</bpmn:outgoing>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_2">
          <bpmn:incoming>Flow_1</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=result" target="toolcallresult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Task_2',
      message: 'Wrong casing "toolcallresult": use toolCallResult (case-sensitive).',
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_CASING_INVALID },
      path: OUTPUT_TARGET_PATH
    }
  },
  {
    name: 'tool with no result channel at all — returns nothing to the agent',
    config: { version: '8.8' },
    moddleElement: createModdle(agenticToolTask()),
    report: {
      id: 'Task_1',
      message: 'Tool returns nothing to the agent. Set a "toolCallResult" (at minimum, note the task completed).',
      data: { type: ERROR_TYPES.AGENT_TOOL_RESULT_MISSING },
      path: OUTPUTS_ANCHOR_PATH
    }
  },
  {
    name: 'script task resultVariable misdirected (toolResult)',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:scriptTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:script expression="=result" resultVariable="toolResult" />
          </bpmn:extensionElements>
        </bpmn:scriptTask>
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Task_1',
      message: WARN_MESSAGE,
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_INVALID },
      path: RESULT_VARIABLE_PATH
    }
  },
  {
    name: 'entry and downstream connector both set toolCallResult: downstream overwrites entry',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1" name="Fetch data">
          <bpmn:outgoing>Flow_1</bpmn:outgoing>
          <bpmn:extensionElements>
            <kunpeng:taskHeaders>
              <kunpeng:header key="resultExpression" value="={toolCallResult: response.body}" />
            </kunpeng:taskHeaders>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_2" name="Re-send">
          <bpmn:incoming>Flow_1</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:taskHeaders>
              <kunpeng:header key="resultExpression" value="={toolCallResult: response.body}" />
            </kunpeng:taskHeaders>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Task_2',
      message: 'This overwrites the "toolCallResult" value set on "Fetch data".',
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_OVERWRITE },
      path: HEADER_VALUE_PATH,
      name: 'Re-send'
    }
  },
  {
    name: 'wrong output target key inside legacy AI Agent template AHSP — treated as agentic, reported',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1" kunpeng:modelerTemplate="io.camunda.connectors.agenticai.aiagent.jobworker.v1">
        <bpmn:serviceTask id="Task_1">
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:input source="=toolCall.url" target="url" />
              <kunpeng:output source="=taskResult" target="result" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
      </bpmn:adHocSubProcess>
    `)),
    report: {
      id: 'Task_1',
      message: WARN_MESSAGE,
      data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_INVALID },
      path: OUTPUT_TARGET_PATH
    }
  },
  {
    name: 'three elements each overwrite toolCallResult: two warnings, each naming the one before it',
    config: { version: '8.8' },
    moddleElement: createModdle(createProcess(`
      <bpmn:adHocSubProcess id="AHSP_1">
        <bpmn:extensionElements>
          <kunpeng:properties>
            <kunpeng:property name="io.camunda.agenticai.toolContainer" value="true" />
          </kunpeng:properties>
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task_1">
          <bpmn:outgoing>Flow_1</bpmn:outgoing>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=a" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_2">
          <bpmn:incoming>Flow_1</bpmn:incoming>
          <bpmn:outgoing>Flow_2</bpmn:outgoing>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=b" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:serviceTask id="Task_3">
          <bpmn:incoming>Flow_2</bpmn:incoming>
          <bpmn:extensionElements>
            <kunpeng:ioMapping>
              <kunpeng:output source="=c" target="toolCallResult" />
            </kunpeng:ioMapping>
          </bpmn:extensionElements>
        </bpmn:serviceTask>
        <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="Task_2" />
        <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_2" targetRef="Task_3" />
      </bpmn:adHocSubProcess>
    `)),
    report: [
      {
        id: 'Task_2',
        message: 'This overwrites the "toolCallResult" value set on "Task_1".',
        data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_OVERWRITE },
        path: OUTPUT_TARGET_PATH
      },
      {
        id: 'Task_3',
        message: 'This overwrites the "toolCallResult" value set on "Task_2".',
        data: { type: ERROR_TYPES.AGENT_TOOL_OUTPUT_KEY_OVERWRITE },
        path: OUTPUT_TARGET_PATH
      }
    ]
  }
];

RuleTester.verify('agent-tool-output-key', rule, {
  valid,
  invalid
});
