# @kunpeng-io/bpmnlint-plugin-kunpeng-compat

[bpmnlint](https://github.com/bpmn-io/bpmnlint) 规则插件（CJS，65 规则 `rules/kunpeng/`）：按执行平台与版本（`camunda-cloud-1-0` … `camunda-cloud-8-10` 配置集）校验 BPMN 流程可执行性。kunpeng 线由 [@kunpeng-io/linting](../linting) 在构建期内联消费（浏览器端零解析链），也可独立用于 bpmnlint CLI（`.bpmnlintrc` 中 `extends: "plugin:@kunpeng-io/bpmnlint-plugin-kunpeng-compat/camunda-cloud-8-10"`）。

规则编写指南见 [docs/RULE_AUTHORING.md](./docs/RULE_AUTHORING.md)；规则语义测试在 `test/`（上游 vitest 链，本仓不随门禁运行）。

## 来源

Camunda `bpmnlint-plugin-camunda-compat`（MIT）改标迁移：scope 统一 `@kunpeng-io`，FEEL 分析依赖换绑仓内 `@kunpeng-io/expression-*` 家族包。

## License

MIT
