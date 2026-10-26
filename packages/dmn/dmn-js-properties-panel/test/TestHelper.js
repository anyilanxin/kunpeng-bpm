import {
  act,
  fireEvent
} from '@testing-library/preact';

import TestContainer from 'mocha-test-container-support';

import semver from 'semver';

import {
  bootstrapModeler,
  inject,
  insertCSS
} from './helper';

import propertiesPanelCss from '../dist/assets/properties-panel.css?raw';
import testCss from './test.css?raw';

import dmnDiagramCss from 'dmn-js/dist/assets/diagram-js.css?raw';
import dmnFontCss from 'dmn-js/dist/assets/dmn-font/css/dmn.css?raw';
import dmnFontEmbeddedCss from 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css?raw';
import dmnJsSharedCss from 'dmn-js/dist/assets/dmn-js-shared.css?raw';
import dmnJsDrdCss from 'dmn-js/dist/assets/dmn-js-drd.css?raw';
import dmnJsDecisionTableCss from 'dmn-js/dist/assets/dmn-js-decision-table.css?raw';
import dmnDecisionTableControlsCss from 'dmn-js/dist/assets/dmn-js-decision-table-controls.css?raw';
import dmnJsLiteralExpressionCss from 'dmn-js/dist/assets/dmn-js-literal-expression.css?raw';

import propertiesPanelPkg from '@kunpeng/properties-panel/package.json' with { type: 'json' };

let PROPERTIES_PANEL_CONTAINER;

export * from './helper';

export function bootstrapPropertiesPanel(diagram, options) {
  return async function() {
    const container = TestContainer.get(this);

    insertDmnStyles();
    insertCoreStyles();

    // (1) create modeler + import diagram
    const createModeler = bootstrapModeler(diagram, options);

    await act(() => createModeler.call(this));

    // (2) clean-up properties panel
    clearPropertiesPanelContainer();

    // (3) attach properties panel

    const attachPropertiesPanel = inject(function(propertiesPanel) {
      PROPERTIES_PANEL_CONTAINER = document.createElement('div');
      PROPERTIES_PANEL_CONTAINER.classList.add('properties-container');

      container.appendChild(PROPERTIES_PANEL_CONTAINER);

      return act(() => propertiesPanel.attachTo(PROPERTIES_PANEL_CONTAINER));
    });

    await attachPropertiesPanel();
  };
}

export function clearPropertiesPanelContainer() {
  if (PROPERTIES_PANEL_CONTAINER) {
    PROPERTIES_PANEL_CONTAINER.remove();
  }
}

export function changeInput(input, value) {
  fireEvent.input(input, { target: { value } });
}

export function clickInput(input) {
  fireEvent.click(input);
}

export function mouseEnter(element) {
  fireEvent.mouseEnter(element);
}

export function insertCoreStyles() {
  insertCSS(
    'properties-panel.css',
    propertiesPanelCss
  );

  insertCSS(
    'test.css',
    testCss
  );
}

/**
 * Execute test only if currently installed @kunpeng/properties-panel is of given version.
 *
 * @param {string} versionRange
 * @param {boolean} only
 */
export function withPropertiesPanel(versionRange, only = false) {
  if (propertiesPanelSatisfies(versionRange)) {
    return only ? it.only : it;
  } else {
    return it.skip;
  }
}

function propertiesPanelSatisfies(versionRange) {
  const version = propertiesPanelPkg.version;

  return semver.satisfies(version, versionRange, { includePrerelease: true });
}

export function insertDmnStyles() {

  insertCSS(
    'diagram.css',
    dmnDiagramCss
  );

  insertCSS('dmn.css',
    dmnFontCss
  );

  insertCSS('dmn-font.css',
    dmnFontEmbeddedCss
  );

  insertCSS('@kunpeng/dmn-js-shared.css',
    dmnJsSharedCss
  );

  insertCSS('@kunpeng/dmn-js-drd.css',
    dmnJsDrdCss
  );

  insertCSS('@kunpeng/dmn-js-decision-table.css',
    dmnJsDecisionTableCss
  );

  insertCSS('dmn-decision-table-controls.css',
    dmnDecisionTableControlsCss
  );

  insertCSS('@kunpeng/dmn-js-literal-expression.css',
    dmnJsLiteralExpressionCss
  );
}
