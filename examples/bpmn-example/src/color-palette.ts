/**
 * bpmn-js-color-picker 色板配置（对齐 engine-frontend/bpmn-design 的 CUSTOM_COLOR_PICKER_COLORS）。
 * 经 Modeler 构造项 colorPicker.colors 整体透传（插件 config 键契约），
 * fill/stroke 传 undefined = 该字段不着色，Default 两者皆空 = 清除回落主题缺省。
 */
export const CUSTOM_COLOR_PICKER_COLORS = [
  { label: 'Default', fill: undefined, stroke: undefined },
  { label: 'ForestGreen', fill: undefined, stroke: '#228B22' },
  { label: 'BlueNoFill', fill: undefined, stroke: '#0D4372' },
  { label: 'Blue', fill: '#BBDEFB', stroke: '#0D4372' },
  { label: 'OrangeNoFill', fill: undefined, stroke: '#6B3C00' },
  { label: 'Orange', fill: '#FFE0B2', stroke: '#6B3C00' },
  { label: 'GreenNoFill', fill: undefined, stroke: '#205022' },
  { label: 'Green', fill: '#C8E6C9', stroke: '#205022' },
  { label: 'RedNoFill', fill: undefined, stroke: '#831311' },
  { label: 'Red', fill: '#FFCDD2', stroke: '#831311' },
  { label: 'PurpleNoFill', fill: undefined, stroke: '#5B176D' },
  { label: 'Purple', fill: '#E1BEE7', stroke: '#5B176D' },
  { label: 'ExtendColorOneNoFill', fill: undefined, stroke: '#3069a7' },
  { label: 'ExtendColorOne', fill: '#8fb6f8', stroke: '#3069a7' },
  { label: 'ExtendColorTwoNoFill', fill: undefined, stroke: '#1e80ff' },
  { label: 'ExtendColorTwo', fill: '#6ab4ee', stroke: '#1e80ff' },
  { label: 'ExtendColorThreeNoFill', fill: undefined, stroke: '#75597d' },
  { label: 'ExtendColorThree', fill: '#ff6b81', stroke: '#75597d' },
  { label: 'ExtendColorFourNoFill', fill: undefined, stroke: '#ed742e' },
  { label: 'ExtendColorFour', fill: '#f3ae57', stroke: '#ed742e' }
];
