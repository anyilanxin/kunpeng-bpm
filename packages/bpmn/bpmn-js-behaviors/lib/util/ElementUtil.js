var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function createElement(elementType, properties, parent, factory) {
  var element = factory.create(elementType, properties);
  element.$parent = parent;
  return element;
}
__name(createElement, "createElement");
export {
  createElement
};
//# sourceMappingURL=ElementUtil.js.map
