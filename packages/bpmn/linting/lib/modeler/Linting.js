import { isArray } from 'min-dash';

import { Linter } from '../Linter.js';
import { getErrors, getReportEntryIds } from '../utils/properties-panel.js';

// 移植注（2026-10-29，@kunpeng-io/bpmn-js 接入）：原文件从
// bpmn-js/lib/util/ModelUtil 引入 is/getBusinessObject——家族包禁止构建期
// 依赖自研内核（GPL/MIT 分发边界 + 依赖方向，见内核 AGENTS 插件契约），
// 两者改为本地结构访问实现，判定语义同 ModelUtil（moddle $instanceOf
// 继承链）。
function is(element, type) {
  const bo = element && element.businessObject;

  return !!(bo && typeof bo.$instanceOf === 'function' && bo.$instanceOf(type));
}

function getBusinessObject(element) {
  return element && element.businessObject;
}

export default class Linting {
  constructor(canvas, config, elementRegistry, eventBus, injector, lintingAnnotations, selection) {
    this._canvas = canvas;
    this._elementRegistry = elementRegistry;
    this._eventBus = eventBus;
    this._injector = injector;
    this._lintingAnnotations = lintingAnnotations;
    this._selection = selection;

    // 校验核心：config.linting 整体透传 Linter 构造项
    // （type/modeler/plugins/defaultExecutionPlatform…，active 为本服务自留键）
    this._linter = new Linter(config || {});

    // 内核门面（约定服务名 bpmnjs）：saveXML 取校验输入。非严格解析——
    // 宿主自拼底座无该服务时 lint() 返回空集（不抛错，校验静默不可用）
    this._bpmnjs = injector.get('bpmnjs', false);

    this._active = config && config.active || false;
    this._reports = [];
    this._lintToken = 0;

    eventBus.on('selection.changed', () => this._update());

    eventBus.on('lintingAnnotations.click', ({ report }) => this.showError(report));

    // 激活态下文档变更自动重校验（命令栈变化/重新导入），结果经令牌去旧
    eventBus.on('commandStack.changed', () => {
      if (this._active) {
        this.lint();
      }
    });

    eventBus.on('import.done', () => {
      if (this._active) {
        this.lint();
      }
    });

    if (this._active) {
      this.lint();
    }
  }

  /**
   * 立即校验当前文档：saveXML → Linter.lint → 标注/面板错误/完成事件。
   * 异步竞态以令牌收敛——变更风暴中过期结果被丢弃，末次校验结果生效。
   */
  async lint() {
    if (!this._bpmnjs) {
      return [];
    }

    const token = this._lintToken = this._lintToken + 1;

    const { xml } = await this._bpmnjs.saveXML();
    const reports = await this._linter.lint(xml);

    if (token !== this._lintToken) {
      return reports;
    }

    this.setErrors(reports);

    this._eventBus.fire('linting.completed', { reports });

    return reports;
  }

  showError(report) {
    const { id } = report;

    const selectableElement = this._getSelectableElement(id);

    if (selectableElement) {
      this._canvas.scrollToElement(selectableElement);

      if (selectableElement === this._canvas.getRootElement()) {
        this._selection.select();
      } else {
        this._selection.select(selectableElement);
      }
    }

    // let a properties panel listener resolve the entry from the report's moddle
    // path (so a template-bound field opens its template entry), falling back to
    // the statically derived ids; shared with `getErrors` so a report resolves
    // to the same ids no matter the call site
    const entryIds = getReportEntryIds(
      report,
      selectableElement,
      (element, path) => this._resolveEntryId(element, path)
    );

    const entryId = entryIds[ Math.max(0, entryIds.length - 1) ];

    // TODO(philippfromme): remove timeout once properties panel is fixed
    setTimeout(() => {
      this._eventBus.fire('propertiesPanel.showEntry', {
        id: entryId
      });
    });
  }

  setErrors(reports) {
    this._reports = reports;

    this._update();
  }

  activate() {
    this._active = true;

    this._update();

    this.lint();
  }

  deactivate() {
    this._active = false;

    this._update();
  }

  isActive() {
    return this._active;
  }

  _update() {

    // 仅在激活时（宿主/工具栏开启校验）才展示画布标注与属性面板错误，
    // 否则清空——关闭校验不污染画布与元素属性面板。
    const active = this.isActive();

    // set annotations
    this._lintingAnnotations.setErrors(active ? this._reports : []);

    // set properties panel errors
    const selectedElement = this._getSelectedElement();

    this._eventBus.fire('propertiesPanel.setErrors', {
      errors: active
        ? getErrors(this._reports, selectedElement, (element, path) => this._resolveEntryId(element, path))
        : []
    });
  }

  /**
   * Resolves the (rendered) entry ID through the properties panel.
   *
   * Returns `null` when the panel is absent or nothing resolves,
   * so callers fall back to the statically derived ids.
   *
   * @param {Object} element
   * @param {Array<string|number>} path
   *
   * @return {string|null}
   */
  _resolveEntryId(element, path) {
    if (!element || !isArray(path) || !path.length) {
      return null;
    }

    const propertiesPanel = this._injector && this._injector.get('propertiesPanel', false);

    if (!propertiesPanel || typeof propertiesPanel.getEntryId !== 'function') {
      return null;
    }

    return propertiesPanel.getEntryId(element, path) || null;
  }

  _getSelectableElement(id) {
    let element = this._elementRegistry.get(id);

    if (!element) {
      element = this._elementRegistry.filter(element => {
        const processRef = is(element, 'bpmn:Participant')
          && getBusinessObject(element).get('processRef');

        return processRef && processRef.get('id') === id;
      })[ 0 ];
    }

    return element;
  }

  _getSelectedElement() {
    const selection = this._selection.get();

    if (!selection || !selection.length) {
      const root = this._canvas.getRootElement();

      // 画布隐式根（diagram-js 导入间隙/空画布）无 businessObject——本内核
      // 根仅在文档导入后携带语义根 bo，此时视作无选中元素（报告归集为空）
      return root && root.businessObject ? root : null;
    }

    const selectedElement = selection[ 0 ];

    if (isLabel(selectedElement)) {
      return selectedElement.labelTarget;
    }

    return selectedElement;
  }
}

Linting.$inject = [
  'canvas',
  'config.linting',
  'elementRegistry',
  'eventBus',
  'injector',
  'lintingAnnotations',
  'selection'
];

function isLabel(element) {
  return !!element.labelTarget;
}
