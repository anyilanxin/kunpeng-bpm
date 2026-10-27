<script setup lang="ts">
/**
 * 组件接入示例（Vue 3，2026-10-28 按 bpmn-example 结构重做）：
 * - 顶部卡片标题栏（左：实例形态菜单，右：暗色钮 + DRD 图/XML 切换）+
 *   DMN 画布专属悬浮工具栏（插件化）
 * - 实例形态（编辑/导航/预览）在标题栏左侧菜单切换——工具栏专注画布动作，
 *   不承载实例形态；切换=保留图内容按形态重建实例（Modeler/NavigatedViewer/
 *   Viewer，对齐 bpmn-example「按形态建实例」）
 * - 工具栏插件（@kunpeng-io/dmn-js-toolbar，对齐 bpmn 线插件、无布局切换钮）：
 *   撤销/重做/缩放为插件内置，应用级动作（导入/导出/往返自检）经
 *   dmnToolbar.actions 注册，相对画布水平居中，宽度上限内装不下收「更多」；
 *   三形态实例通用装配（只读底座缺的编辑服务由插件自行非严格解析，相应组不建）
 * - 网格背景（上游 diagram-js-grid）：编辑态装配（建模辅助，只读形态不装）；
 *   纯 SVG pattern 绘制，无样式依赖
 * - 属性面板（@kunpeng-io/dmn-js-properties-panel 家族包）：编辑态右侧列
 *   （340px），三模块装配（渲染基座 + 通用组 General/Documentation + kunpeng
 *   组〔Decision 的 versionTag/historyTimeToLive〕）；面板开关在标题栏右区
 *   bar 槽位；XML 视图下隐藏（panelVisible 联动）
 * - 暗色（标题栏右区钮）：壳层令牌 + html.dark 作用域（--dmn- 与 --bio- 令牌）
 *   + dmnRenderer.setTheme（画布元素填充/描边/文字热切换，不落 XML）
 * - DRD 图/XML 视图切换是示例自有的卡片组件（components/XmlViewCard.vue），
 *   只消费组件包公开 API（saveXML/importXML）
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { Modeler, Viewer, NavigatedViewer } from '@kunpeng-io/dmn-js';
import { DmnToolbarModule } from '@kunpeng-io/dmn-js-toolbar';
import type { ToolbarActionSpec } from '@kunpeng-io/dmn-js-toolbar';
import {
  DmnPropertiesPanelModule,
  DmnPropertiesProviderModule,
  KunpengPropertiesProviderModule
} from '@kunpeng-io/dmn-js-properties-panel';
import gridModule from 'diagram-js-grid';
import { sampleDmn } from './dmn-template';
import XmlViewCard from './components/XmlViewCard.vue';

const canvasHost = ref<HTMLDivElement>();
const panelHost = ref<HTMLDivElement>();
const fileInput = ref<HTMLInputElement>();
const xmlCard = ref<InstanceType<typeof XmlViewCard>>();

// ---------- 实例形态（标题栏菜单切换，对齐 bpmn-example） ----------

const modeler = shallowRef<Modeler | null>(null);
const view = ref<'diagram' | 'xml'>('diagram');
const dark = ref(false);

// ---------- 属性面板（编辑态右侧列，bar 槽开关） ----------

const panelOpen = ref(true);
/** 面板可见 = 编辑形态 + DRD 视图 + 未收起（XML 视图面板无意义，随视图隐藏） */
const panelVisible = computed(() => form.value === 'edit' && view.value === 'diagram' && panelOpen.value);

/** 渲染缺省主题（不落 XML：仅缺省渲染色——setTheme 为合并语义，两向都给全量值） */
const RENDERER_THEMES = {
  light: { defaultStrokeColor: '#000000', defaultFillColor: '#ffffff', labelColor: '#000000' },
  dark: { defaultStrokeColor: '#d6d6da', defaultFillColor: '#26262a', labelColor: '#d6d6da' }
} as const;

/** 编辑态独有模块：网格背景 + 属性面板三模块（渲染基座 + 通用组 + kunpeng 组） */
function editorModules() {
  return [gridModule, DmnPropertiesPanelModule, DmnPropertiesProviderModule, KunpengPropertiesProviderModule];
}

/** 按形态建实例（对齐 bpmn-example）：编辑=Modeler / 导航=NavigatedViewer /
 * 预览=Viewer；工具栏三形态通用装配，主题 config 恒带（重建后无需再 setTheme）；
 * 编辑态另挂网格 + 属性面板（parent 容器注入，渲染器 import.done 时自行挂载） */
function createInstance(formKind: 'edit' | 'navigated' | 'view'): Modeler {
  const base = instanceBase();
  if (formKind !== 'edit') {
    return formKind === 'navigated' ? new NavigatedViewer(base) : new Viewer(base);
  }
  return new Modeler({
    ...base,
    additionalModules: [...base.additionalModules, ...editorModules()],
    propertiesPanel: { parent: panelHost.value! }
  });
}

function instanceBase() {
  return {
    container: canvasHost.value!,
    additionalModules: [DmnToolbarModule],
    dmnToolbar: { actions: buildToolbarActions() },
    dmnRenderer: { ...RENDERER_THEMES[dark.value ? 'dark' : 'light'] }
  };
}

function bindInstance(next: Modeler): void {
  modeler.value = next;
  // 浏览器验收钩子（真实 UI 路径之外的程序化探针入口）
  (window as any).__dmn = next;
}

/** 实例形态切换：保留当前图内容重建实例（编辑类服务不进只读底座注入器） */
async function switchForm(next: 'edit' | 'navigated' | 'view'): Promise<void> {
  if (form.value === next || !modeler.value) {
    return;
  }
  const { xml } = await modeler.value.saveXML();
  modeler.value.destroy();
  bindInstance(createInstance(next));
  form.value = next;
  await modeler.value.importXML(xml);
}

onMounted(async () => {
  bindInstance(createInstance('edit'));
  try {
    await modeler.value!.importXML(sampleDmn);
  } catch (error) {
    window.alert(`导入失败：${error instanceof Error ? error.message : String(error)}`);
  }
});

onBeforeUnmount(() => {
  modeler.value?.destroy();
});

/** 暗色切换（标题栏右区钮）三合一：壳层令牌 + html.dark 作用域（内核 --dmn-
 *  与 diagram-js --bio- 令牌）+ dmnRenderer.setTheme（画布元素热切换） */
function toggleDark(): void {
  dark.value = !dark.value;
  document.documentElement.classList.toggle('dark', dark.value);
  modeler.value?.get<any>('dmnRenderer').setTheme(RENDERER_THEMES[dark.value ? 'dark' : 'light']);
}

// ---------- 应用动作图标（自绘 48×48 viewBox/描边宽 4，与插件内置图标同语言） ----------

const actionSvg = (paths: string): string =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter">${paths}</svg>`;

const ICON_IMPORT = actionSvg('<path d="M24 30V6M13 17 24 6l11 11" /><path d="M8 26v10a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V26" />');
const ICON_EXPORT = actionSvg('<path d="M24 6v24M13 19l11 11 11-11" /><path d="M8 26v10a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V26" />');
const ICON_ROUNDTRIP = actionSvg(
  '<path d="M14 10h20a8 8 0 0 1 8 8v0a8 8 0 0 1-8 8H14" /><path d="m20 20-6 6 6 6" /><path d="M34 38H14a8 8 0 0 1-8-8v0a8 8 0 0 1 8-8h20" /><path d="m28 28 6 6-6 6" />'
);
const ICON_EDIT = actionSvg('<path d="m34 8 6 6L20 34l-8 2 2-8L34 8Z" />');
const ICON_NAVIGATE = actionSvg(
  '<path d="M4 24s7.5-13 20-13 20 13 20 13-7.5 13-20 13S4 24 4 24Z" />' +
  '<path d="M30 24a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" fill="currentColor" stroke="none" />'
);
const ICON_VIEW = actionSvg('<path d="M8 12v24M8 24h18m0-12v24" /><path d="M38 26v10a6 6 0 0 1-6 6h-6" />');
const ICON_DARK = actionSvg(
  '<path d="M24 8a16 16 0 1 0 0 32 16 16 0 0 0 0-32Z" />' +
  '<path d="M24 8a16 16 0 0 1 0 32Z" fill="currentColor" stroke="none" />'
);
const ICON_PANEL = actionSvg(
  '<path d="M8 6h32a2 2 0 0 1 2 2v32a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />' +
  '<path d="M30 6v36" /><path d="M14 16h8m-8 8h8m-8 8h8" />'
);

/** 形态菜单（编辑 / 导航 / 预览；工具栏不承载形态切换） */
const MODES = [
  { value: 'edit', label: '编辑模式', hint: 'Modeler：完整建模', svg: ICON_EDIT },
  { value: 'view', label: '预览模式', hint: 'Viewer：只读渲染', svg: ICON_VIEW },
  { value: 'navigated', label: '导航模式', hint: '只读，可缩放平移', svg: ICON_NAVIGATE }
] as const;
const currentModeLabel = ref('编辑模式');
const modeMenuOpen = ref(false);

function chooseMode(next: 'edit' | 'navigated' | 'view'): void {
  modeMenuOpen.value = false;
  void switchForm(next);
}

function onModeMenuDocDown(event: MouseEvent): void {
  if (!(event.target as HTMLElement).closest('.mode-menu')) {
    modeMenuOpen.value = false;
  }
}
watch(modeMenuOpen, (open) => {
  if (open) {
    document.addEventListener('mousedown', onModeMenuDocDown);
  } else {
    document.removeEventListener('mousedown', onModeMenuDocDown);
  }
});

/** 形态响应式（与 MODES 联动：switchForm 后 label 随 form 更新） */
const form = ref<'edit' | 'navigated' | 'view'>('edit');
watch(form, (value) => {
  currentModeLabel.value = MODES.find((m) => m.value === value)!.label;
});

// ---------- 工具栏应用动作（导入 / 导出 / 往返自检） ----------

function buildToolbarActions(): ToolbarActionSpec[] {
  return [
    { id: 'import', title: '导入 DMN 文件', group: 'file', svg: ICON_IMPORT, onClick: pickFile, showInPreview: true },
    { id: 'export', title: '导出 DMN 文件', group: 'file', svg: ICON_EXPORT, onClick: () => void exportDmnFile(), showInPreview: true },
    { id: 'roundtrip', title: '字节级往返自检', group: 'file', svg: ICON_ROUNDTRIP, onClick: () => void runRoundTrip(), showInPreview: true }
  ];
}

function pickFile(): void {
  fileInput.value?.click();
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !modeler.value) {
    return;
  }
  const xml = await file.text();
  // XML 视图下导入文件 = 载入编辑器（不直接改画布，走「应用更改」）
  if (view.value === 'xml') {
    xmlCard.value!.loadText(xml);
    return;
  }
  try {
    await modeler.value.importXML(xml);
  } catch (error) {
    window.alert(`导入失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

async function exportDmnFile(): Promise<void> {
  if (!modeler.value) {
    return;
  }
  // XML 视图下导出编辑器当前内容（含未应用修改）
  const xml = view.value === 'xml' ? xmlCard.value!.getText() : (await modeler.value.saveXML()).xml;
  const root = modeler.value.get<any>('canvas').getRootElement();
  const name = root?.businessObject?.name?.trim() || 'definitions';
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}.dmn`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 字节级往返自检：saveXML→importXML→saveXML 三点一致（组件包硬验收口径） */
async function runRoundTrip(): Promise<void> {
  if (!modeler.value) {
    return;
  }
  const dmn = view.value === 'xml' ? null : modeler.value;
  if (!dmn) {
    window.alert('XML 视图下请先应用更改再自检');
    return;
  }
  try {
    const xml1 = (await dmn.saveXML()).xml;
    await dmn.importXML(xml1);
    const xml2 = (await dmn.saveXML()).xml;
    window.alert(xml1 === xml2 ? `往返一致（${xml1.length} 字符）` : `往返不一致！${xml1.length} → ${xml2.length}`);
  } catch (error) {
    window.alert(`自检失败：${error instanceof Error ? error.message : String(error)}`);
  }
}
</script>

<template>
  <div class="example-app">
    <!-- 实例形态菜单（标题栏左区）：编辑 / 预览 / 导航；工具栏专注画布动作 -->
    <div class="mode-menu">
      <button
        class="mode-menu-btn"
        aria-haspopup="menu"
        :aria-expanded="modeMenuOpen"
        @click="modeMenuOpen = !modeMenuOpen"
      >{{ currentModeLabel }}<span class="mode-caret">▾</span></button>
      <div v-if="modeMenuOpen" class="mode-menu-panel" role="menu">
        <button
          v-for="mode in MODES"
          :key="mode.value"
          class="mode-menu-item"
          :class="{ active: form === mode.value }"
          role="menuitem"
          @click="chooseMode(mode.value)"
        >
          <span class="mode-menu-icon" v-html="mode.svg"></span>
          <span class="mode-menu-text">
            <span class="mode-menu-label">{{ mode.label }}</span>
            <span class="mode-menu-hint">{{ mode.hint }}</span>
          </span>
          <span class="mode-menu-check">{{ form === mode.value ? '✓' : '' }}</span>
        </button>
      </div>
    </div>

    <!-- 建模器画布宿主（卡片内容区·DRD 侧）：常驻渲染，XML 视图由 XmlViewCard
         的不透明内容区整体覆盖——display:none 会让导入时视口计算得 0 尺寸；
         XML 视图下藏画布内高图层悬浮件（工具栏 z-150/角标 overlays 会戳出
         XML 卡片覆盖层 z-25） -->
    <div
      ref="canvasHost"
      class="canvas-host"
      :class="{ 'canvas-host--with-panel': panelVisible, 'canvas-host--xml': view === 'xml' }"
    ></div>

    <!-- 属性面板宿主（右侧列，编辑态）：面板模块自行挂载（import.done 时 attach），
         形态/视图切换面板隐藏但容器常驻（v-show，重建实例仍可注入） -->
    <aside v-show="panelVisible" ref="panelHost" class="properties-host"></aside>

    <!-- 卡片内容区·XML 侧 + 顶部标题栏：右区 bar 槽位挂宿主动作钮（暗色，
         切换器左侧） -->
    <XmlViewCard ref="xmlCard" v-model:view="view" :get-modeler="() => modeler">
      <template #bar>
        <div class="bar-app-actions">
          <button
            class="bar-icon-btn"
            :class="{ active: panelVisible }"
            title="属性面板"
            aria-label="属性面板"
            @click="panelOpen = !panelOpen"
          >
            <span class="bar-icon" v-html="ICON_PANEL"></span>
          </button>
          <button
            class="bar-icon-btn"
            :class="{ active: dark }"
            title="切换暗色模式"
            aria-label="切换暗色模式"
            @click="toggleDark()"
          >
            <span class="bar-icon" v-html="ICON_DARK"></span>
          </button>
        </div>
      </template>
    </XmlViewCard>

    <!-- 导入 DMN 文件选择（隐藏，由工具栏触发） -->
    <input ref="fileInput" type="file" accept=".dmn,.xml" hidden @change="onFileChange" />
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

/* 属性面板列：面板基座自带滚动与内部观感（bio-properties-panel-container），
   这里只管定位与暗色边框令牌 */
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

/* 实例形态菜单（标题栏左区，与 XmlViewCard 标题栏同层叠放） */
.mode-menu {
  position: absolute;
  top: 0;
  left: 12px;
  z-index: 30;
  height: 36px;
}

.mode-menu-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  margin-top: 5px;
  padding: 0 10px;
  font-size: 12px;
  color: #2c3345;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.mode-menu-btn:hover {
  background: #eef0f4;
}

.mode-caret {
  font-size: 10px;
  color: #8a93a5;
}

.mode-menu-panel {
  position: absolute;
  top: 34px;
  left: 0;
  min-width: 232px;
  padding: 4px;
  background: var(--x-surface, #fff);
  border: 1px solid var(--x-border, #e2e5ea);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(15, 19, 30, 0.12);
}

.mode-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
}

.mode-menu-item:hover {
  background: #f0f2f6;
}

.mode-menu-icon {
  display: flex;
  color: #57607a;
}

.mode-menu-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.mode-menu-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mode-menu-label {
  font-size: 12px;
  color: #2c3345;
}

.mode-menu-item.active .mode-menu-label {
  font-weight: 600;
}

.mode-menu-hint {
  font-size: 11px;
  color: #8a93a5;
}

.mode-menu-check {
  width: 16px;
  font-size: 12px;
  color: #2d71eb;
  text-align: center;
}

/* 标题栏右区宿主动作钮（XmlViewCard bar 槽位注入）：与形态菜单钮同皮肤语言 */
.bar-app-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.bar-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: #57607a;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.bar-icon-btn:hover:not(:disabled) {
  background: #eef0f4;
}

.bar-icon-btn.active {
  color: #2d71eb;
  background: #e8f1fe;
}

.bar-icon {
  display: flex;
}

.bar-icon :deep(svg) {
  width: 15px;
  height: 15px;
}

/* XML 视图：藏画布内高图层悬浮件——工具栏 z-150 与角标 overlays 容器都会
   戳出 XML 卡片覆盖层（z-25）；画布本体保持渲染（视口计算需要尺寸），
   插件 DOM 无 scoped 属性须 :deep */
.canvas-host--xml :deep(.dmn-toolbar),
.canvas-host--xml :deep(.djs-overlay) {
  display: none;
}

.canvas-host :deep(.djs-container) {
  width: 100%;
  height: 100%;
}
</style>

<style>
/*
 * 暗色模式令牌（html.dark 作用域，对齐 bpmn-example 写法）：
 * - diagram-js 表面（palette/弹框/工具栏）走 --bio-* 令牌
 * - dmn 专属面（下钻编辑器/决策表/overview）走内核自带的 --dmn-* 令牌集
 * - 示例自有铬件走 --x-*；画布元素渲染缺省由 dmnRenderer.setTheme 热切换
 */
/* diagram-js 令牌宿主是容器自身（Canvas 挂 .bio-theme-parent 于
   .djs-container），html 级覆盖是祖先定义永远不生效——必须覆盖在宿主元素上 */
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

/* 属性面板暗色：令牌覆盖在消费根（.bio-properties-panel）上（与 bpmn-example
   同款写法）；面板头部图标的白色内底换面板表面色 */
.dark .bio-properties-panel-header-type-icon svg [fill='#ffffff'] {
  fill: hsl(228, 6%, 13%);
}

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
