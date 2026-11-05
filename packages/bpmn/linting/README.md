# @kunpeng-io/linting

BPMN 校验（linting）家族包：XML 字符串驱动的 Linter 核心 + 画布 linting 集成模块。规则来自 [@kunpeng-io/bpmnlint-plugin-kunpeng-compat](../bpmnlint-plugin-kunpeng-compat)（65 规则，按平台版本分配置集）。

## 使用

### 画布集成（推荐入口）

```ts
import LintingModelerModule from '@kunpeng-io/linting/modeler';
import '@kunpeng-io/linting/assets/linting.css';

const modeler = new Modeler({
  container,
  additionalModules: [ BpmnToolbarModule, LintingModelerModule ]
});
```

装配后：

- 提供 `linting` 服务（`activate()` / `deactivate()` / `isActive()` / `lint()`），激活态下命令栈变化自动重校验；
- 画布元素渲染问题标注（`.djs-overlay-linting`，点击跳转属性面板对应条目），属性面板联动错误提示；
- 工具栏插件 `@kunpeng-io/bpmn-js-toolbar` 非严格探测 `linting` 服务，**装上本模块即自动出现「开启校验」钮**（不装则零变化，无需任何配置）。

### 纯校验（无画布）

```ts
import { Linter } from '@kunpeng-io/linting';

const linter = new Linter(); // 可透传 defaultExecutionPlatform/Version
const reports = await linter.lint(xmlString);
```

## 平台判定

文档携带 `modeler:executionPlatform` 标记（老线 XML，`xmlns:modeler="http://anyilanxin.com/schema/modeler/1.0"`）时按标记平台取规则集；**未携带（新内核文档）回退缺省平台 `Kunpeng Cloud` / `8.3.0`**——任何文档开箱即可校验。

## 构建

`pnpm --filter @kunpeng-io/linting build`：vite lib 双入口（`index` = Linter 核心 / `modeler` = 画布集成模块）全量内联自包含 ESM dist——CJS 规则包在构建期经 rollup commonjs 互操作打进，消费端零解析链；手写类型声明在 `types/`，随构建拷入 `dist/`。

## 来源

Camunda `@camunda/linting`（MIT）改标迁移：scope 统一 `@kunpeng-io`、规则包换绑 kunpeng-compat、modeler 集成层适配自研内核（`bpmnjs` 约定服务、非严格注入探测、隐式根守卫）。

## License

MIT
