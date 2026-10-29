import { groupBy } from 'min-dash';

import { domify } from 'min-dom';

import { renderOverlay } from './OverlayComponent.js';

// 移植注（2026-10-29）：原从 bpmn-js/lib/util/ModelUtil 引入——家族包禁
// 构建期依赖自研内核，本地实现同语义（moddle $instanceOf 继承链判定）
function is(element, type) {
  const bo = element && element.businessObject;

  return !!(bo && typeof bo.$instanceOf === 'function' && bo.$instanceOf(type));
}


export default class LintingAnnotations {
  constructor(canvas, elementRegistry, eventBus, overlays) {
    this._canvas = canvas;
    this._elementRegistry = elementRegistry;
    this._eventBus = eventBus;
    this._overlays = overlays;

    this._reportsByElement = {};

    this._overlayIds = {};
  }

  setErrors(reports) {
    this._reportsByElement = groupBy(reports.filter(report => report.category !== 'rule-error'), 'id');

    this._update();
  }

  _update(reportsByElement) {
    if (!reportsByElement) {
      reportsByElement = this._reportsByElement;
    }

    this._overlays.remove({ type: 'linting' });

    Object.entries(reportsByElement).forEach(([ id, reports ]) => {
      const element = this._elementRegistry.get(id);

      if (!element || element === this._canvas.getRootElement()) {
        return;
      }

      const html = domify(`
        <div class="cl-overlay-root"></div>
      `);

      renderOverlay(html, {
        reports,
        onClick: () => {
          this._eventBus.fire('lintingAnnotations.click', { report: reports[ 0 ] });
        }
      });

      const position = getAnnotationPosition(element);

      const overlayId = this._overlays.add(element, 'linting', {
        position,
        html,
        scale: {
          min: .7
        }
      });

      this._overlayIds[ id ] = overlayId;
    });
  }
}

LintingAnnotations.$inject = [
  'canvas',
  'elementRegistry',
  'eventBus',
  'overlays'
];


function getAnnotationPosition(element) {

  if (!element.parent) {

    if (is(element, 'bpmn:SubProcess')) {
      return {
        top: 50,
        left: 150
      };
    }

    return {
      top: 20,
      left: 150
    };
  }

  return {
    bottom: 14,
    left: -6
  };
}