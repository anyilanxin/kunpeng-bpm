<script setup lang="ts">
/**
 * 组件接入示例（Vue 3）：
 * - 顶部卡片标题栏（左右两区）+ BPMN 画布专属悬浮工具栏 + 导入/导出 BPMN 文件
 * - Modeler 挂载到 div ref，示例插件按 URL 参数加载（?plugin=0 关闭）
 * - 属性面板（@kunpeng-io/bpmn-js-properties-panel）：编辑态经 additionalModules
 *   装配，容器经 propertiesPanel.parent 透传（插件 config 键，组件不逐键白名单）
 * - 颜色插件：工具栏填充/描边取色器 + 清除，走 modeling.setColor（bioc:fill/stroke 往返）；
 *   另接上游 bpmn-js-color-picker（contextPad 调色板弹窗，同一 setColor 通道），
 *   色板经 colorPicker config 键透传
 * - 上游 diagram-js-grid：画布背景网格层，随 gridSnapping 开关显隐，编辑态装配
 * - 流程图/XML 视图切换是示例自有的卡片组件（components/XmlViewCard.vue），
 *   只消费组件包公开 API（saveXML/importXML），组件包本身不含视图切换功能
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Modeler, Viewer, NavigatedViewer, iconOfElement } from '@kunpeng-io/bpmn-js';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  KunpengPropertiesProviderModule
} from '@kunpeng-io/bpmn-js-properties-panel';
// 上游 bpmn-io 插件（纯 DI 模块声明，additionalModules 直插；color-picker 须走 /colors 子路径）
import BpmnColorPickerModule from 'bpmn-js-color-picker/colors';
import gridModule from 'diagram-js-grid';
// kunpeng 业务协议由组件包内置（BpmnModdle 与上游 bpmn-moddle 标准资源一并注册），宿主无需注入
import { SamplePluginModule } from './sample-plugin';
import { CUSTOM_COLOR_PICKER_COLORS } from './color-palette';
import { createInitialBpmn } from './bpmn-template';
import XmlViewCard from './components/XmlViewCard.vue';

const canvasHost = ref<HTMLDivElement>();
const panelHost = ref<HTMLDivElement>();
const fileInput = ref<HTMLInputElement>();
const zoomLevel = ref('100%');

// ---------- 属性面板 / 颜色插件 ----------

const panelOpen = ref(true);
/** 面板可见 = 编辑态 + 流程图视图 + 用户未收起 */
const panelVisible = computed(() => form.value === 'edit' && view.value === 'diagram' && panelOpen.value);

// 渲染器主题缺省（BpmnRenderer DEFAULT_CONFIG）：取色器初值与未着色元素的实际观感一致
const DEFAULT_STROKE = '#000000';
const DEFAULT_FILL = '#ffffff';

const fillColor = ref(DEFAULT_FILL);
const strokeColor = ref(DEFAULT_STROKE);
/** 单选中的可着色元素（标签元素着色其宿主） */
const colorTarget = ref<any>(null);

function bindSelectionEvents(): void {
  if (!modeler) {
    return;
  }
  modeler.on('selection.changed', (event: any) => {
    const picked = event.newSelection.length === 1 ? event.newSelection[0] : null;
    colorTarget.value = picked?.labelTarget ?? picked;
    syncColorInputs();
  });
  // 撤销/重做/面板改色都可能改 colors，跟随受影响元素回显
  modeler.on('elements.changed', (event: any) => {
    if (colorTarget.value && event.elements?.includes(colorTarget.value)) {
      syncColorInputs();
    }
  });
}

function syncColorInputs(): void {
  const colors = colorTarget.value?.colors;
  fillColor.value = colors?.fill || DEFAULT_FILL;
  strokeColor.value = colors?.stroke || DEFAULT_STROKE;
}

function applyColors(): void {
  if (!colorTarget.value || !modeler || form.value !== 'edit') {
    return;
  }
  // 空值字段传 undefined = 清除该字段（ColorHandler 语义：回落主题缺省）
  modeler.get<any>('modeling').setColor(colorTarget.value, {
    fill: fillColor.value || undefined,
    stroke: strokeColor.value || undefined
  });
}

function clearColors(): void {
  if (!colorTarget.value || !modeler || form.value !== 'edit') {
    return;
  }
  modeler.get<any>('modeling').setColor(colorTarget.value, {});
}

// ---------- 流程图 / XML 视图切换（示例自有卡片组件，App 只保留视图状态做联动） ----------

const view = ref<'diagram' | 'xml'>('diagram');
const xmlCard = ref<InstanceType<typeof XmlViewCard>>();

let modeler: Modeler | null = null;
let commandStack: any = null;
let canvas: any = null;

/** 传给 XmlViewCard 的 modeler 取用函数（组件内所有 XML 读写都走它） */
function getModeler(): Modeler | null {
  return modeler;
}

const usePlugin = new URLSearchParams(location.search).get('plugin') !== '0';

/** 编辑态实例的模块装配：组件默认集 + 属性面板三模块 + grid/调色板插件（+示例插件） */
function editorModules(): any[] {
  const modules = [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    KunpengPropertiesProviderModule,
    gridModule,
    BpmnColorPickerModule
  ];
  return usePlugin ? [...modules, SamplePluginModule] : modules;
}

/** 渲染缺省主题（不落 XML：仅缺省渲染色，元素 bioc 色优先）——setTheme 为合并语义，两向都给全量值 */
const RENDERER_THEMES = {
  light: { defaultStrokeColor: '#000000', defaultFillColor: '#ffffff', labelColor: '#000000' },
  dark: { defaultStrokeColor: '#d6d6da', defaultFillColor: '#26262a', labelColor: '#d6d6da' }
} as const;
const dark = ref(false);

/** 暗色切换：令牌作用域 + 渲染缺省热切换（运行期 setTheme 全量重绘，不重建实例） */
function toggleDark(): void {
  dark.value = !dark.value;
  document.documentElement.classList.toggle('dark', dark.value);
  modeler?.get<any>('bpmnRenderer').setTheme(RENDERER_THEMES[dark.value ? 'dark' : 'light']);
}

/** 按形态建实例：编辑态挂属性面板（parent 容器 + 面板模块）+ 调色板配置，只读态不装编辑类模块 */
function createInstance(formKind: 'edit' | 'navigated' | 'view'): Modeler {
  const common = {
    container: canvasHost.value!,
    // 按当前主题给渲染缺省（实例重建后无需再 setTheme）
    bpmnRenderer: { ...RENDERER_THEMES[dark.value ? 'dark' : 'light'] }
  };
  if (formKind === 'edit') {
    return new Modeler({
      ...common,
      additionalModules: editorModules(),
      propertiesPanel: { parent: panelHost.value! },
      // 面板头部记法图标注入内核透出的 iconOfElement：画布/palette/面板三处同源
      bpmnElementIconRenderer: (element: any) => iconOfElement(element, 32),
      colorPicker: { colors: CUSTOM_COLOR_PICKER_COLORS }
    });
  }
  return formKind === 'navigated'
    ? new NavigatedViewer(common)
    : new Viewer(common);
}

function bindInstance(next: Modeler, formKind: 'edit' | 'navigated' | 'view'): void {
  modeler = next;
  (window as any).__modeler = next;
  commandStack = formKind === 'edit' ? next.get<any>('commandStack') : null;
  canvas = next.get<any>('canvas');
  next.on('canvas.viewbox.changed', () => syncZoom());
  bindSelectionEvents();
}

onMounted(async () => {
  bindInstance(createInstance('edit'), 'edit');
  syncZoom();
  document.addEventListener('keydown', onKeydown);
  // 初始流程模板由示例生成传入（动态 id），组件包不内置业务模板
  await modeler!.importXML(createInitialBpmn());
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  modeler?.destroy?.();
});

function syncZoom(): void {
  if (canvas) {
    zoomLevel.value = `${Math.round(canvas.zoom() * 100)}%`;
  }
}

// ---------- 工具栏动作 ----------

// 实例形态（框架三种实例化模式：Modeler=编辑 / NavigatedViewer=可缩放平移的只读 / Viewer=纯查看）。
// 切换 = 保留当前图内容重建实例（编辑类服务不进注入器，程序化路径亦不可用）
const form = ref<'edit' | 'navigated' | 'view'>('edit');
async function switchForm(next: 'edit' | 'navigated' | 'view'): Promise<void> {
  if (form.value === next || !modeler) {
    return;
  }
  const { xml } = await modeler.saveXML();
  modeler.destroy();
  colorTarget.value = null;
  syncColorInputs();
  bindInstance(createInstance(next), next);
  form.value = next;
  await modeler.importXML(xml);
}

function toggleOrientation(): void {
  if (!modeler || form.value !== 'edit') {
    return;
  }
  const svc = modeler.get<any>('orientationService');
  const next = svc.getOrientation() === 'vertical' ? 'horizontal' : 'vertical';
  modeler.get<any>('modeling').setOrientation(next);
}

function undo(): void {
  commandStack?.undo();
}
function redo(): void {
  commandStack?.redo();
}
function zoomIn(): void {
  canvas?.zoom(canvas.zoom() * 1.2);
}
function zoomOut(): void {
  canvas?.zoom(canvas.zoom() / 1.2);
}
function zoomReset(): void {
  canvas?.zoom(1, 'center');
}
function zoomFit(): void {
  // diagram-js 内置 fit-viewport：内容整体可见（缩放上限 100%），'auto' = 内容居中
  canvas?.zoom('fit-viewport', 'auto');
}

// ---------- BPMN 文件导入/导出 ----------

function pickFile(): void {
  fileInput.value?.click();
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !modeler) {
    return;
  }
  const xml = await file.text();
  // XML 视图下导入文件 = 载入编辑器（不直接改画布，走"应用更改"）
  if (view.value === 'xml') {
    xmlCard.value!.loadText(xml);
    return;
  }
  try {
    await modeler.importXML(xml);
    canvas?.zoom('fit-viewport', 'auto');
  } catch (error) {
    console.error('[bpmn-example] 导入失败', error);
    window.alert(`导入失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

async function exportBpmnFile(): Promise<void> {
  if (!modeler) {
    return;
  }
  // XML 视图下导出编辑器当前内容（含未应用修改）
  const xml = view.value === 'xml' ? xmlCard.value!.getText() : (await modeler.saveXML()).xml;
  const root = canvas.getRootElement();
  const name = root?.businessObject?.name?.trim() || 'diagram';
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}.bpmn`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ---------- 快捷键 ----------

function onKeydown(event: KeyboardEvent): void {
  if (!modeler || view.value === 'xml') {
    // XML 视图交给 textarea 原生编辑（原生撤销/全选等），画布快捷键全部挂起
    return;
  }
  const directEditing = modeler.get<any>('directEditing');
  if (directEditing?.isActive()) {
    return;
  }
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  } else if (mod && event.key === '0') {
    event.preventDefault();
    zoomReset();
  } else if (mod && (event.key === '=' || event.key === '+')) {
    event.preventDefault();
    zoomIn();
  } else if (mod && event.key === '-') {
    event.preventDefault();
    zoomOut();
  } else if ((event.key === 'Delete' || event.key === 'Backspace') && !isEditableTarget(event.target)) {
    const selected = modeler.get<any>('selection').get();
    if (selected.length > 0) {
      event.preventDefault();
      modeler.get<any>('modeling').removeElements(selected);
    }
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));
}

console.info(
  '[bpmn-example] 调试 API：__modeler.saveXML() / importXML(xml) / get("modeling") / get("commandStack")'
);
</script>

<template>
  <div class="example-app">
    <!-- 顶部悬浮工具栏（BPMN 画布专属：XML 视图下整体隐藏；样式/图标对齐 kunpeng-modeler CanvasToolbar） -->
    <div v-if="view === 'diagram'" class="canvas-toolbar" role="toolbar" aria-label="画布工具栏">
      <div class="ct-group">
        <button class="ct-btn" title="导入 BPMN 文件" @click="pickFile">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="M24 30V6M13 17 24 6l11 11" /><path d="M8 26v10a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V26" />
          </svg>
        </button>
        <button class="ct-btn" title="导出 BPMN 文件" @click="exportBpmnFile">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="M24 6v24M13 19l11 11 11-11" /><path d="M8 26v10a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V26" />
          </svg>
        </button>
      </div>
      <div class="ct-sep"></div>
      <div class="ct-group">
        <button class="ct-btn" title="编辑模式（Modeler：完整建模）" :class="{ 'ct-active': form === 'edit' }" @click="switchForm('edit')">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="m34 8 6 6L20 34l-8 2 2-8L34 8Z" />
          </svg>
        </button>
        <button class="ct-btn" title="导航查看模式（NavigatedViewer：只读，可缩放平移）" :class="{ 'ct-active': form === 'navigated' }" @click="switchForm('navigated')">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="M4 24s7.5-13 20-13 20 13 20 13-7.5 13-20 13S4 24 4 24Z" />
            <path d="M30 24a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button class="ct-btn" title="纯查看模式（Viewer：只读渲染）" :class="{ 'ct-active': form === 'view' }" @click="switchForm('view')">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="M8 12v24M8 24h18m0-12v24" />
            <path d="M38 26v10a6 6 0 0 1-6 6h-6" />
          </svg>
        </button>
        <button class="ct-btn" title="撤销 (Ctrl+Z)" :disabled="form !== 'edit'" @click="undo">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="m15.322 23.78-7.778-7.778 7.778-7.778M8.81 16H29.5C35.851 16 41 21.15 41 27.5 41 33.852 35.851 39 29.5 39H17" />
          </svg>
        </button>
        <button class="ct-btn" title="切换横/纵布局（全图转置）" :disabled="form !== 'edit'" @click="toggleOrientation">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="M10 38V10m0 0-6 6m6-6 6 6" />
            <path d="M38 10v28m0 0 6-6m-6 6-6-6" />
            <path d="M18 24h12" stroke-dasharray="4 4" />
          </svg>
        </button>
        <button class="ct-btn" title="重做 (Ctrl+Shift+Z)" :disabled="form !== 'edit'" @click="redo">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="m32.678 23.78 7.778-7.778-7.778-7.778M39.19 16H18.5C12.149 16 7 21.15 7 27.5 7 33.852 12.149 39 18.5 39H31" />
          </svg>
        </button>
      </div>
      <div class="ct-sep"></div>
      <!-- 颜色插件：选中元素填充/描边取色 + 清除（modeling.setColor，bioc:fill/stroke 随 DI 往返） -->
      <div v-if="form === 'edit'" class="ct-group ct-colors">
        <label class="ct-color" title="选中元素填充色（空=主题缺省）">
          <input type="color" v-model="fillColor" :disabled="!colorTarget" @change="applyColors" />
          <span>填充</span>
        </label>
        <label class="ct-color" title="选中元素描边色（空=主题缺省）">
          <input type="color" v-model="strokeColor" :disabled="!colorTarget" @change="applyColors" />
          <span>描边</span>
        </label>
        <button class="ct-btn" title="清除选中元素颜色" :disabled="!colorTarget" @click="clearColors">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="M24 6c6 8 12 13.5 12 21a12 12 0 1 1-24 0c0-7.5 6-13 12-21Z" />
            <path d="M10 38 38 10" />
          </svg>
        </button>
      </div>
      <div class="ct-sep"></div>
      <div class="ct-group">
        <button
          class="ct-btn"
          :title="dark ? '切到亮色模式' : '切到暗色模式'"
          @click="toggleDark"
        >
          {{ dark ? '☀' : '☾' }}
        </button>
        <button class="ct-btn" title="属性面板" :class="{ 'ct-active': panelOpen }" :disabled="form !== 'edit'" @click="panelOpen = !panelOpen">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="M8 6h32a2 2 0 0 1 2 2v32a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
            <path d="M30 6v36" />
            <path d="M14 16h8m-8 8h8m-8 8h8" />
          </svg>
        </button>
      </div>
      <div class="ct-sep"></div>
      <div class="ct-group ct-zoom">
        <button class="ct-btn" title="缩小 (Ctrl+-)" @click="zoomOut">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="M32.607 32.607A14.953 14.953 0 0 0 37 22c0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15 4.142 0 7.892-1.679 10.607-4.393Zm0 0L41.5 41.5M29 22H15" />
          </svg>
        </button>
        <span class="zoom-val" title="重置缩放 (Ctrl+0)" @click="zoomReset">{{ zoomLevel }}</span>
        <button class="ct-btn" title="放大 (Ctrl++)" @click="zoomIn">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path d="M32.607 32.607A14.953 14.953 0 0 0 37 22c0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15 4.142 0 7.892-1.679 10.607-4.393Zm0 0L41.5 41.5M29 22H15m7 7V15" />
          </svg>
        </button>
        <button class="ct-btn" title="适应画布" @click="zoomFit">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" class="ct-svg-icon">
            <path clip-rule="evenodd" d="M24 6c9.941 0 18 8.059 18 18s-8.059 18-18 18S6 33.941 6 24 14.059 6 24 6Z" />
            <path d="M30 24a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" fill="currentColor" stroke="none" />
            <path d="M30 24a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 建模器画布宿主（卡片内容区·流程图侧）：常驻渲染，XML 视图由 XmlViewCard 的
         不透明内容区整体覆盖——display:none 会让导入时视口计算得 0 尺寸（SVGMatrix NaN）；
         属性面板可见时画布右缘让出面板列宽 -->
    <div
      ref="canvasHost"
      class="canvas-host"
      :class="{ 'canvas-host--with-panel': panelVisible }"
    ></div>

    <!-- 属性面板宿主（右侧列）：面板模块自行挂载/重挂（实例切换时 diagram.init 重挂） -->
    <aside v-show="panelVisible" ref="panelHost" class="properties-host"></aside>

    <!-- 卡片内容区·XML 侧 + 顶部标题栏（左右两区，切换器在最右）：示例自有组件 -->
    <XmlViewCard ref="xmlCard" v-model:view="view" :get-modeler="getModeler" />

    <!-- 导入 BPMN 文件选择（隐藏，由工具栏触发） -->
    <input ref="fileInput" type="file" accept=".bpmn,.xml,text/xml,application/xml" hidden @change="onFileChange" />
  </div>
</template>

<style scoped>
.example-app {
  position: relative;
  height: 100vh;
}

/* 画布从顶部标题栏（36px）以下开始铺满；面板可见时右缘让出面板列 */
.canvas-host {
  position: absolute;
  top: 36px;
  left: 0;
  right: 0;
  bottom: 0;
  transition: right 0.15s ease-out;
}

.canvas-host--with-panel {
  right: 340px;
}

.canvas-host :deep(.djs-container) {
  width: 100%;
  height: 100%;
}

/* 属性面板列：基座面板自带滚动与内部观感（bio-properties-panel-container），这里只管定位 */
.properties-host {
  position: absolute;
  top: 36px;
  right: 0;
  bottom: 0;
  width: 340px;
  border-left: 1px solid var(--x-border, #e8e8e8);
  background: var(--x-surface, #fff);
  z-index: 5;
  overflow: hidden;
}

/* 颜色取色器：原生 color input 收敛为小色块，与工具栏按钮同高 */
.ct-colors {
  align-items: center;
}

.ct-color {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: inherit;
  cursor: pointer;
}

.ct-color input[type='color'] {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid var(--x-border, #d9d9d9);
  border-radius: 3px;
  background: var(--x-surface, #fff);
  cursor: pointer;
}

.ct-color input[type='color']:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>

<style>
/*
 * 暗色模式令牌（html.dark 作用域）：
 * - diagram-js 表面（palette/弹框/面包屑）走 --bio-* 令牌
 * - 属性面板走 --color-* 原语（其消费变量全部派生自这几个原语）
 * - 示例自有铬件走 --x-* ；画布元素渲染缺省由 bpmnRenderer.setTheme 热切换
 */
/* diagram-js 令牌宿主是容器自身（Canvas 挂 .bio-theme-parent 于 .djs-container），
   html 级覆盖是祖先定义永远不生效——必须覆盖在宿主元素上 */
.dark .djs-container,
.dark .bio-theme-parent {
  --bio-surface: hsl(0, 0%, 14%);
  --bio-surface-overlay: hsl(0, 0%, 17%);
  --bio-surface-subtle: hsl(228, 6%, 12%);
  --bio-surface-medium: hsl(228, 6%, 20%);
  --bio-text: hsl(0, 0%, 90%);
  --bio-text-subtle: hsl(0, 0%, 70%);
  --bio-text-subtlest: hsl(0, 0%, 52%);
  --bio-border: hsl(228, 6%, 34%);
  --bio-border-disabled: hsl(228, 6%, 28%);
  --bio-primary: hsl(205, 100%, 65%);
  --bio-primary-surface: hsl(205, 40%, 18%);
  --bio-canvas-accent: hsl(205, 100%, 65%);

}

.dark {
  color-scheme: dark;
  --x-surface: #212124;
  --x-border: #3a3a40;
}

/* 面板令牌覆盖在消费根（.bio-properties-panel）上，与默认宿主位置无关 */
.dark .bio-properties-panel {
  --color-white: hsl(228, 6%, 13%);
  --color-grey-225-10-97: hsl(228, 6%, 11%);
  --color-grey-225-10-95: hsl(228, 6%, 15%);
  --color-grey-225-10-85: hsl(228, 6%, 22%);
  --color-grey-225-10-75: hsl(228, 6%, 30%);
  --color-grey-225-10-55: hsl(0, 0%, 58%);
  --color-grey-225-10-35: hsl(0, 0%, 72%);
  --color-grey-225-10-15: hsl(0, 0%, 90%);
  --color-blue-205-100-50: hsl(205, 100%, 65%);
  --color-red-360-100-92: hsl(360, 30%, 26%);
  --color-red-360-100-97: hsl(360, 30%, 18%);
}

.dark body,
.dark .example-app {
  background: hsl(228, 6%, 9%);
  color: hsl(0, 0%, 90%);
}
</style>
