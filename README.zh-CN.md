# 鲲鹏 BPM

[English](README.md) | 简体中文

[![Stars](https://img.shields.io/github/stars/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/stargazers)
[![Forks](https://img.shields.io/github/forks/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/network/members)
[![Contributors](https://img.shields.io/github/contributors/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/graphs/contributors)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/commits)
[![Release](https://img.shields.io/github/v/release/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/releases)
[![Issues](https://img.shields.io/github/issues/anyilanxin/kunpeng-bpm?style=flat-square&logo=github)](https://github.com/anyilanxin/kunpeng-bpm/issues)

Kunpeng BPM 是一套 Web 端 **BPMN 2.0** 流程建模工具链（**pnpm + turbo** monorepo，**Vite + TypeScript** 构建）：功能完整的流程建模器（事件、任务、网关、子流程、池与泳道、水平 / 垂直布局切换、连线与标注编辑、元素颜色、撤销重做、标准 BPMN 2.0 XML 往返与 SVG 导出），并配套属性面板、FEEL 表达式工具链与 Vue 3 集成示例。

**为什么选择 Kunpeng BPM？**

* 以 [BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2) 开放标准建模，标准 XML 导入导出
* ESM / CJS 双格式自包含产物 + 完整类型声明，Node 与打包器开箱即用
* 建模内核采用 GPL-2.0-with-Classpath-exception——任意许可证的独立模块均可自由链接调用
* 内置中文（zh-CN）界面，可注入任意语言字典
* 预览 / 编辑双模式、只读查看器、可插拔属性面板与元素颜色开箱即用
* 提供 Vue 3 集成示例，可快速嵌入业务系统

## 包一览

| 包 | 说明 | 协议 |
| --- | --- | --- |
| `@kunpeng-io/bpmn-js` | BPMN 2.0 建模器 / 查看器内核（TypeScript） | GPL-2.0-with-CE |
| `@kunpeng-io/kunpeng-bpmn-moddle` | kunpeng BPMN 扩展元模型 | MIT |
| `@kunpeng-io/bpmn-js-properties-panel` | BPMN 属性面板 | MIT |
| `@kunpeng-io/bpmn-js-element-templates` | 元素模板 | MIT |
| `@kunpeng-io/element-templates-json-schema` / `-validator` | 模板 JSON Schema 与校验 | MIT |
| `@kunpeng-io/extract-process-variables` | 流程变量提取 | MIT |
| `@kunpeng-io/bpmn-js-behaviors` / `@kunpeng-io/linting` | 行为扩展 / 校验集成 | MIT |
| `@kunpeng-io/properties-panel` | 通用属性面板基座 | MIT |
| `@kunpeng-io/expression-analyzer` / `-builtins` / `-editor` / `-lint` | 表达式解析 / 内建函数 / 编辑器 / 校验 | MIT |
| `@kunpeng-io/lang-expression` / `@kunpeng-io/lezer-expression` | 表达式语言支持与 Lezer 语法 | MIT |

## 快速开始

```bash
pnpm install
pnpm dev         # Vue 3 示例（http://localhost:5177）
pnpm build       # 构建组件包 + 示例
pnpm typecheck
pnpm smoke       # 产物 Node 冒烟
```

作为 npm 组件使用：

```ts
import { Modeler } from '@kunpeng-io/bpmn-js';
import 'diagram-js/assets/diagram-js.css';
import '@kunpeng-io/bpmn-js/styles';

const modeler = new Modeler({ container: '#canvas' });
await modeler.importXML(xml);
const { xml: out } = await modeler.saveXML();
```

三种实例化形态——编辑类服务按形态装配，程序化路径同样受限，不只是 UI 隐藏：

```ts
import { Modeler, NavigatedViewer, Viewer } from '@kunpeng-io/bpmn-js';

new Modeler({ container });          // 完整建模（palette / context pad / 撤销 / 直编…）
new NavigatedViewer({ container });  // 只读 + 画布导航
new Viewer({ container });           // 纯查看（渲染 + 导入导出 + 元素事件）
```

更多特性：

* **预览 / 编辑模式** —— 构造项 `mode: 'preview'` 或运行期 `modeler.setMode('preview')`，`mode.changed` 事件供宿主 UI 联动
* **元素颜色** —— `modeling.setColor(element, { fill?, stroke? })`，存 DI 属性 `bioc:fill` / `bioc:stroke` 随 XML 往返
* **水平 / 垂直布局** —— 单命令全模型水平垂直切换，XML 往返稳定
* **扩展命名空间** —— kunpeng 扩展内置；其他业务命名空间经 `moddleExtensions` 注入，往返无损
* **属性面板** —— `@kunpeng-io/bpmn-js-properties-panel` 模块即插即用（接线方式见[示例](/examples/bpmn-example)）
* **模型工具函数** —— 公开导出 `is` / `isAny` / `getBusinessObject` / `getLabel` / `setLabel` 等，供插件与宿主使用

## 相关链接

* [用户指南](./docs/user-guide/README.zh-CN.md) —— 使用与扩展指南（后续主题统一落此目录）
* [接入示例](/examples/bpmn-example) —— Vue 3 集成（工具栏、属性面板、颜色、导入导出）
* 组件源码 —— [`packages/bpmn/bpmn-js`](/packages/bpmn/bpmn-js)
* [更新日志](./CHANGELOG.zh-CN.md)

## Star 趋势

[![Star History Chart](https://api.star-history.com/svg?repos=anyilanxin/kunpeng-bpm&type=Date)](https://star-history.com/#anyilanxin/kunpeng-bpm&Date)

## 许可证

**默认许可：MIT**——除明确声明的例外包外，仓库内全部代码与文件均按 MIT 授权。**例外包**：建模器内核——`@kunpeng-io/bpmn-js`——采用 **GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0**（修改 / 扩充核心库再分发须整体以 GPL 开源并提供源码；任意许可证的独立模块链接 / 调用核心库不产生许可传染）。根 [LICENSE](/LICENSE) 声明协议归属，根 [NOTICE](/NOTICE) 承载版权归属，各协议完整文本存放在 [`licenses/`](/licenses)。

### 1. 使用许可

1. [MIT](./licenses/MIT.txt) —— 默认协议；除建模器内核外的全部包（含 `@kunpeng-io/kunpeng-bpmn-moddle`）
2. [GPL-2.0](./licenses/GPL-2.0.txt) WITH [CLASSPATH-EXCEPTION-2.0](./licenses/CLASSPATH-EXCEPTION-2.0.txt) —— 唯一例外包 `packages/bpmn/bpmn-js`

### 2. 许可声明

1. 各包许可由本项目指定。核心源文件携带长式许可文件头（版权声明 + `SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0` 标识行 + 逐文件指定受 LICENSE 所附 "Classpath" exception 约束）；许可与合规咨询请通过下方第 3 节的反馈通道联系
2. 有特有协议处理的模块自带组合：建模器内核随包分发自有 `LICENSE` + `NOTICE` + `licenses/` 目录（GPL 与 Classpath 例外协议全文）；每个 npm 包都带自己的 `LICENSE`，保证协议文本随分发包同行
3. 请勿改动版权头：文件中保留的第三方版权与归属声明必须原样保留
4. 无头文件（markdown / json / 资源）默认为 MIT

### 3. 合规反馈与监督

本仓库引入并改造了多个第三方开源项目。我们尽力遵守每一个第三方许可，但多许可组合复杂，仍可能存在非故意违规（如遗漏归属或许可指定不当）。

如发现许可违规、版权归属错误或其他合规问题，欢迎反馈：

1. 提交 [GitHub Issue](https://github.com/anyilanxin/kunpeng-bpm/issues/new)
2. 邮件 anyilanxin@aliyun.com

我们承诺及时核实每一份反馈，一经确认，将在合理期限内修复（补充归属、更正许可指定或移除相关代码），并在 Issue 中公布处理结果。

### 4. 免责声明

1. 本软件按"原样"提供，不附带任何明示或默示的担保，包括但不限于适销性、特定用途适用性和不侵权的担保。
2. 在任何情况下，作者或版权持有人均不对因使用或无法使用本软件而产生的任何索赔、损害或其他责任（无论是合同之诉、侵权之诉还是其他诉由）承担责任。
3. 本软件仅供合法的流程建模用途；用户部署、再分发时应自行确保遵守适用的法律法规。
