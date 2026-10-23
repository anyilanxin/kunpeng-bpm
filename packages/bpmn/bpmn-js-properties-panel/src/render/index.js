import BpmnPropertiesPanelRenderer from './BpmnPropertiesPanelRenderer';

import Commands from '../cmd';
import { DebounceInputModule, ExpressionPopupModule } from '@kunpeng-io/properties-panel';

export default {
  __depends__: [
    Commands,
    DebounceInputModule,
    ExpressionPopupModule
  ],
  __init__: [
    'propertiesPanel'
  ],
  propertiesPanel: [ 'type', BpmnPropertiesPanelRenderer ]
};
