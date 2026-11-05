/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, any>;
  export default component;
}

// 属性面板家族包（JS 源码包，随仓构建）：示例按包名引用其产物
declare module '@kunpeng-io/dmn-js-properties-panel' {
  export const DmnPropertiesPanelModule: any;
  export const DmnPropertiesProviderModule: any;
  export const KunpengPropertiesProviderModule: any;
  export const KunpengTooltipProvider: any;
  export const useService: any;
}

// 上游 diagram-js-grid（JS 源码包，无类型声明）：背景网格模块直插 additionalModules
declare module 'diagram-js-grid' {
  const gridModule: any;
  export default gridModule;
}

// npm table-js@9.4.0（bpmn.io，无类型声明）：示例直连 dmn-js 源码编译，需自带垫片
// （dmn-js 包内的同款垫片在 src/types/table-js.d.ts，不进示例编译单元）
declare module 'table-js' {
  const Table: any;
  export default Table;
}
declare module 'table-js/lib/features/selection' {
  const selectionModule: any;
  export default selectionModule;
}
declare module 'table-js/lib/features/interaction-events' {
  const interactionEventsModule: any;
  export default interactionEventsModule;
}
