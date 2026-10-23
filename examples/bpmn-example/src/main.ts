/**
 * Vue 接入示例入口。
 * 组件按包名引用（与 npm 使用方一致）：new Modeler({ container }) 挂载即用；
 * 样式 = diagram-js.css（画布/面板基础观感）+ 组件自有功能样式（styles 子路径）
 *   + 属性面板基座样式（properties-panel 家族包 assets）；
 * 图标全部为组件内联自绘 SVG，无字体图标依赖。
 */
import { createApp } from 'vue';
import 'diagram-js/assets/diagram-js.css';
import '@kunpeng-io/bpmn-js/styles';
import '@kunpeng-io/properties-panel/assets/properties-panel.css';
import './app.css';
import App from './App.vue';

createApp(App).mount('#app');
