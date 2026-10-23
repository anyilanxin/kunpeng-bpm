/**
 * 初始 BPMN 模板（示例自有：初始图由宿主生成并传入，组件包不内置业务模板）。
 * id 后缀统一 7 位小写字母数字，与组件工厂（Ids seed 36bit base36）一致。
 */

/** 生成唯一 id：prefix + 7 位 base36 随机段（不足补齐再截断，长度恒 7） */
export function nextId(prefix: string): string {
  let suffix = '';
  while (suffix.length < 7) {
    suffix += Math.random().toString(36).slice(2);
  }
  return `${prefix}${suffix.slice(0, 7)}`;
}

/** 示例版本号（exporter 与 executionPlatform 元数据） */
const APP_VERSION = '2026.10.0';

/**
 * 初始流程模板：空流程 = 一个开始事件。
 * Definitions_/Process_ 的 id 每次生成都不同；StartEvent_1、BPMNDiagram_1、BPMNPlane_1、
 * _BPMNShape_StartEvent_2 为固定 id。
 */
export function createInitialBpmn(): string {
  const definitionsId = nextId('Definitions_');
  const processId = nextId('Process_');
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:modeler="http://anyilanxin.com/schema/modeler/1.0" id="${definitionsId}" targetNamespace="http://bpmn.io/schema/bpmn" exporter="kunpeng-modeler" exporterVersion="${APP_VERSION}" modeler:executionPlatform="Kunpeng Cloud" modeler:executionPlatformVersion="${APP_VERSION}">
  <bpmn:process id="${processId}" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="159" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}
