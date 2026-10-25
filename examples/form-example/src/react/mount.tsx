import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import ReactPanel from './ReactPanel';

let root: Root | null = null;

/**
 * 挂载/重建 React 渲染区。由 Vue 宿主组件 onMounted 调用——Vue 侧热更（HMR 重挂）
 * 会重建 #react-root 容器节点，此时旧 React root 已脱离文档，须卸载后在新容器重挂。
 */
export function mountReactPanel(el: HTMLElement): void {
  root?.unmount();
  root = createRoot(el);
  root.render(<ReactPanel />);
}
