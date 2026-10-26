import { createApp } from 'vue';
import App from './App.vue';
// diagram-js 基座样式（palette/context pad/overlays/选中 handles 布局全在其中），
// 必须先于组件皮肤引入（与 bpmn-example 同款宿主职责）
import 'diagram-js/assets/diagram-js.css';
import '@kunpeng-io/dmn-js/styles';
import '@kunpeng-io/dmn-js-properties-panel/dist/assets/properties-panel.css';

createApp(App).mount('#app');
