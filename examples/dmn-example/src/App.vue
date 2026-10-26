<template>
  <div class="example-shell">
    <div class="example-header">
      <h1>@kunpeng-io/dmn-js · DRD 决策需求图</h1>
      <button @click="reload">重新导入样例</button>
      <button @click="exportXml">导出 XML</button>
      <button @click="runRoundTrip">字节级往返自检</button>
      <span class="example-status" :class="status.kind">{{ status.text }}</span>
    </div>
    <div ref="host" class="canvas-host"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import { Modeler } from '@kunpeng-io/dmn-js';
import { sampleDmn } from './dmn-template';

const host = ref<HTMLElement | null>(null);
// 画布元素对象不入 Vue 深层响应式（bpmn 线契约：代理会冻结 children 属性）
const modeler = shallowRef<Modeler | null>(null);
const status = ref<{ kind: '' | 'ok' | 'fail'; text: string }>({ kind: '', text: '未运行' });

onMounted(async () => {
  const instance = new Modeler({ container: host.value! });
  modeler.value = instance;
  // 浏览器验收钩子（真实 UI 路径之外的程序化探针入口）
  (window as any).__dmn = instance;
  await reload();
});

async function reload() {
  const { warnings } = await modeler.value!.importXML(sampleDmn);
  status.value = { kind: warnings.length ? 'fail' : 'ok', text: warnings.length ? `导入告警 ${warnings.length} 条` : '样例导入成功' };
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
    await m.importXML(sampleDmn);
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
