/**
 * @kunpeng-io/linting/modeler —— 画布 linting 集成模块（didi 装配单元）。
 *
 * 手写薄声明（JS 源码直出包，无 tsc 产线）：经 Modeler additionalModules
 * 装配后提供 `linting`（activate/deactivate/lint）与 `lintingAnnotations`
 * 服务；工具栏插件非严格探测 `linting` 服务自动出现「开启校验」钮。
 */
interface LintingService {
  isActive(): boolean;
  activate(): void;
  deactivate(): void;
  lint(): Promise<any[]>;
}

declare const lintingModelerModule: {
  __init__: string[];
  linting: ['type', new (...args: any[]) => LintingService];
  lintingAnnotations: ['type', new (...args: any[]) => any];
};

export default lintingModelerModule;
