<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { FormEngine, FormRenderer } from '@kunpeng-io/form-js-vue';
import type { FormValidationResult } from '@kunpeng-io/form-js-vue';
import { mountReactPanel } from './react/mount';
import { demoSchema } from './schema';

const schema = demoSchema;
const data = ref(new FormEngine(schema).defaults());
const result = ref<FormValidationResult | null>(null);
const renderer = ref<InstanceType<typeof FormRenderer>>();

function onSubmit(): void {
  result.value = renderer.value?.validate() ?? null;
}

function onReset(): void {
  // result 不在此清空：FormRenderer 的 validate 事件随数据派发（含重置后的默认数据），
  // 结果面板永远反映当前数据对应的校验——清空赋值会被下一次事件立即覆盖。
  data.value = new FormEngine(schema).defaults();
  renderer.value?.reset();
}

// React 渲染区在 Vue 挂载后挂进 #react-root（Vue 热更重挂时幂等重建）
onMounted(() => {
  const el = document.getElementById('react-root');
  if (el) {
    mountReactPanel(el);
  }
});
</script>

<template>
  <main class="page">
    <header class="page-header">
      <h1>form-js 动态表单示例</h1>
      <p>同一 Schema · 多框架渲染：Vue（element-plus）/ React（antd）</p>
    </header>
    <div class="columns">
      <section class="panel">
        <h2>Vue 渲染器</h2>
        <FormRenderer ref="renderer" v-model="data" :schema="schema" @validate="(r) => (result = r)" />
        <footer class="actions">
          <el-button type="primary" @click="onSubmit">提交校验</el-button>
          <el-button @click="onReset">重置</el-button>
        </footer>
      </section>
      <section class="panel">
        <h2>React 渲染器</h2>
        <div id="react-root" class="react-root"></div>
      </section>
    </div>
    <section class="dump">
      <div>
        <h3>表单数据</h3>
        <pre>{{ JSON.stringify(data, null, 2) }}</pre>
      </div>
      <div>
        <h3>校验结果</h3>
        <pre>{{ result ? JSON.stringify({ valid: result.valid, issues: result.issues }, null, 2) : '—' }}</pre>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
}

.page-header h1 {
  margin: 0 0 4px;
  font-size: 20px;
}

.page-header p {
  margin: 0 0 16px;
  color: #888;
  font-size: 13px;
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

.panel {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
}

.panel h2 {
  margin: 0 0 12px;
  font-size: 15px;
  color: #409eff;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.dump {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 24px;
}

.dump h3 {
  font-size: 14px;
  margin: 0 0 8px;
}

.dump pre {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  overflow: auto;
  max-height: 420px;
}
</style>
