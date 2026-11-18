/*
 * Copyright (c) 2026 anyilanxin zxh (anyilanxin@aliyun.com). All rights reserved.
 * SPDX-License-Identifier: GPL-2.0-only WITH CLASSPATH-EXCEPTION-2.0
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  The copyright holder designates
 * this particular file as subject to the "Classpath" exception as provided
 * in the LICENSE file and directories/ that accompany this code.
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
/**
 * bpmn 线内核 UI 英文词典（key=内核源码中文原文；覆盖 palette/context pad/
 * 替换·创建·元素·连线类型·对齐分布弹框/工具栏/下钻徽标/缺省流程名）。
 * key 与源码 t() 调用一一对应，新增 UI 文案必须过 t()（见 design-docs 需求）。
 */
export const bpmnEnUS: Record<string, string> = {
  // ---- 类型 label（ElementTypes，97 条；部分与 palette 分组名共用 key） ----
  '开始事件': 'Start event',
  '中间抛出': 'Intermediate throw',
  '中间捕获': 'Intermediate catch',
  '边界事件': 'Boundary event',
  '结束事件': 'End event',
  '活动': 'Activities',
  '子流程': 'Sub-process',
  '网关': 'Gateways',
  '容器': 'Containers',
  '数据与制品': 'Data & artifacts',
  '连线': 'Connect',
  '任务': 'Task',
  '用户任务': 'User task',
  '服务任务': 'Service task',
  '脚本任务': 'Script task',
  '手工任务': 'Manual task',
  '发送任务': 'Send task',
  '接收任务': 'Receive task',
  '业务规则任务': 'Business rule task',
  '调用活动': 'Call activity',
  '展开子流程': 'Expanded sub-process',
  '折叠子流程': 'Collapsed sub-process',
  '事务子流程': 'Transaction sub-process',
  '事件子流程': 'Event sub-process',
  'Ad-hoc 子流程': 'Ad-hoc sub-process',
  'Ad-hoc 子流程（折叠）': 'Ad-hoc sub-process (collapsed)',
  '排他网关': 'Exclusive gateway',
  '并行网关': 'Parallel gateway',
  '包容网关': 'Inclusive gateway',
  '复杂网关': 'Complex gateway',
  '事件网关': 'Event-based gateway',
  '顺序流': 'Sequence flow',
  '消息流': 'Message flow',
  '数据对象': 'Data object',
  '数据存储': 'Data store',
  '数据关联': 'Data association',
  '文本注记': 'Text annotation',
  '关联': 'Association',
  '分组': 'Group',
  '池/参与者': 'Pool / participant',
  '消息中间抛出': 'Message intermediate throw',
  '消息中间捕获': 'Message intermediate catch',
  '消息开始事件': 'Message start event',
  '消息结束事件': 'Message end event',
  '消息边界事件': 'Message boundary event',
  '信号中间抛出': 'Signal intermediate throw',
  '信号中间捕获': 'Signal intermediate catch',
  '信号开始事件': 'Signal start event',
  '信号结束事件': 'Signal end event',
  '信号边界事件': 'Signal boundary event',
  '定时中间捕获': 'Timer intermediate catch',
  '定时开始事件': 'Timer start event',
  '定时边界事件': 'Timer boundary event',
  '条件中间捕获': 'Conditional intermediate catch',
  '条件开始事件': 'Conditional start event',
  '条件边界事件': 'Conditional boundary event',
  '错误中间捕获': 'Error intermediate catch',
  '错误开始事件': 'Error start event',
  '错误结束事件': 'Error end event',
  '错误边界事件': 'Error boundary event',
  '升级中间抛出': 'Escalation intermediate throw',
  '升级中间捕获': 'Escalation intermediate catch',
  '升级开始事件': 'Escalation start event',
  '升级结束事件': 'Escalation end event',
  '升级边界事件': 'Escalation boundary event',
  '取消结束事件': 'Cancel end event',
  '取消边界事件': 'Cancel boundary event',
  '补偿中间抛出': 'Compensation intermediate throw',
  '补偿开始事件': 'Compensation start event',
  '补偿结束事件': 'Compensation end event',
  '补偿边界事件': 'Compensation boundary event',
  '链接中间抛出': 'Link intermediate throw',
  '链接中间捕获': 'Link intermediate catch',
  '多实例中间抛出': 'Multiple intermediate throw',
  '多实例中间捕获': 'Multiple intermediate catch',
  '多实例开始事件': 'Multiple start event',
  '多实例结束事件': 'Multiple end event',
  '多实例边界事件': 'Multiple boundary event',
  '并行多实例中间捕获': 'Parallel multiple intermediate catch',
  '并行多实例开始事件': 'Parallel multiple start event',
  '并行多实例边界事件': 'Parallel multiple boundary event',
  '无定义中间抛出': 'None intermediate throw',
  '非中断消息开始事件': 'Non-interrupting message start event',
  '非中断消息边界事件': 'Non-interrupting message boundary event',
  '非中断信号开始事件': 'Non-interrupting signal start event',
  '非中断信号边界事件': 'Non-interrupting signal boundary event',
  '非中断升级开始事件': 'Non-interrupting escalation start event',
  '非中断升级边界事件': 'Non-interrupting escalation boundary event',
  '非中断定时开始事件': 'Non-interrupting timer start event',
  '非中断定时边界事件': 'Non-interrupting timer boundary event',
  '非中断条件开始事件': 'Non-interrupting conditional start event',
  '非中断条件边界事件': 'Non-interrupting conditional boundary event',
  '非中断多实例开始事件': 'Non-interrupting multiple start event',
  '非中断多实例边界事件': 'Non-interrupting multiple boundary event',
  '非中断并行多实例开始事件': 'Non-interrupting parallel multiple start event',
  '非中断并行多实例边界事件': 'Non-interrupting parallel multiple boundary event',

  // ---- palette 工具与创建条目 ----
  '抓手工具（按住拖动画布）': 'Hand tool (drag to pan canvas)',
  '套索工具（框选）': 'Lasso tool (rubber-band select)',
  '空间工具（腾挪空间）': 'Space tool (make space)',
  '全局连线': 'Global connect',
  '更多元素': 'More elements',
  '创建中间/边界事件（拖到活动上为边界事件）': 'Create intermediate/boundary event (drop on activity for boundary)',
  '创建{label}': 'Create {label}',

  // ---- context pad ----
  '{direction}添加泳道': 'Add lane {direction}',
  '向上': 'above',
  '向下': 'below',
  '向左': 'left',
  '向右': 'right',
  '分割泳道为 2 段': 'Divide lane into 2',
  '分割泳道为 3 段': 'Divide lane into 3',
  '删除泳道': 'Delete lane',
  '追加': 'Append',
  '追加 中间事件': 'Append intermediate event',
  '追加更多元素': 'Append more elements',
  '添加文本注释': 'Add text annotation',
  '对齐 / 分布': 'Align / distribute',
  '删除（Delete）': 'Delete (Delete)',
  '删除所选（Delete）': 'Delete selected (Delete)',

  // ---- 弹框（元素/替换/连线类型/对齐分布/多实例） ----
  '创建元素': 'Create element',
  '更改元素类型': 'Change element type',
  '替换类型': 'Replace type',
  '切换连线类型': 'Switch flow type',
  '切换为非空泳道': 'Switch to non-empty lane',
  '清空池（删除内容）': 'Empty pool (delete contents)',
  '清空泳道（删除内容）': 'Empty lane (delete contents)',
  '条件流': 'Conditional flow',
  '默认流': 'Default flow',
  '左对齐': 'Align left',
  '水平居中': 'Align center',
  '右对齐': 'Align right',
  '上对齐': 'Align top',
  '垂直居中': 'Align middle',
  '下对齐': 'Align bottom',
  '水平分布': 'Distribute horizontally',
  '垂直分布': 'Distribute vertically',
  '并行多实例': 'Parallel multi-instance',
  '顺序多实例': 'Sequential multi-instance',
  '标准循环': 'Standard loop',

  // ---- 工具栏（bpmn-js-toolbar） ----
  '撤销 (Ctrl+Z)': 'Undo (Ctrl+Z)',
  '重做 (Ctrl+Shift+Z)': 'Redo (Ctrl+Shift+Z)',
  '重置画布': 'Reset canvas',
  '重置缩放 (Ctrl+0)': 'Reset zoom (Ctrl+0)',
  '缩小 (Ctrl+-)': 'Zoom out (Ctrl+-)',
  '放大 (Ctrl++)': 'Zoom in (Ctrl++)',
  '适应画布': 'Fit viewport',
  '更多': 'More',
  '开启校验': 'Enable linting',
  '关闭校验': 'Disable linting',
  '切换为纵向布局': 'Switch to vertical layout',
  '切换为横向布局': 'Switch to horizontal layout',
  '设置选中元素颜色': 'Set color of selected elements',
  '清除选中元素颜色': 'Clear color of selected elements',
  '填充': 'Fill',
  '描边': 'Stroke',
  '确定': 'OK',

  // ---- 下钻徽标与缺省文档名 ----
  '下钻进入子流程': 'Drill down into sub-process',
  '流程 {n}': 'Process {n}'
};
