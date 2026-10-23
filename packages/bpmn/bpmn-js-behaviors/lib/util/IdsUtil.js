var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Ids } from "ids";
const ids = new Ids([32, 32, 1]);
function getPrefixedId(prefix) {
  return ids.nextPrefixed(prefix);
}
__name(getPrefixedId, "getPrefixedId");
export {
  getPrefixedId
};
//# sourceMappingURL=IdsUtil.js.map
