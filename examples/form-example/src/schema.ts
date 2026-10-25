import type { FormSchema } from '@kunpeng-io/form-js';

/**
 * 演示表单定义（请假申请）：覆盖全部 8 类字段 + 分组 + 显隐/禁用联动 + 规则。
 * 与 smoke / React 区共用同一形状——双框架一致性验收的数据源。
 */
export const demoSchema: FormSchema = {
  schemaVersion: 1,
  id: 'leave-apply',
  name: '请假申请',
  description: '演示 form-js 统一设计协议在 Vue / React 双渲染器下的一致表现',
  fields: [
    {
      id: 'leaveType',
      type: 'radio',
      label: '请假类型',
      required: true,
      description: '年假需填写天数与代理人',
      props: {
        options: [
          { label: '年假', value: 'annual' },
          { label: '病假', value: 'sick' },
          { label: '事假', value: 'personal' }
        ]
      }
    },
    {
      id: 'reason',
      type: 'textarea',
      label: '事由',
      required: true,
      props: { rows: 3, maxLength: 200, placeholder: '请简要说明请假事由' },
      rules: [{ kind: 'minLength', value: 5, message: '事由至少 5 个字' }]
    },
    {
      id: 'days',
      type: 'number',
      label: '天数',
      required: true,
      props: { min: 0.5, max: 30, step: 0.5 },
      visibleWhen: { field: 'leaveType', op: 'eq', value: 'annual' }
    },
    {
      id: 'startDate',
      type: 'date',
      label: '开始日期',
      required: true,
      rules: [{ kind: 'min', value: '2026-01-01', message: '不能早于 2026 年' }]
    },
    {
      id: 'handoverTo',
      type: 'select',
      label: '工作交接人',
      props: {
        options: [
          { label: '张三', value: 'zhangsan' },
          { label: '李四', value: 'lisi' },
          { label: '王五', value: 'wangwu' }
        ],
        placeholder: '请选择交接人',
        clearable: true
      },
      disabledWhen: { field: 'days', op: 'empty' }
    },
    {
      id: 'sickProof',
      type: 'checkbox',
      label: '病假材料',
      visibleWhen: { field: 'leaveType', op: 'eq', value: 'sick' },
      props: {
        options: [
          { label: '诊断证明', value: 'diagnosis' },
          { label: '病假条', value: 'note' },
          { label: '缴费单据', value: 'receipt' }
        ]
      }
    },
    {
      id: 'contact',
      type: 'text',
      label: '紧急联系方式',
      rules: [{ kind: 'pattern', value: '^1\\d{10}$', message: '请填写 11 位手机号' }],
      props: { placeholder: '选填', clearable: true }
    },
    {
      id: 'extra',
      type: 'group',
      label: '补充设置',
      children: [
        { id: 'notify', type: 'switch', label: '邮件通知审批人', defaultValue: false },
        {
          id: 'ccMe',
          type: 'switch',
          label: '抄送自己',
          visibleWhen: { field: 'notify', op: 'eq', value: true }
        }
      ]
    }
  ]
};
