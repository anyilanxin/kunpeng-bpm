import {
  DebounceInputModule,
  ExpressionPopupModule
} from '@kunpeng/properties-panel';

import DmnPropertiesPanelRenderer from './DmnPropertiesPanelRenderer';

import Commands from '../cmd';

export default {
  __depends__: [
    Commands,
    DebounceInputModule,
    ExpressionPopupModule
  ],
  __init__: [
    'propertiesPanel'
  ],
  propertiesPanel: [ 'type', DmnPropertiesPanelRenderer ]
};
