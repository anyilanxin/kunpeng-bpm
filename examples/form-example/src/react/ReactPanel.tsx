import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/locale/zh_CN';
import { FormEngine } from '@kunpeng-io/form-js';
import type { FormData, FormSchema, FormValidationResult } from '@kunpeng-io/form-js';
import { FormRenderer } from '@kunpeng-io/form-js-react';
import type { FormRendererHandle } from '@kunpeng-io/form-js-react';
import { demoSchema } from '../schema';

dayjs.locale('zh-cn');

const preStyle: CSSProperties = {
  background: '#f5f7fa',
  borderRadius: 6,
  padding: 12,
  fontSize: 12,
  lineHeight: 1.6,
  overflow: 'auto',
  maxHeight: 260,
  margin: 0
};

/** React 渲染区：与左侧 Vue 面板同 Schema、同交互（提交校验/重置），数据与校验结果就地展示 */
export default function ReactPanel({ schema = demoSchema }: { schema?: FormSchema }) {
  const [data, setData] = useState<FormData>(() => new FormEngine(schema).defaults());
  const [result, setResult] = useState<FormValidationResult | null>(null);
  const rendererRef = useRef<FormRendererHandle | null>(null);

  function onSubmit(): void {
    setResult(rendererRef.current?.validate() ?? null);
  }

  function onReset(): void {
    // result 不在此清空：onValidate 随数据派发（含重置后的默认数据），
    // 结果面板永远反映当前数据对应的校验——清空赋值会被下一次回调立即覆盖。
    setData(new FormEngine(schema).defaults());
    rendererRef.current?.reset();
  }

  return (
    <ConfigProvider locale={zhCN}>
      <FormRenderer
        ref={rendererRef}
        schema={schema}
        modelValue={data}
        onChange={setData}
        onValidate={setResult}
      />
      <footer style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button type="primary" onClick={onSubmit}>
          提交校验
        </Button>
        <Button onClick={onReset}>重置</Button>
      </footer>
      <div style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 13, margin: '0 0 6px' }}>表单数据</h4>
        <pre style={preStyle}>{JSON.stringify(data, null, 2)}</pre>
      </div>
      <div style={{ marginTop: 12 }}>
        <h4 style={{ fontSize: 13, margin: '0 0 6px' }}>校验结果</h4>
        <pre style={preStyle}>
          {result ? JSON.stringify({ valid: result.valid, issues: result.issues }, null, 2) : '—'}
        </pre>
      </div>
    </ConfigProvider>
  );
}
