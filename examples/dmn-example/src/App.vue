<template>
  <div class="example-shell" :class="{ dark }">
    <div class="example-header">
      <h1>@kunpeng-io/dmn-js · DRD 决策需求图</h1>
      <div class="mode-menu">
        <button v-for="m in MODES" :key="m.id" :class="{ active: mode === m.id }" @click="switchMode(m.id)">{{ m.label }}</button>
      </div>
      <div class="header-actions">
        <label class="action-like">
          导入 XML
          <input ref="fileInput" type="file" accept=".xml,.dmn" hidden @change="importFile" />
        </label>
        <button @click="exportXml">导出 XML</button>
        <button @click="runRoundTrip">字节级往返自检</button>
        <button :class="{ active: panelOpen }" @click="panelOpen = !panelOpen">面板</button>
        <button :class="{ active: view === 'xml' }" @click="toggleView">{{ view === 'drd' ? 'XML 视图' : 'DRD 视图' }}</button>
        <button :class="{ active: dark }" @click="toggleDark">暗色</button>
      </div>
    </div>
    <div class="example-header example-subheader">
      <span class="example-status" :class="status.kind">{{ status.text }}</span>
    </div>
    <div class="example-body">
      <div v-show="view === 'drd'" ref="host" class="canvas-host"></div>
      <pre v-if="view === 'xml'" class="xml-view">{{ xmlText }}</pre>
      <div v-show="panelOpen && view === 'drd'" ref="panelHost" class="properties-host"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, shallowRef } from 'vue';
import { Modeler } from '@kunpeng-io/dmn-js';
import type { ModelerMode } from '@kunpeng-io/dmn-js';
import { sampleDmn } from './dmn-template';

const MODES: { id: ModelerMode; label: string }[] = [
  { id: 'edit', label: '编辑' },
  { id: 'preview', label: '预览' }
];

const host = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
// 画布元素对象不入 Vue 深层响应式（bpmn 线契约：代理会冻结 children 属性）
const modeler = shallowRef<Modeler | null>(null);
const status = ref<{ kind: '' | 'ok' | 'fail'; text: string }>({ kind: '', text: '骨架空图（U2-G1：fork bpmn 内核）' });
const mode = ref<ModelerMode>('edit');
const view = ref<'drd' | 'xml'>('drd');
const xmlText = ref('');
const dark = ref(false);
const panelOpen = ref(false);

/** 渲染缺省主题（不落 XML：仅缺省渲染色——setTheme 为合并语义，两向都给全量值） */
const RENDERER_THEMES = {
  light: { defaultStrokeColor: '#000000', defaultFillColor: '#ffffff', labelColor: '#000000' },
  dark: { defaultStrokeColor: '#d6d6da', defaultFillColor: '#26262a', labelColor: '#d6d6da' }
} as const;

/** 暗色切换（标题栏钮）三合一：宿主壳层令牌（example-shell.dark）+ html.dark
 * 作用域（内核 --dmn- 与 --bio- 令牌）+ dmnRenderer.setTheme（画布元素填充/描边/文字热切换） */
function toggleDark(): void {
  dark.value = !dark.value;
  document.documentElement.classList.toggle('dark', dark.value);
  modeler.value?.get<any>('dmnRenderer').setTheme(RENDERER_THEMES[dark.value ? 'dark' : 'light']);
}

onMounted(async () => {
  const instance = new Modeler({
    container: host.value!,
    // 按当前主题给渲染缺省（实例重建后无需再 setTheme）
    dmnRenderer: { ...RENDERER_THEMES[dark.value ? 'dark' : 'light'] }
  });
  modeler.value = instance;
  // 浏览器验收钩子（真实 UI 路径之外的程序化探针入口）
  (window as any).__dmn = instance;
  try {
    const { warnings } = await instance.importXML(sampleDmn);
    status.value = { kind: warnings.length ? 'fail' : 'ok', text: warnings.length ? `导入告警 ${warnings.length} 条` : '样例导入成功（U2 域层）' };
  } catch (error) {
    status.value = { kind: 'fail', text: `导入失败：${(error as Error).message}` };
  }
});

function switchMode(next: ModelerMode) {
  if (mode.value === next) return;
  mode.value = next;
  modeler.value!.setMode(next);
}

async function toggleView() {
  if (view.value === 'drd') {
    xmlText.value = (await modeler.value!.saveXML()).xml;
    view.value = 'xml';
  } else {
    view.value = 'drd';
    await nextTick();
    // 画布在 display:none 下尺寸为 0，恢复显示后重适配视口
    modeler.value!.get<any>('canvas').zoom('fit-viewport');
  }
}

async function importFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const xml = await file.text();
    await modeler.value!.importXML(xml);
    status.value = { kind: 'ok', text: `已导入 ${file.name}（${xml.length} 字符）` };
  } catch (error) {
    status.value = { kind: 'fail', text: `导入失败：${(error as Error).message}` };
  } finally {
    fileInput.value!.value = '';
  }
}

async function exportXml() {
  const { xml } = await modeler.value!.saveXML();
  status.value = { kind: 'ok', text: `已导出（${xml.length} 字符，控制台可见）` };
  console.log(xml);
}

/** saveXML→importXML→saveXML 字节级稳定自检（第二循环起比较） */
async function runRoundTrip() {
  const m = modeler.value!;
  try {
    const first = (await m.saveXML()).xml;
    await m.importXML(first);
    const second = (await m.saveXML()).xml;
    await m.importXML(second);
    const third = (await m.saveXML()).xml;
    if (second === third) {
      status.value = { kind: 'ok', text: `往返字节级稳定 ✓（${third.length} 字符）` };
    } else {
      status.value = { kind: 'fail', text: '往返不稳定：第三轮与第二轮输出不一致（差异详见控制台）' };
      console.error('round-trip mismatch:\n[second]\n' + second + '\n[third]\n' + third);
    }
  } catch (error) {
    status.value = { kind: 'fail', text: `往返失败：${(error as Error).message}` };
    throw error;
  }
}
</script>

<style scoped>
.example-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  color: #1f2328;
  background: #ffffff;
}

.example-shell.dark {
  color: #e6e6e6;
  background: #1e1e1e;
}

.example-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #d4d4d4;
}

.example-shell.dark .example-header {
  border-bottom-color: #3c3c3c;
}

.example-subheader {
  padding: 4px 12px;
  min-height: 16px;
}

.view-tabs {
  display: flex;
  gap: 4px;
  padding: 4px 12px;
  border-bottom: 1px solid #d4d4d4;
  background: #fafbfc;
}

.example-shell.dark .view-tabs {
  border-bottom-color: #3c3c3c;
  background: #252526;
}

.view-tabs button {
  font-size: 12px;
  padding: 3px 12px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
}

.example-header h1 {
  font-size: 14px;
  margin: 0 12px 0 0;
  white-space: nowrap;
}

.mode-menu {
  display: flex;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  overflow: hidden;
}

.example-shell.dark .mode-menu {
  border-color: #3c3c3c;
}

.header-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

button,
.action-like {
  font-size: 12px;
  padding: 4px 10px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.example-shell.dark button,
.example-shell.dark .action-like {
  border-color: #3c3c3c;
}

button.active,
.action-like.active {
  background: #0969da;
  border-color: #0969da;
  color: #ffffff;
}

.example-status {
  font-size: 12px;
}

.example-status.ok {
  color: #1a7f37;
}

.example-status.fail {
  color: #cf222e;
}

.example-shell.dark .example-status.ok {
  color: #3fb950;
}

.example-shell.dark .example-status.fail {
  color: #f85149;
}

.example-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.canvas-host {
  flex: 1;
  min-width: 0;
  position: relative;
}

/* diagram-js 不设定容器尺寸，须由宿主撑满（bpmn-example 同款宿主职责） */
.canvas-host :deep(.djs-container) {
  width: 100%;
  height: 100%;
}

.xml-view {
  flex: 1;
  margin: 0;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  font-family: ui-monospace, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.properties-host {
  width: 300px;
  flex-shrink: 0;
  overflow-y: auto;
  border-left: 1px solid #d4d4d4;
}

.example-shell.dark .properties-host {
  border-left-color: #3c3c3c;
}

/* 暗色下 diagram-js 通用 UI 令牌（palette/pad/弹框/直编的 --bio-* 体系：
   容器由 Canvas 自动挂 .bio-theme-parent，:deep 穿透 scoped 命中其变量声明；
   画布底色 --canvas-fill-color 引用 --bio-surface 随动。dmn 专属面
   --dmn-* 令牌集由内核 dmn-js.css 自带 .dark 段承担） */
.example-shell.dark :deep(.djs-container) {
  --bio-surface: #26262a;
  --bio-surface-overlay: #2e2e33;
  --bio-surface-subtle: #2a2a2f;
  --bio-surface-medium: #333338;
  --bio-surface-inverted: #d6d6da;
  --bio-surface-inverted-subtle: #a8a8b2;
  --bio-text: #d6d6da;
  --bio-text-subtle: #a8a8b2;
  --bio-text-subtlest: #7f7f88;
  --bio-text-on-inverted: #1f1f23;
  --bio-border: #4a4a52;
  --bio-border-disabled: #3d3d44;
  --bio-primary: #4d8fff;
  --bio-primary-surface: rgb(77 143 255 / 15%);
  --bio-danger: #ff7a7a;
  --bio-danger-surface-subtle: rgb(255 122 122 / 12%);
  --bio-selected-surface: #333338;
  --bio-selected-text: #d6d6da;
  --bio-focus: #4d8fff;
  --bio-focus-surface: rgb(77 143 255 / 20%);
  --bio-canvas-accent: #4d8fff;
  --bio-canvas-accent-subtle: #74a7ff;
  --bio-shadow: rgb(0 0 0 / 50%);
  --bio-shadow-subtle: rgb(0 0 0 / 30%);
}
</style>
