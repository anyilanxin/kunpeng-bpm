/**
 * Placeholder provider factory（对齐 bpmn 线 PanelPlaceholderProvider 契约）：
 * translate 缺省回落恒等（未接词典的宿主零变化），接入后占位文案随词典走
 * （dmn 线 translate 工厂桥 dmnI18n，见 dmn-js modules.ts dmnTranslateFactory）。
 */
export const PanelPlaceholderProvider = (translate) => {
  if (!translate) translate = (text) => text;

  return {

    getEmpty: () => {
      return {
        text: translate('Select an element to edit its properties.'),

        // todo(pinussilvestrus): add icon
        icon: null
      };
    },

    getMultiple: () => {
      return {
        text: translate('Multiple elements are selected. Select a single element to edit its properties.'),

        // todo(pinussilvestrus): add icon
        icon: null
      };
    },
  };
};
