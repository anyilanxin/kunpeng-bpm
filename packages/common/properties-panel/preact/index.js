/**
 * preact 薄转发（方案 C，2026-10-28）：包内不再 vendored 拷贝 preact——
 * 子路径只做一行转发，指向本包 dependencies 里的同一份 npm preact。
 * 家族面板包与宿主自定义条目经 '@kunpeng-io/properties-panel/preact'
 * 导入，恒定同实例（升级经 pnpm catalog 钉精确版本单点落位）。
 */
export * from 'preact';
