import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { FormSchema } from '@kunpeng-io/form-js';
import ReactPanel from './ReactPanel';

let root: Root | null = null;

/**
 * 挂载/重建 React 渲染区。由 Vue 宿主组件 onMounted 调用——Vue 侧热更（HMR 重挂）
 * 会重建 #react-root 容器节点，此时旧 React root 已脱离文档，须卸载后在新容器重挂。
 * schema 由宿主注入（渲染对照的 Schema 源可切换）；变更即整体重建（React 区无跨
 * Schema 保留数据的需求——字段集合已变，旧数据无意义）。
 */
export function mountReactPanel(el: HTMLElement, schema?: FormSchema): void {
  root?.unmount();
  root = createRoot(el);
  root.render(<ReactPanel schema={schema} />);
}
