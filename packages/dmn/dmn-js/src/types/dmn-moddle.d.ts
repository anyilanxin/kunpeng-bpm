/**
 * npm dmn-moddle@12（无官方类型）的最小类型面：入口为命名导出 DmnModdle
 * （simple 装配工厂：内置 dc/di/dmn13/dmndi13/biodi 五包 + 宿主扩展包
 * 合并 → 引擎实例）。
 */
declare module 'dmn-moddle' {
  import type { Moddle } from 'moddle';

  export function DmnModdle(
    additionalPackages?: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Moddle & {
    fromXML(xml: string, typeName?: string, options?: Record<string, unknown>): Promise<{
      rootElement: any;
      references: { element: any; property: string; id: string }[];
      warnings: { message?: string }[];
      elementsById: Record<string, any>;
    }>;
    toXML(element: any, options?: Record<string, unknown>): Promise<{ xml: string }>;
  };
}
