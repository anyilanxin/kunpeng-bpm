/**
 * npm moddle-xml@12（未随包发布类型）的最小类型面：仅声明本组件消费的
 * Writer（描述驱动序列化，toXML 同步返回 xml 字符串）。
 */
declare module 'moddle-xml' {
  export class Writer {
    constructor(options?: Record<string, unknown>);
    toXML(element: any, options?: Record<string, unknown>): string;
  }

  export class Reader {
    constructor(options?: Record<string, unknown>);
    handler(typeName: string): any;
    fromXML(xml: string, rootHandler?: any, options?: Record<string, unknown>): Promise<any>;
  }
}
