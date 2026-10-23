/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, any>;
  export default component;
}

// 属性面板家族包（JS 源码包，随仓构建）：示例按包名引用其产物
declare module '@kunpeng-io/bpmn-js-properties-panel' {
  export const BpmnPropertiesPanelModule: any;
  export const BpmnPropertiesProviderModule: any;
  export const KunpengPropertiesProviderModule: any;
  export const KunpengTooltipProvider: any;
  export const useService: any;
}

declare module '@kunpeng-io/properties-panel' {
  export const Group: any;
  export const ListGroup: any;
  export const CheckboxEntry: any;
  export const SelectEntry: any;
  export const TextAreaEntry: any;
  export const TextFieldEntry: any;
}

// 上游 bpmn-io 插件（JS 源码包，无类型声明）：didi 模块声明直插 additionalModules
declare module 'bpmn-js-color-picker/colors' {
  const colorPickerModule: any;
  export default colorPickerModule;
}

declare module 'diagram-js-grid' {
  const gridModule: any;
  export default gridModule;
}
