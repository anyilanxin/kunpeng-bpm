const RuleTester = require('bpmnlint/lib/testers/rule-tester');

const { createModdle, createProcess } = require('../helper');

const { ERROR_TYPES } = require('../../rules/utils/element');

const rule = require('../../rules/kunpeng/variable-name');

const valid = [
  {
    name: 'io mapping with valid variable names',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target="validName" source="=value" />
            <kunpeng:output target="outputVar" source="=result" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
  },
  {
    name: 'io mapping with dot-separated variable names',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target="outer.inner.value" source="=data" />
            <kunpeng:output target="result.data.value" source="=output" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
  },
  {
    name: 'io mapping with underscore in variable names',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target="_private" source="=value" />
            <kunpeng:output target="some_value" source="=result" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
  },
  {
    name: 'multi-instance with valid variable names',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:multiInstanceLoopCharacteristics>
          <bpmn:extensionElements>
            <kunpeng:loopCharacteristics
              inputCollection="=items"
              inputElement="item"
              outputCollection="results"
              outputElement="=result" />
          </bpmn:extensionElements>
        </bpmn:multiInstanceLoopCharacteristics>
      </bpmn:serviceTask>
    `)
    ),
  },
  {
    name: 'multi-instance with dot-separated variable names',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:multiInstanceLoopCharacteristics>
          <bpmn:extensionElements>
            <kunpeng:loopCharacteristics
              inputCollection="=data.items"
              inputElement="current.item"
              outputCollection="data.results"
              outputElement="=current.result" />
          </bpmn:extensionElements>
        </bpmn:multiInstanceLoopCharacteristics>
      </bpmn:serviceTask>
    `)
    ),
  },
  {
    name: 'script task with valid result variable',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:scriptTask id="ScriptTask">
        <bpmn:extensionElements>
          <kunpeng:script expression="=someExpression" resultVariable="scriptResult" />
        </bpmn:extensionElements>
      </bpmn:scriptTask>
    `)
    ),
  },
  {
    name: 'business rule task with valid result variable',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:businessRuleTask id="BusinessRuleTask">
        <bpmn:extensionElements>
          <kunpeng:calledDecision decisionId="decision" resultVariable="decisionResult" />
        </bpmn:extensionElements>
      </bpmn:businessRuleTask>
    `)
    ),
  },
  {
    name: 'task without variable names',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:taskDefinition type="jobType" />
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
  },
  {
    name: 'ad-hoc subprocess with valid outputCollection',
    config: { version: '8.8' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:adHocSubProcess id="AdHocSubProcess">
        <bpmn:extensionElements>
          <kunpeng:adHoc outputCollection="results" outputElement="=item" />
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task" />
      </bpmn:adHocSubProcess>
    `)
    ),
  },
  {
    name: 'ad-hoc subprocess with dot-separated outputCollection',
    config: { version: '8.8' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:adHocSubProcess id="AdHocSubProcess">
        <bpmn:extensionElements>
          <kunpeng:adHoc outputCollection="data.results" outputElement="=item" />
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task" />
      </bpmn:adHocSubProcess>
    `)
    ),
  },
];

const invalid = [
  {
    name: 'io mapping input target with hyphen',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target="inner-outer" source="=value" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
    report: {
      id: 'ServiceTask',
      message: 'Property value of <inner-oute...> not allowed',
      path: [ 'extensionElements', 'values', 0, 'inputParameters', 0, 'target' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Input',
        parentNode: 'ServiceTask',
        property: 'target',
      },
    },
  },
  {
    name: 'io mapping output target with hyphen',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:output target="result-value" source="=value" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
    report: {
      id: 'ServiceTask',
      message: 'Property value of <result-val...> not allowed',
      path: [ 'extensionElements', 'values', 0, 'outputParameters', 0, 'target' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Output',
        parentNode: 'ServiceTask',
        property: 'target',
      },
    },
  },
  {
    name: 'io mapping target starting with digit',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target="123invalid" source="=value" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
    report: {
      id: 'ServiceTask',
      message: 'Property value of <123invalid> not allowed',
      path: [ 'extensionElements', 'values', 0, 'inputParameters', 0, 'target' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Input',
        parentNode: 'ServiceTask',
        property: 'target',
      },
    },
  },
  {
    name: 'io mapping target starting with dot',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target=".invalid" source="=value" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
    report: {
      id: 'ServiceTask',
      message: 'Property value of <.invalid> not allowed',
      path: [ 'extensionElements', 'values', 0, 'inputParameters', 0, 'target' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Input',
        parentNode: 'ServiceTask',
        property: 'target',
      },
    },
  },
  {
    name: 'io mapping target ending with dot',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target="invalid." source="=value" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
    report: {
      id: 'ServiceTask',
      message: 'Property value of <invalid.> not allowed',
      path: [ 'extensionElements', 'values', 0, 'inputParameters', 0, 'target' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Input',
        parentNode: 'ServiceTask',
        property: 'target',
      },
    },
  },
  {
    name: 'io mapping target with double dots',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target="outer..inner" source="=value" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
    report: {
      id: 'ServiceTask',
      message: 'Property value of <outer..inn...> not allowed',
      path: [ 'extensionElements', 'values', 0, 'inputParameters', 0, 'target' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Input',
        parentNode: 'ServiceTask',
        property: 'target',
      },
    },
  },
  {
    name: 'multi-instance inputElement with hyphen',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:multiInstanceLoopCharacteristics>
          <bpmn:extensionElements>
            <kunpeng:loopCharacteristics inputCollection="=items" inputElement="current-item" />
          </bpmn:extensionElements>
        </bpmn:multiInstanceLoopCharacteristics>
      </bpmn:serviceTask>
    `)
    ),
    report: {
      id: 'ServiceTask',
      message: 'Property value of <current-it...> not allowed',
      path: [ 'loopCharacteristics', 'extensionElements', 'values', 0, 'inputElement' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:LoopCharacteristics',
        parentNode: 'ServiceTask',
        property: 'inputElement',
      },
    },
  },
  {
    name: 'multi-instance outputCollection with hyphen',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:multiInstanceLoopCharacteristics>
          <bpmn:extensionElements>
            <kunpeng:loopCharacteristics
              inputCollection="=items"
              outputCollection="my-results"
              outputElement="=result" />
          </bpmn:extensionElements>
        </bpmn:multiInstanceLoopCharacteristics>
      </bpmn:serviceTask>
    `)
    ),
    report: {
      id: 'ServiceTask',
      message: 'Property value of <my-results> not allowed',
      path: [ 'loopCharacteristics', 'extensionElements', 'values', 0, 'outputCollection' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:LoopCharacteristics',
        parentNode: 'ServiceTask',
        property: 'outputCollection',
      },
    },
  },
  {
    name: 'ad-hoc subprocess outputCollection with hyphen',
    config: { version: '8.8' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:adHocSubProcess id="AdHocSubProcess">
        <bpmn:extensionElements>
          <kunpeng:adHoc outputCollection="my-results" outputElement="=item" />
        </bpmn:extensionElements>
        <bpmn:serviceTask id="Task" />
      </bpmn:adHocSubProcess>
    `)
    ),
    report: {
      id: 'AdHocSubProcess',
      message: 'Property value of <my-results> not allowed',
      path: [ 'extensionElements', 'values', 0, 'outputCollection' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:AdHoc',
        parentNode: 'AdHocSubProcess',
        property: 'outputCollection',
      },
    },
  },
  {
    name: 'script task with invalid result variable',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:scriptTask id="ScriptTask">
        <bpmn:extensionElements>
          <kunpeng:script expression="=someExpression" resultVariable="script-result" />
        </bpmn:extensionElements>
      </bpmn:scriptTask>
    `)
    ),
    report: {
      id: 'ScriptTask',
      message: 'Property value of <script-res...> not allowed',
      path: [ 'extensionElements', 'values', 0, 'resultVariable' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:Script',
        parentNode: 'ScriptTask',
        property: 'resultVariable',
      },
    },
  },
  {
    name: 'business rule task with invalid result variable',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:businessRuleTask id="BusinessRuleTask">
        <bpmn:extensionElements>
          <kunpeng:calledDecision decisionId="decision" resultVariable="decision-result" />
        </bpmn:extensionElements>
      </bpmn:businessRuleTask>
    `)
    ),
    report: {
      id: 'BusinessRuleTask',
      message: 'Property value of <decision-r...> not allowed',
      path: [ 'extensionElements', 'values', 0, 'resultVariable' ],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: 'kunpeng:CalledDecision',
        parentNode: 'BusinessRuleTask',
        property: 'resultVariable',
      },
    },
  },
  {
    name: 'multiple invalid variable names',
    config: { version: '8.7' },
    moddleElement: createModdle(
      createProcess(`
      <bpmn:serviceTask id="ServiceTask">
        <bpmn:extensionElements>
          <kunpeng:ioMapping>
            <kunpeng:input target="input-var" source="=value" />
            <kunpeng:output target="output-var" source="=result" />
          </kunpeng:ioMapping>
        </bpmn:extensionElements>
      </bpmn:serviceTask>
    `)
    ),
    report: [
      {
        id: 'ServiceTask',
        message: 'Property value of <input-var> not allowed',
        path: [ 'extensionElements', 'values', 0, 'inputParameters', 0, 'target' ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
          node: 'kunpeng:Input',
          parentNode: 'ServiceTask',
          property: 'target',
        },
      },
      {
        id: 'ServiceTask',
        message: 'Property value of <output-var> not allowed',
        path: [ 'extensionElements', 'values', 0, 'outputParameters', 0, 'target' ],
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
          node: 'kunpeng:Output',
          parentNode: 'ServiceTask',
          property: 'target',
        },
      },
    ],
  },
];

RuleTester.verify('variable-name', rule, {
  valid,
  invalid
});
