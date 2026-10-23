var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import { is } from '@kunpeng-io/bpmn-js';
const LOW_PRIORITY = 250;
const _DeleteParticipantBehaviour = class _DeleteParticipantBehaviour extends CommandInterceptor {
  constructor(eventBus, canvas, modeling) {
    super(eventBus);
    this.postExecuted("shape.delete", LOW_PRIORITY, function(context) {
      const {
        collaborationRoot,
        shape
      } = context;
      const newRoot = canvas.getRootElement();
      if (is(shape, "bpmn:Participant") && collaborationRoot && !collaborationRoot.businessObject.get("participants").length && is(newRoot, "bpmn:Process")) {
        const oldProcessBusinessObject = shape.businessObject.get("processRef");
        if (!oldProcessBusinessObject) {
          return;
        }
        modeling.updateProperties(newRoot, { isExecutable: oldProcessBusinessObject.get("isExecutable") });
      }
    }, true);
  }
};
__name(_DeleteParticipantBehaviour, "DeleteParticipantBehaviour");
let DeleteParticipantBehaviour = _DeleteParticipantBehaviour;
DeleteParticipantBehaviour.$inject = [
  "eventBus",
  "canvas",
  "modeling"
];
export {
  DeleteParticipantBehaviour as default
};
//# sourceMappingURL=DeleteParticipantBehaviour.js.map
