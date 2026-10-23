[English](CHANGELOG.md) | 简体中文

# 更新日志

本文件记录项目的所有显著变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/)，条目与仓库提交约定一致（`feat` / `fix` / `refactor` / `perf`）。

## [Unreleased]

## [0.1.0] - 2026-10-23

首个发布版本：Web 端 BPMN 2.0 建模工具链——功能完整的流程建模器，配套元模型扩展、属性面板、FEEL 表达式工具链与 Vue 3 集成示例，以 pnpm + turbo monorepo 管理。

### 新增

**建模器内核**

- BPMN 2.0 建模器 / 查看器内核（`@kunpeng-io/bpmn-js`）：事件、任务、网关、子流程、池与泳道、连线与标注
- 三种实例化形态——`Modeler`（完整建模）、`NavigatedViewer`（只读 + 画布导航）、`Viewer`（纯查看）；编辑类服务按形态装配，程序化路径同样受限，不只是 UI 隐藏
- 预览 / 编辑双模式——构造项 `mode: 'preview'` 或运行期 `modeler.setMode('preview')`，`mode.changed` 事件供宿主 UI 联动
- 元素颜色——`modeling.setColor`，存 DI 属性 `bioc:fill` / `bioc:stroke` 随 XML 往返
- 水平 / 垂直布局——单命令全模型水平垂直切换，XML 往返稳定
- 撤销重做、连线与标注编辑、标准 BPMN 2.0 XML 导入导出往返、SVG 导出
- 内置中文（zh-CN）界面；可注入任意语言字典
- 模型工具函数公开导出——`is` / `isAny` / `getBusinessObject` / `getLabel` / `setLabel` 等
- ESM / CJS 双格式自包含产物 + 完整类型声明，Node 与打包器开箱即用

**元模型与命名空间**

- kunpeng BPMN 扩展元模型内置（`@kunpeng-io/kunpeng-bpmn-moddle`）；其他业务命名空间经 `moddleExtensions` 注入，往返无损
- BPMN 语义模型扩展（`@kunpeng-io/bpmn-moddle`）

**属性面板与模板**

- BPMN 属性面板（`@kunpeng-io/bpmn-js-properties-panel`），基于通用属性面板基座（`@kunpeng-io/properties-panel`）
- 元素模板（`@kunpeng-io/bpmn-js-element-templates`），配套 JSON Schema 与校验包（`@kunpeng-io/element-templates-json-schema`、`@kunpeng-io/element-templates-validator`）
- 流程变量提取（`@kunpeng-io/extract-process-variables`）
- 行为扩展与校验集成（`@kunpeng-io/bpmn-js-behaviors`、`@kunpeng-io/linting`）

**表达式工具链**

- FEEL 表达式工具链：解析 / 内建函数 / 编辑器 / 校验（`@kunpeng-io/expression-analyzer`、`-builtins`、`-editor`、`-lint`）
- 表达式语言支持与 Lezer 语法（`@kunpeng-io/lang-expression`、`@kunpeng-io/lezer-expression`）

**示例与仓库**

- Vue 3 集成示例——工具栏、属性面板、元素颜色、导入导出
- pnpm + turbo monorepo（workspace `packages/*/*` + `examples/*`）、Vite 组件库构建、TypeScript 类型检查、产物 Node 冒烟（`pnpm smoke`）
- 双语 `docs/user-guide/` 指南索引目录预留（后续指南按 `topic.md` / `topic.zh-CN.md` 成对落地；写法为简要文字说明 + 指引阅读完整文件 / 目录）
- 双许可体系：建模器内核（`@kunpeng-io/bpmn-js`）GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0，其余包（含 `@kunpeng-io/kunpeng-bpmn-moddle`）全部 MIT
- 协议文件布局：根 `LICENSE` 简短声明 + `NOTICE` 版权归属 + `licenses/` 集中存放协议全文；建模器内核随包分发自有 `LICENSE` + `NOTICE` + `licenses/` 组合，各 npm 包随包分发自己的 `LICENSE`
