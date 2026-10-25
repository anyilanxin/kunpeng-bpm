/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH Classpath-exception-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation. The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and licenses/ directory that accompany this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the licenses/ directory
 * that accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
/*
 * FormRenderer——协议渲染根组件（与 Vue 版同形）。
 *
 * 职责边界：数据归宿主（受控 modelValue + onChange，等价 Vue 版 v-model），校验单一
 * 事实源是 FormEngine（每份数据全量求值）；错误外显走「已触及字段 / 全量揭示」策略
 * （初始不打扰，提交时 validate() 全量揭示）。antd Form/Form.Item 仅作排版与错误
 * 展示载体，不走其 form store / rules 校验机制。
 * onValidate 随数据派发（挂载即派发 + 每次数据变化），语义是「当前数据的校验结果」；
 * 仅在 validate() 调用时额外揭示全部错误。
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Form } from 'antd';
import { FormEngine } from '@kunpeng-io/form-js';
import type { FieldValue, FormData, FormSchema, FormValidationResult } from '@kunpeng-io/form-js';
import FieldRow from './FieldRow';
import GroupSection from './GroupSection';

export interface FormRendererHandle {
  /** 整单提交入口：揭示全部错误并返回校验结果 */
  validate(): FormValidationResult;
  /** 清空触及痕迹与错误揭示（宿主重置数据时配套调用） */
  reset(): void;
}

export interface FormRendererProps {
  schema: FormSchema;
  /** 受控表单数据（宿主持有；等价 Vue 版 v-model/modelValue） */
  modelValue: FormData;
  /** 初始即全量外显错误（默认 false：等待字段被触及或 validate() 调用） */
  showAllErrors?: boolean;
  /** 数据变化回调（等价 Vue 版 update:modelValue） */
  onChange?: (data: FormData) => void;
  /** 校验结果回调：挂载即派发 + 每次数据变化派发（等价 Vue 版 validate 事件） */
  onValidate?: (result: FormValidationResult) => void;
}

export const FormRenderer = forwardRef<FormRendererHandle, FormRendererProps>(function FormRenderer(props, ref) {
  const { schema, modelValue, showAllErrors = false, onChange, onValidate } = props;

  const engine = useMemo(() => new FormEngine(schema), [schema]);
  const validation = useMemo(() => engine.validate(modelValue), [engine, modelValue]);
  const touchedRef = useRef(new Set<string>());
  const [revealAll, setRevealAll] = useState(showAllErrors);

  useEffect(() => {
    setRevealAll(showAllErrors);
  }, [showAllErrors]);

  useEffect(() => {
    onValidate?.(validation);
  }, [onValidate, validation]);

  /** 当前应外显的错误文案：已触及或全量揭示的字段取首条问题 */
  const displayed = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [id, issues] of Object.entries(validation.byField)) {
      if (revealAll || touchedRef.current.has(id)) {
        out[id] = issues[0].message;
      }
    }
    return out;
  }, [revealAll, validation]);

  function setValue(id: string, value: FieldValue): void {
    touchedRef.current.add(id);
    onChange?.({ ...modelValue, [id]: value });
  }

  useImperativeHandle(ref, () => ({
    validate() {
      setRevealAll(true);
      return validation;
    },
    reset() {
      touchedRef.current.clear();
      setRevealAll(showAllErrors);
    }
  }));

  return (
    <Form className="form-js-renderer" layout="vertical" component={false}>
      {schema.fields.map((field) =>
        field.type === 'group' ? (
          <GroupSection
            key={field.id}
            field={field}
            data={modelValue}
            engine={engine}
            errors={displayed}
            onSetValue={setValue}
          />
        ) : (
          <FieldRow
            key={field.id}
            field={field}
            data={modelValue}
            engine={engine}
            errors={displayed}
            onSetValue={setValue}
          />
        )
      )}
    </Form>
  );
});
