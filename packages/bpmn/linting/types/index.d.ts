/**
 * @kunpeng-io/linting —— Linter 核心（XML 字符串驱动的 BPMN 校验）。
 *
 * 手写薄声明（JS 源码直出包，无 tsc 产线）：消费方（示例/宿主）经
 * additionalModules 或直接调用，入出参以运行时契约为准。
 */
export declare class Linter {
  constructor(options?: {
    modeler?: 'desktop' | 'web' | string;
    plugins?: any[];
    type?: string;
    /** 文档未携带 modeler:executionPlatform 标记时的缺省平台（缺省 Kunpeng Cloud） */
    defaultExecutionPlatform?: string;
    defaultExecutionPlatformVersion?: string;
  });

  /** 校验 XML 字符串（或已解析 moddle 根），返回扁平报告数组 */
  lint(contents: string | any): Promise<any[]>;
}
