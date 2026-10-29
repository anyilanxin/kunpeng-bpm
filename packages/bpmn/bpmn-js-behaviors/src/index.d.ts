/**
 * kunpeng 扩展缺省行为集（源码直出包，JS 源 + 手写类型面）。
 *
 * 用法：宿主 additionalModules 直插——
 *   import behaviorsModule from '@kunpeng-io/bpmn-js-behaviors';
 *   new Modeler({ additionalModules: [behaviorsModule] })
 */
declare const behaviorsModule: {
  /** 急切初始化的行为服务名清单（15 个保留行为） */
  __init__: string[];
  [serviceName: string]: unknown;
};

export default behaviorsModule;
