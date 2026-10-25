<script setup lang="ts">
/**
 * 流程图 / XML 视图卡片组件（示例自有，不属于 @kunpeng-io/bpmn-js 组件包）：
 * - 卡片内容区整体切换：流程图视图 = 宿主画布（常驻渲染），XML 视图 = 本组件的不透明
 *   编辑区占满标题栏以下整个区域（非弹框、也非 display:none 隐藏画布——隐藏会让导入时
 *   视口计算得到 0 尺寸，SVGMatrix 出 NaN）
 * - 顶部常驻标题栏：右侧 = 流程图 | XML 分段切换（唯一常驻项）；左侧仅出错时显示
 *   导入失败提示。编辑没有独立按钮：切回流程图时自动应用，失败留在 XML 视图
 * - 只消费 Modeler 公开 API（saveXML / importXML），编辑状态机（进入快照 / 脏检查 /
 *   应用失败回滚快照）全部在组件内
 * - 受控视图：v-model:view；暴露 loadText（XML 视图下导入文件载入编辑器）与
 *   getText（XML 视图下导出编辑器内容）给宿主
 */
import { computed, nextTick, ref, watch } from 'vue';
import type { Modeler } from '@kunpeng-io/bpmn-js';

const props = defineProps<{
  view: 'diagram' | 'xml';
  getModeler: () => Modeler | null;
}>();

const emit = defineEmits<{
  (event: 'update:view', view: 'diagram' | 'xml'): void;
}>();

const xmlText = ref('');
const xmlSnapshot = ref('');
const xmlError = ref('');
const editor = ref<HTMLTextAreaElement>();

const isDirty = computed(() => xmlText.value !== xmlSnapshot.value);

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
  xmlError.value = '';
}

/** XML 视图下导出：取编辑器当前内容（含未应用修改） */
function getText(): string {
  return xmlText.value;
}

watch(
  () => props.view,
  (view) => {
    if (view === 'xml') {
      nextTick(() => editor.value?.focus());
    }
  }
);

defineExpose({ loadText, getText });
</script>

<template>
  <div class="xml-dock">
    <!-- 卡片标题栏（顶部）：右区视图切换（最右），左侧仅出错时显示导入失败提示 -->
    <header class="xml-dock-bar">
      <span v-if="xmlError && view === 'xml'" class="dock-status is-error" :title="xmlError">✕ {{ xmlError }}</span>
      <div class="bar-right">
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

    <!-- 卡片内容区：XML 视图时编辑器占满标题栏以下整个区域（流程图视图由宿主画布占位） -->
    <section v-if="view === 'xml'" class="xml-dock-body" role="tabpanel" aria-label="BPMN XML 编辑">
      <textarea
        ref="editor"
        v-model="xmlText"
        class="xml-editor"
        spellcheck="false"
        wrap="off"
        aria-label="BPMN XML 编辑器"
      ></textarea>
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
  background: #fff;
  border-bottom: 1px solid #e2e5ea;
  box-shadow: 0 2px 8px rgba(15, 19, 30, 0.05);
  pointer-events: auto;
}

.bar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.xml-dock-body {
  flex: 1;
  min-height: 0;
  display: flex;
  background: #fff;
  pointer-events: auto;
}

.xml-editor {
  flex: 1;
  width: 100%;
  border: none;
  padding: 10px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #2c3345;
  resize: none;
  outline: none;
  white-space: pre;
  overflow: auto;
  tab-size: 2;
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
