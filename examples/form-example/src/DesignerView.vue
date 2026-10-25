<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { ElButton } from 'element-plus';
import { FormDesigner } from '@kunpeng-io/form-js-designer';
import type { FormSchema } from '@kunpeng-io/form-js';
import { demoSchema } from './schema';

/** 设计器视图：拖拽搭建 + 实时 Schema 产出（JSON 直读，完整导入导出 UI 属 D4） */
// shallowRef：Schema 是纯 JSON 大对象且整体替换——深代理无谓且 DesignerModel 的
// structuredClone 输入遇 Proxy 直接炸（协议数据勿入深层响应式，同画布元素契约）
const schema = shallowRef<FormSchema>();
const designerKey = ref(0);

function importDemo(): void {
  // 以 demoSchema 为初始导入重建设计器（编辑已有表单）
  schema.value = JSON.parse(JSON.stringify(demoSchema)) as FormSchema;
  designerKey.value += 1;
}
</script>

<template>
  <div class="designer-view">
    <div class="designer-bar">
      <ElButton size="small" @click="importDemo">导入演示 Schema</ElButton>
      <span class="hint">左栏拖出字段 · 画布拖拽排序 · 选中编辑属性（属性编辑器随 D3 接入）</span>
    </div>
    <FormDesigner :key="designerKey" v-model:schema="schema" />
    <div class="designer-dump">
      <h3>设计产出 Schema</h3>
      <pre>{{ schema ? JSON.stringify(schema, null, 2) : '—' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.designer-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.designer-bar .hint {
  color: #999;
  font-size: 12px;
}

.designer-dump {
  margin-top: 16px;
}

.designer-dump h3 {
  font-size: 14px;
  margin: 0 0 8px;
}

.designer-dump pre {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  overflow: auto;
  max-height: 360px;
}
</style>
