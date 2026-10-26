import { findIndex } from 'min-dash';
import { Group } from '@kunpeng/properties-panel';
import {
  VersionTagProps,
  HistoryCleanupProps
} from './properties';


const LOW_PRIORITY = 500;
const KUNPENG_PLATFORM_GROUPS = [
  HistoryCleanupGroup,
];

/**
 * Provides `zeebe` namespace properties.
 *
 * @example
 * ```javascript
 * import DmnModeler from 'dmn-js/lib/Modeler';
 * import {
 *   DmnPropertiesPanelModule,
 *   DmnPropertiesProviderModule,
 *   KunpengPropertiesProviderModule
 * } from 'dmn-js-properties-panel';
 *
 * const modeler = new DmnModeler({
 *   container: '#canvas',
 *   propertiesPanel: {
 *     parent: '#properties'
 *   },
 *   additionalModules: [
 *     DmnPropertiesPanelModule,
 *     DmnPropertiesProviderModule,
 *     KunpengPropertiesProviderModule
 *   ]
 * });
 * ```
 */
export default class KunpengPropertiesProvider {

  constructor(propertiesPanel, injector) {
    propertiesPanel.registerProvider(LOW_PRIORITY, this);

    this._injector = injector;
  }

  getGroups(element) {
    return (groups) => {

      // (1) add Kunpeng Platform specific groups
      groups = groups.concat(this._getGroups(element));

      // (2) update existing groups with Kunpeng Platform specific properties
      updateGeneralGroup(groups, element);

      return groups;
    };
  }

  _getGroups(element) {
    const groups = KUNPENG_PLATFORM_GROUPS.map(createGroup => createGroup(element, this._injector));

    // contract: if a group returns null, it should not be displayed at all
    return groups.filter(group => group !== null);
  }
}

KunpengPropertiesProvider.$inject = [ 'propertiesPanel', 'injector' ];

function updateGeneralGroup(groups, element) {

  const generalGroup = findGroup(groups, 'general');

  if (!generalGroup) {
    return;
  }

  const { entries } = generalGroup;

  const idIndex = findIndex(entries, (entry) => entry.id === 'id');

  entries.splice(idIndex + 1, 0, ...VersionTagProps({ element }));
}

function HistoryCleanupGroup(element) {
  const group = {
    label: 'History cleanup',
    id: 'Kunpeng__HistoryCleanup',
    component: Group,
    entries: [
      ...HistoryCleanupProps({ element })
    ]
  };

  if (group.entries.length) {
    return group;
  }

  return null;
}

// helper /////////////////////

function findGroup(groups, id) {
  return groups.find(g => g.id === id);
}
