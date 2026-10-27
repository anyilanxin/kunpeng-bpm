function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
import { closest as domClosest } from 'min-dom';
const EVENTS = ['click', 'dblclick', 'contextmenu', 'mousedown', 'mouseup', 'mouseenter', 'mouseleave', 'mouseout', 'mouseover', 'mousemove', 'focusin', 'focusout', 'drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'];

/**
 * Provides interaction events on the table.
 *
 * @param {RenderConfig} config
 * @param {EventBus} eventBus
 */
export default class InteractionEvents {
  constructor(config, eventBus) {
    _defineProperty(this, "_handleEvent", event => {
      const {
        target,
        type
      } = event;
      const node = findClosestCell(target);
      if (!node) {
        return;
      }
      const elementId = node.getAttribute('data-element-id');
      if (elementId) {
        const e = this._eventBus.createEvent({
          id: elementId,
          event,
          node,
          target: node
        });
        this._eventBus.fire(`cell.${type}`, e);
        if (e.defaultPrevented) {
          event.preventDefault();
        }
        if (e.cancelBubble) {
          event.stopPropagation();
        }
      }
    });
    this._eventBus = eventBus;
    this._container = config.container;
    eventBus.on('table.init', () => {
      this._addEventListeners(EVENTS);
    });
    eventBus.on('table.destroy', () => {
      this._removeEventListeners(EVENTS);
    });
  }
  _addEventListeners(events) {
    const container = this._container;
    events.forEach(event => {
      container.addEventListener(event, this._handleEvent);
    });
  }
  _removeEventListeners(events) {
    const container = this._container;
    events.forEach(event => {
      container.removeEventListener(event, this._handleEvent);
    });
  }
}
InteractionEvents.$inject = ['config.renderer', 'eventBus'];

// helpers /////////////

function findClosestCell(element) {
  return domClosest(element, '[data-element-id]', true);
}
//# sourceMappingURL=InteractionEvents.js.map