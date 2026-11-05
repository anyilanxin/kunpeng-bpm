/**
 * 元素语义工具（自研，净室——语义自行设计，不引上游实现）。
 *
 * 面向插件生态（属性面板等家族包）的元素判型/取值约定：
 * - 画布元素的语义载体是 businessObject；家族包可能直接把业务对象当
 *   element 传（getBusinessObject 契约：有则取之，无则视为自身）；
 * - 判型走 moddle 继承链（DMN 元模型是继承树：Decision→DRGElement→
 *   DMNElement——生态判型常打抽象基类，$type 精确等会漏）；非 moddle
 *   对象（无 $instanceOf）退化为 $type 精确相等；
 * - 标签取 DMN 通用命名属性 name（连线无 name 时返回 undefined，
 *   消费方自行兜底显示）。
 */

/** 取元素的语义业务对象：有 businessObject 取之，否则视为自身是业务对象 */
export function getBusinessObject(element: any): any {
  return element?.businessObject ?? element;
}

/** 判型：moddle 继承链 $instanceOf（type 支持数组=任一命中）；非 moddle 对象退 $type 精确相等 */
export function is(element: any, type: string | string[]): boolean {
  const bo = getBusinessObject(element);
  if (!bo) {
    return false;
  }
  const matches = (t: string): boolean =>
    typeof bo.$instanceOf === 'function' ? bo.$instanceOf(t) : bo.$type === t;
  return Array.isArray(type) ? type.some(matches) : matches(type);
}

/** 判型（多类型糖衣）：is 的数组语义直达 */
export function isAny(element: any, types: string[]): boolean {
  return is(element, types);
}

/** 取元素显示标签：DMN 通用命名属性 name */
export function getLabel(element: any): string | undefined {
  return getBusinessObject(element)?.name;
}
