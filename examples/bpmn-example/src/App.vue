<script setup lang="ts">
/**
 * 组件接入示例（Vue 3）：
 * - 顶部卡片标题栏（左：实例形态菜单，右：流程图/XML 切换）+ BPMN 画布专属
 *   悬浮工具栏（插件化）+ 导入/导出 BPMN 文件
 * - Modeler 挂载到 div ref，示例插件按 URL 参数加载（?plugin=0 关闭）
 * - 实例形态（编辑/预览/导航）在标题栏左侧菜单切换——编辑器工具栏专注画布
 *   动作，不承载实例形态（导航需求由导航形态单独提供，编辑态自带导航工具）
 * - 工具栏插件（@kunpeng-io/bpmn-js-toolbar）：撤销/重做/缩放/转置为插件内置，
 *   应用级动作（导入导出/取色器/暗色/面板）经 bpmnToolbar.actions 注册，
 *   相对画布水平居中，宽度上限内装不下收「更多」；三形态实例通用装配
 *   （只读底座缺的编辑服务由插件自行非严格解析，相应组不建）
 * - 属性面板（@kunpeng-io/bpmn-js-properties-panel）：编辑态经 additionalModules
 *   装配，容器经 propertiesPanel.parent 透传（插件 config 键，组件不逐键白名单）
 * - 颜色插件：工具栏取色器 + 清除，走 modeling.setColor（bioc:fill/stroke 往返）；
 *   另接上游 bpmn-js-color-picker（contextPad 调色板弹窗，同一 setColor 通道），
 *   色板经 colorPicker config 键透传
 * - 上游 diagram-js-grid：画布背景网格层，随 gridSnapping 开关显隐，编辑态装配
 * - 上游 diagram-js-minimap：画布缩略图/视口导航（参考 kunpeng-modeler 接法）
 * - 流程图/XML 视图切换是示例自有的卡片组件（components/XmlViewCard.vue），
 *   只消费组件包公开 API（saveXML/importXML），组件包本身不含视图切换功能
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { Modeler, Viewer, NavigatedViewer, iconOfElement } from '@kunpeng-io/bpmn-js';
import { BpmnToolbarModule } from '@kunpeng-io/bpmn-js-toolbar';
import type { ToolbarActionSpec } from '@kunpeng-io/bpmn-js-toolbar';
import MinimapModule from 'diagram-js-minimap';
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

// ---------- 属性面板 / 颜色插件 ----------

const panelOpen = ref(true);
/** 面板可见 = 编辑态 + 流程图视图 + 用户未收起 */
const panelVisible = computed(() => form.value === 'edit' && view.value === 'diagram' && panelOpen.value);

/** 取色器回显缺省随当前渲染主题（未着色元素的实际观感）：与 RENDERER_THEMES 同源 */
function pickerDefault(kind: 'fill' | 'stroke'): string {
  const theme = RENDERER_THEMES[dark.value ? 'dark' : 'light'];
  return kind === 'fill' ? theme.defaultFillColor : theme.defaultStrokeColor;
}

const fillColor = ref('#ffffff');
const strokeColor = ref('#000000');
/** 单选中的可着色元素（标签元素着色其宿主）。
 *  必须 shallowRef：深层 ref 读出的是 reactive 代理，传给 modeling.setColor 后
 *  elements.changed 链上 GraphicsFactory 迭代代理的 children 会触发 JS 代理
 *  不变量错误（object-refs 把 children 定义为只读非配置数据属性，代理 get
 *  不得换值）→ DI 同步监听器被跳过、bioc 色落不了 XML、命令栈事件链断 */
const colorTarget = shallowRef<any>(null);

/** 取色器原始 input 元素（插件 render() 一次性建 DOM，选择变化由示例自持监听回写） */
let fillColorInput: HTMLInputElement | null = null;
let strokeColorInput: HTMLInputElement | null = null;

function bindSelectionEvents(): void {
  if (!modeler) {
    return;
  }
  modeler.on('selection.changed', (event: any) => {
    const picked = event.newSelection.length === 1 ? event.newSelection[0] : null;
    colorTarget.value = picked?.labelTarget ?? picked;
    syncColorInputs();
    // 取色器可用态随选择变化（清除钮 isEnabled / input disabled）
    refreshToolbar();
  });
  // 撤销/重做/面板改色都可能改 colors，跟随受影响元素回显
  modeler.on('elements.changed', (event: any) => {
    if (colorTarget.value && event.elements?.includes(colorTarget.value)) {
      syncColorInputs();
    }
  });
}

/** 回显取色器：选择/颜色变化后写原始 input（工具栏 DOM 是插件一次性建的）；
    未着色字段回显当前主题缺省（原生 color input 无"无值"态） */
function syncColorInputs(): void {
  const colors = colorTarget.value?.colors;
  fillColor.value = colors?.fill || pickerDefault('fill');
  strokeColor.value = colors?.stroke || pickerDefault('stroke');
  if (fillColorInput) {
    fillColorInput.value = fillColor.value;
    fillColorInput.disabled = !colorTarget.value;
  }
  if (strokeColorInput) {
    strokeColorInput.value = strokeColor.value;
    strokeColorInput.disabled = !colorTarget.value;
  }
}

/** 提交被改字段；对侧字段仅在元素已有显式色时回传保留。ColorHandler 是
    colors 整替语义（未传字段=清除回落主题缺省）——未显式的对侧不传，
    观感恰是元素当前渲染（不会把"回显用的缺省值"误写成显式色） */
function applyColors(kind: 'fill' | 'stroke'): void {
  if (!colorTarget.value || !modeler || form.value !== 'edit') {
    return;
  }
  const other: 'fill' | 'stroke' = kind === 'fill' ? 'stroke' : 'fill';
  const colors: { fill?: string; stroke?: string } = {
    [kind]: kind === 'fill' ? fillColor.value : strokeColor.value
  };
  const otherExplicit = colorTarget.value.colors?.[other];
  if (otherExplicit) {
    colors[other] = otherExplicit;
  }
  modeler.get<any>('modeling').setColor(colorTarget.value, colors);
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

/** 编辑态实例的模块装配：组件默认集 + 属性面板三模块 + grid/调色板/缩略图插件（+示例插件） */
function editorModules(): any[] {
  const modules = [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    KunpengPropertiesProviderModule,
    gridModule,
    BpmnColorPickerModule,
    MinimapModule
  ];
  return usePlugin ? [...modules, SamplePluginModule] : modules;
}

/** 渲染缺省主题（不落 XML：仅缺省渲染色，元素 bioc 色优先）——setTheme 为合并语义，两向都给全量值 */
const RENDERER_THEMES = {
  light: { defaultStrokeColor: '#000000', defaultFillColor: '#ffffff', labelColor: '#000000' },
  dark: { defaultStrokeColor: '#d6d6da', defaultFillColor: '#26262a', labelColor: '#d6d6da' }
} as const;
const dark = ref(false);

/** 暗色切换：令牌作用域 + 渲染缺省热切换（运行期 setTheme 全量重绘，不重建实例）；
    未着色元素的取色器回显随主题缺省换挡 */
function toggleDark(): void {
  dark.value = !dark.value;
  document.documentElement.classList.toggle('dark', dark.value);
  modeler?.get<any>('bpmnRenderer').setTheme(RENDERER_THEMES[dark.value ? 'dark' : 'light']);
  syncColorInputs();
}

/** 按形态建实例：工具栏插件三形态通用装配（只读底座缺的编辑组由插件自行不建），
 * 编辑态另挂属性面板（parent 容器 + 面板模块）+ 调色板配置 */
function createInstance(formKind: 'edit' | 'navigated' | 'view'): Modeler {
  const base = {
    container: canvasHost.value!,
    // 工具栏对三形态都有意义（缩放/宿主动作在只读态保留），撤销重做/转置组编辑态独有
    additionalModules: [BpmnToolbarModule],
    bpmnToolbar: { actions: buildToolbarActions() },
    // 按当前主题给渲染缺省（实例重建后无需再 setTheme）
    bpmnRenderer: { ...RENDERER_THEMES[dark.value ? 'dark' : 'light'] }
  };
  if (formKind === 'edit') {
    return new Modeler({
      ...base,
      additionalModules: [...base.additionalModules, ...editorModules()],
      propertiesPanel: { parent: panelHost.value! },
      // 面板头部记法图标注入内核透出的 iconOfElement：画布/palette/面板三处同源
      bpmnElementIconRenderer: (element: any) => iconOfElement(element, 32, 'currentColor'),
      colorPicker: { colors: CUSTOM_COLOR_PICKER_COLORS }
    });
  }
  return formKind === 'navigated'
    ? new NavigatedViewer(base)
    : new Viewer(base);
}

function bindInstance(next: Modeler, formKind: 'edit' | 'navigated' | 'view'): void {
  modeler = next;
  (window as any).__modeler = next;
  commandStack = formKind === 'edit' ? next.get<any>('commandStack') : null;
  canvas = next.get<any>('canvas');
  bindSelectionEvents();
}

onMounted(async () => {
  bindInstance(createInstance('edit'), 'edit');
  document.addEventListener('keydown', onKeydown);
  // 初始流程模板由示例生成传入（动态 id），组件包不内置业务模板
  await modeler!.importXML(createInitialBpmn());
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('mousedown', onModeMenuDocDown);
  modeler?.destroy?.();
});

// ---------- 实例形态（标题栏菜单切换） ----------

// 实例形态（框架三种实例化模式：Modeler=编辑 / Viewer=纯预览 / NavigatedViewer=导航预览）。
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

/** 应用动作图标（自绘 48×48 viewBox/描边宽 4，与插件内置图标同语言；
 *  工具栏动作与形态菜单共用） */
const actionSvg = (paths: string): string =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter">${paths}</svg>`;

const ICON_IMPORT = actionSvg('<path d="M24 30V6M13 17 24 6l11 11" /><path d="M8 26v10a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V26" />');
const ICON_EXPORT = actionSvg('<path d="M24 6v24M13 19l11 11 11-11" /><path d="M8 26v10a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V26" />');
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
const ICON_CLEAR_COLOR = actionSvg('<path d="M24 6c6 8 12 13.5 12 21a12 12 0 1 1-24 0c0-7.5 6-13 12-21Z" /><path d="M10 38 38 10" />');

/** 形态菜单（编辑 / 预览 / 导航；工具栏不承载形态切换） */
const MODES = [
  { value: 'edit', label: '编辑模式', hint: 'Modeler：完整建模', svg: ICON_EDIT },
  { value: 'view', label: '预览模式', hint: 'Viewer：只读渲染', svg: ICON_VIEW },
  { value: 'navigated', label: '导航模式', hint: '只读，可缩放平移', svg: ICON_NAVIGATE }
] as const;
const currentModeLabel = computed(() => MODES.find((m) => m.value === form.value)!.label);
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

/** 取色器控件（render 一次性建 DOM；示例持 input 引用，选择变化时自回显） */
function colorControl(kind: 'fill' | 'stroke'): ToolbarActionSpec {
  return {
    id: `color-${kind}`,
    title: kind === 'fill' ? '选中元素填充色（空=主题缺省）' : '选中元素描边色（空=主题缺省）',
    group: 'colors',
    render: () => {
      const label = document.createElement('label');
      label.className = 'bpmn-toolbar-color';
      const input = document.createElement('input');
      input.type = 'color';
      input.value = kind === 'fill' ? fillColor.value : strokeColor.value;
      input.disabled = !colorTarget.value;
      input.addEventListener('change', () => {
        if (kind === 'fill') {
          fillColor.value = input.value;
        } else {
          strokeColor.value = input.value;
        }
        applyColors(kind);
      });
      if (kind === 'fill') {
        fillColorInput = input;
      } else {
        strokeColorInput = input;
      }
      const text = document.createElement('span');
      text.textContent = kind === 'fill' ? '填充' : '描边';
      label.append(input, text);
      return label;
    }
  };
}

/** 应用级动作集：文件 / 取色 / 显示（激活与可用态读 ref，refresh() 时机重估；
 *  实例形态在标题栏菜单，不入工具栏） */
function buildToolbarActions(): ToolbarActionSpec[] {
  return [
    { id: 'import', title: '导入 BPMN 文件', group: 'file', svg: ICON_IMPORT, onClick: pickFile, showInPreview: true },
    { id: 'export', title: '导出 BPMN 文件', group: 'file', svg: ICON_EXPORT, onClick: () => void exportBpmnFile(), showInPreview: true },
    colorControl('fill'),
    colorControl('stroke'),
    { id: 'clear-colors', title: '清除选中元素颜色', group: 'colors', svg: ICON_CLEAR_COLOR, onClick: clearColors, isEnabled: () => !!colorTarget.value },
    {
      id: 'dark',
      title: '切换暗色模式',
      group: 'display',
      svg: ICON_DARK,
      onClick: () => {
        toggleDark();
        refreshToolbar();
      },
      isActive: () => dark.value,
      showInPreview: true
    },
    {
      id: 'panel',
      title: '属性面板',
      group: 'display',
      svg: ICON_PANEL,
      onClick: () => {
        panelOpen.value = !panelOpen.value;
        refreshToolbar();
      },
      isActive: () => panelOpen.value,
      isEnabled: () => form.value === 'edit'
    }
  ];
}

/** 宿主状态变化后重估工具栏动作激活/可用态（实例重建外的状态迁移调这里） */
function refreshToolbar(): void {
  modeler?.get<any>('bpmnToolbar').refresh();
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
    event.shiftKey ? commandStack?.redo() : commandStack?.undo();
  } else if (mod && event.key === '0') {
    event.preventDefault();
    canvas?.zoom(1, 'center');
  } else if (mod && (event.key === '=' || event.key === '+')) {
    event.preventDefault();
    canvas?.zoom(canvas.zoom() * 1.2);
  } else if (mod && event.key === '-') {
    event.preventDefault();
    canvas?.zoom(canvas.zoom() / 1.2);
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

    <!-- 建模器画布宿主（卡片内容区·流程图侧）：常驻渲染，XML 视图由 XmlViewCard 的
         不透明内容区整体覆盖——display:none 会让导入时视口计算得 0 尺寸（SVGMatrix NaN）；
         属性面板可见时画布右缘让出面板列宽；XML 视图下藏画布内悬浮件（工具栏 z-90
         会戳出 XML 卡片覆盖层，palette 等低层件不受影响） -->
    <div
      ref="canvasHost"
      class="canvas-host"
      :class="{ 'canvas-host--with-panel': panelVisible, 'canvas-host--xml': view === 'xml' }"
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

/* 实例形态菜单（标题栏左区，与 XmlViewCard 标题栏同层叠放；皮肤随标题栏浅色铬件） */
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
  background: #fff;
  border: 1px solid #e2e5ea;
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

/* XML 视图：藏画布内高图层悬浮件（工具栏，插件 DOM 无 scoped 属性须 :deep），
   画布本体保持渲染（视口计算需要尺寸） */
.canvas-host--xml :deep(.bpmn-toolbar) {
  display: none;
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

/* 工具栏插件取色器控件（render() 宿主控件，皮肤归示例）：原生 color input 收敛小色块，
   走 --bio-* 令牌随宿主暗色热切换；标签恒单行 */
.canvas-host :deep(.bpmn-toolbar-color) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  height: 28px;
  font-size: 11px;
  white-space: nowrap;
  color: var(--bio-text-subtle);
  cursor: pointer;
}

.canvas-host :deep(.bpmn-toolbar-color input[type='color']) {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid var(--bio-border);
  border-radius: 3px;
  background: var(--bio-surface);
  cursor: pointer;
}

.canvas-host :deep(.bpmn-toolbar-color input[type='color']:disabled) {
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

/* 注入记法图标的白色内底（事件圆/任务盒 fill="#ffffff"）换为面板表面色——
   双色缩样在暗色下才可读（描边经 currentColor 已随图标令牌翻转） */
.dark .bio-properties-panel-header-type-icon svg [fill='#ffffff'] {
  fill: hsl(228, 6%, 13%);
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
