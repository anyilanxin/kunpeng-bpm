<script setup lang="ts">
/**
 * 流程图 / XML 视图卡片组件（示例自有，不属于 @kunpeng-io/bpmn-js 组件包）：
 * - 卡片内容区整体切换：流程图视图 = 宿主画布（常驻渲染），XML 视图 = 本组件的不透明
 *   编辑区占满标题栏以下整个区域（非弹框、也非 display:none 隐藏画布——隐藏会让导入时
 *   视口计算得到 0 尺寸，SVGMatrix 出 NaN）
 * - 顶部常驻标题栏：右侧 = 流程图 | XML 分段切换 + 宿主注入区（bar 槽位，
 *   排切换器左侧——宿主应用级动作钮挂这里）；左侧仅出错时显示导入失败提示
 * - XML 编辑器 = CodeMirror 6（行号/换行/语法高亮，13px monospace）；
 *   暗色 = oneDark 主题（编辑区底 #282c34，dark prop 切换=重建编辑器）
 *   ——设置对齐 kunpeng-modeler 的 XML 视图
 * - 只消费 Modeler 公开 API（saveXML / importXML），编辑状态机（进入快照 /
 *   脏检查 / 应用失败回滚快照）全部在组件内
 * - 受控视图：v-model:view；暴露 loadText（XML 视图下导入文件载入编辑器）与
 *   getText（XML 视图下导出编辑器内容）给宿主
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Modeler } from '@kunpeng-io/bpmn-js';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';

const props = withDefaults(
  defineProps<{
    view: 'diagram' | 'xml';
    getModeler: () => Modeler | null;
    dark?: boolean;
  }>(),
  { dark: false }
);

const emit = defineEmits<{
  (event: 'update:view', view: 'diagram' | 'xml'): void;
}>();

const xmlText = ref('');
const xmlSnapshot = ref('');
const xmlError = ref('');
const editorHost = ref<HTMLDivElement>();

/** CodeMirror 实例（组件内单例；dark 切换时销毁重建） */
let cmView: EditorView | null = null;

const isDirty = computed(() => xmlText.value !== xmlSnapshot.value);

/** CM 基础扩展：行号/换行/XML 语法 + 版式（13px、等宽字体、撑满宿主） */
function baseExtensions() {
  return [
    lineNumbers(),
    xml(),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { fontSize: '13px', height: '100%' },
      '.cm-scroller': { overflow: 'auto', fontFamily: "'Fira Code', 'Courier New', monospace" }
    })
  ];
}

function initEditor(): void {
  if (!editorHost.value) {
    return;
  }
  cmView = new EditorView({
    state: EditorState.create({
      doc: xmlText.value,
      extensions: [
        ...baseExtensions(),
        ...(props.dark ? [oneDark] : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            xmlText.value = update.state.doc.toString();
          }
        })
      ]
    }),
    parent: editorHost.value
  });
}

function destroyEditor(): void {
  cmView?.destroy();
  cmView = null;
}

/** 用新内容替换编辑器全部文本（程序化装载：快照/导入文件/应用归一化） */
function replaceContent(text: string): void {
  if (!cmView || cmView.state.doc.toString() === text) {
    return;
  }
  cmView.dispatch({ changes: { from: 0, to: cmView.state.doc.length, insert: text } });
}

async function switchTo(next: 'diagram' | 'xml'): Promise<void> {
  if (next === props.view) {
    return;
  }
  const modeler = props.getModeler();
  if (!modeler) {
    return;
  }
  if (next === 'xml') {
    const { xml } = await modeler.saveXML();
    xmlText.value = xmlSnapshot.value = xml;
    replaceContent(xml);
    xmlError.value = '';
    emit('update:view', 'xml');
    return;
  }
  // 切回流程图：有未应用修改先导入，失败留在 XML 视图
  if (isDirty.value && !(await apply())) {
    return;
  }
  emit('update:view', 'diagram');
}

async function apply(): Promise<boolean> {
  const modeler = props.getModeler();
  if (!modeler) {
    return false;
  }
  try {
    await modeler.importXML(xmlText.value);
    // 以引擎序列化结果归一化（格式/属性顺序与导出一致）
    const { xml } = await modeler.saveXML();
    xmlText.value = xmlSnapshot.value = xml;
    replaceContent(xml);
    xmlError.value = '';
    return true;
  } catch (error) {
    xmlError.value = `导入失败：${error instanceof Error ? error.message : String(error)}`;
    // 画布可能被半成品导入污染，回滚到进入 XML 视图时的快照
    try {
      await modeler.importXML(xmlSnapshot.value);
    } catch {
      /* 快照本身即引擎产物，失败属异常路径，交由下一次操作暴露 */
    }
    return false;
  }
}

/** XML 视图下导入文件：载入编辑器（不直接改画布，切回流程图时自动应用） */
function loadText(text: string): void {
  xmlText.value = text;
  replaceContent(text);
  xmlError.value = '';
}

/** XML 视图下导出：取编辑器当前内容（含未应用修改） */
function getText(): string {
  return xmlText.value;
}

// 暗色切换：oneDark 是静态主题，销毁重建编辑器（内容经 xmlText 保留）
watch(
  () => props.dark,
  () => {
    destroyEditor();
    initEditor();
  }
);

onMounted(initEditor);
onBeforeUnmount(destroyEditor);

watch(
  () => props.view,
  (view) => {
    if (view === 'xml') {
      nextTick(() => cmView?.focus());
    }
  }
);

defineExpose({ loadText, getText });
</script>

<template>
  <div class="xml-dock">
    <!-- 卡片标题栏（顶部）：右区 = 宿主动作槽位 + 视图切换（最右），左侧仅出错时显示导入失败提示 -->
    <header class="xml-dock-bar">
      <span v-if="xmlError && view === 'xml'" class="dock-status is-error" :title="xmlError">✕ {{ xmlError }}</span>
      <div class="bar-right">
        <slot name="bar"></slot>
        <div class="ct-group ct-view" role="tablist" aria-label="视图切换">
          <button
            class="ct-view-btn"
            :class="{ active: view === 'diagram' }"
            role="tab"
            :aria-selected="view === 'diagram'"
            @click="switchTo('diagram')"
          >流程图</button>
          <button
            class="ct-view-btn"
            :class="{ active: view === 'xml' }"
            role="tab"
            :aria-selected="view === 'xml'"
            @click="switchTo('xml')"
          >XML</button>
        </div>
      </div>
    </header>

    <!-- 卡片内容区：XML 视图时编辑器占满标题栏以下整个区域（流程图视图由宿主画布
         占位）。v-show 保 CodeMirror 常驻——v-if 会随视图切换销毁重建编辑器 -->
    <section v-show="view === 'xml'" class="xml-dock-body" role="tabpanel" aria-label="BPMN XML 编辑">
      <div ref="editorHost" class="xml-editor-host" aria-label="BPMN XML 编辑器"></div>
    </section>
  </div>
</template>

<style scoped>
/* 顶部卡片：标题栏在上（左右两区），内容区在其下整体切换；
   流程图视图仅标题栏可交互（其余区域穿透给画布） */
.xml-dock {
  position: absolute;
  inset: 0;
  z-index: 25;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  font-size: 12px;
}

.xml-dock-bar {
  display: flex;
  align-items: center;
  height: 36px;
  /* 左区让位 App 级实例形态菜单（编辑/预览/导航），出错提示排其右侧 */
  padding: 0 12px 0 124px;
  background: var(--x-surface, #fff);
  border-bottom: 1px solid var(--x-border, #e2e5ea);
  box-shadow: 0 2px 8px rgba(15, 19, 30, 0.05);
  pointer-events: auto;
}

.bar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 亮色底随壳层令牌；暗色为 oneDark 编辑区底（下方全局段覆盖） */
.xml-dock-body {
  flex: 1;
  min-height: 0;
  display: flex;
  background: var(--x-surface, #fff);
  pointer-events: auto;
}

.xml-editor-host {
  flex: 1;
  min-width: 0;
}

.xml-editor-host :deep(.cm-editor) {
  height: 100%;
}

.xml-editor-host :deep(.cm-editor.cm-focused) {
  outline: none;
}

/* 分段切换器（title 位置）；.ct-group 基础样式在 app.css */
.ct-view {
  padding: 2px;
  background: #eef0f4;
  border-radius: 8px;
  gap: 0;
}

.ct-view-btn {
  border: none;
  border-radius: 6px;
  padding: 3px 12px;
  font-size: 12px;
  color: #57607a;
  background: none;
  cursor: pointer;
  transition: all 0.15s;
}

.ct-view-btn.active {
  background: #fff;
  color: #2c3345;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(28, 34, 46, 0.15);
}

/* 错误提示（仅导入失败时出现） */
.dock-status {
  color: #8a93a5;
  white-space: nowrap;
}

.dock-status.is-error {
  color: #c2413a;
  min-width: 0;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

<style>
/* 暗色：XML 编辑区底对齐 oneDark 主题（#282c34）——scoped 段够不到 html.dark
   祖先选择器，组件类名全局唯一，全局段安全 */
.dark .xml-dock-body {
  background: #282c34;
}
</style>
