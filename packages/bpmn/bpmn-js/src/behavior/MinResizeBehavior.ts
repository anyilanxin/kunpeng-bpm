/*
 * Copyright (c) 2021-present ZHOUXUANHONG(安一老厨)<anyilanxin@aliyun.com>
 *
 * 本软件 AnYi Process Tools Vue EE 商业授权软件。未经过商业授权禁止使用，违者必究。
 *（条款全文见包根 LICENSE.txt）
 */
import type EventBus from 'diagram-js/lib/core/EventBus';
import { isSubProcessFamily, SIZES } from '../meta/ElementTypes';

/**
 * 展开态子流程族 resize 最小尺寸（2026-11-04 用户定规：「展开子流程 350×200
 * 是最小尺寸——随元素增加会变大」）。经 diagram-js Resize 官方扩展点
 * resize.start 注入 minDimensions（与 LaneBandBehavior 同机制）：拖拽手柄
 * 活体钳制在 min 边界，不靠提交后回弹；子元素增加的扩框（autoResize）只增
 * 不减，与下限天然无冲突。
 *
 * 取值：SubProcess（展开/事件子流程）与展开 Ad-hoc = SIZES.SUBPROCESS_W/H
 * （350×200，与创建缺省同值）；事务恒展开但创建即任务盒（同日定规），下限
 * 取任务盒 116×78 而非 350×200——否则刚创建的 116×78 事务任何 resize 只能
 * 先跳涨到 350。折叠态不开放缩放（规则层 resizePolicies 已拒），此处跳过。
 */
export class MinResizeBehavior {
  static $inject = ['eventBus'];

  constructor(eventBus: EventBus) {
    // 优先级 1000：晚于 LaneBandBehavior 的带约束（900）不干扰——池/带的
    // min 由带行为独占（带界语义），此处只管子流程族
    eventBus.on('resize.start', 1000, (event: any) => {
      const context = event.context;
      const shape = context.shape;
      const type = shape?.businessObject?.$type;
      if (!isSubProcessFamily(type) || shape.isExpanded === false) {
        return;
      }
      context.minDimensions = type === 'bpmn:Transaction'
        ? { width: SIZES.TASK_W, height: SIZES.TASK_H }
        : { width: SIZES.SUBPROCESS_W, height: SIZES.SUBPROCESS_H };
    });
  }
}
