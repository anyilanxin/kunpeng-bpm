/*
 * Copyright (c) 2021-present ZHOUXUANHONG(安一老厨)<anyilanxin@aliyun.com>
 *
 * 本软件 AnYi Process Tools Vue EE 商业授权软件。未经过商业授权禁止使用，违者必究。
 *（条款全文见包根 LICENSE.txt）
 */
import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import type Modeling from 'diagram-js/lib/features/modeling/Modeling';
import { isSubProcessFamily } from '../meta/ElementTypes';

/** 连线跨界判定用：container 是否在 el 的父链上（含 el 自身——挂子流程本体的关联也算在内侧） */
function inChain(el: any, container: any): boolean {
  for (let p = el; p; p = p.parent) {
    if (p === container) {
      return true;
    }
  }
  return false;
}

/** 两矩形有面积交集（贴边共边不算——2026-11-04 二轮定规：骑跨边线=扩容，
 * 完全脱出（无交集）才脱离；与 BpmnRules.rectsIntersect 同语义，行为层单源） */
export function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function fullyInside(shape: any, container: any): boolean {
  return shape.x >= container.x
    && shape.y >= container.y
    && shape.x + shape.width <= container.x + container.width
    && shape.y + shape.height <= container.y + container.height;
}

/**
 * 展开子流程成员归属拆分（2026-11-04 用户两轮定规）：在展开子流程内部
 * 框选多个元素整体移动后——仍完整在其内的留守成员；**完全脱出**（与子流程
 * 无面积交集）的成员脱离该子流程（画布父级上爬到祖父层，语义
 * flowElements/引用随 moveShape 的 adopt/orphan 链同步）。骑跨边线者不
 * 脱离——规则层放行、AutoResize 边框外延把越缘元素罩住（拖到边线上=
 * 自动扩大子流程）。
 *
 * 断开链接（2026-11-04 用户澄清）：脱离成员与**留守内部成员**之间的连线删除
 * ——BPMN 顺序流本就不得跨越子流程边界。判定在 flush 时按最终态做：整组
 * 一道移出的成员互链两侧都在外，不属跨界、保留；只有一侧仍在子流程内的
 * 连线才切。切线命令挂在 elements.move postExecuted（moveClosure 的连线
 * 循环已完结，嵌套合法且同 action 帧——撤销单步还原整组拖拽）。
 *
 * 归属调整经嵌套零位移 moveShape({layout:false})——命令栈真实条目，撤销/
 * 重做对称（AGENTS 契约：纯换父必须 layout:false）。挂 'shape.move'
 * postExecute 单点：UI 拖拽（Move 走 elements.move → 基座逐形嵌套
 * shape.move）、程序化 moveShape 两路全覆盖。
 *
 * 双向收敛（不止脱离）：
 * - 上爬脱离：父为展开子流程族且未整装 → 脱到祖父，直至整装或遇非子流程父
 *   （池/道/根——池的收养另有 CollaborationBehavior，语义不混）；
 * - 下探收养：目标层内完整装下它的最小展开子流程接回（基座批量移动把整组
 *   挂到同一落点父级，视觉仍在子流程内的成员由此回到其名下）。
 *
 * detachedSubs：本 action 帧内发生过脱离的子流程集合，供 BpmnAutoResize
 * 让位判定（扩框留住越缘元素与脱离语义互斥），commandStack.changed 清空。
 */
export class SubProcessMembershipBehavior extends CommandInterceptor {
  static $inject = ['eventBus', 'modeling'];

  readonly detachedSubs = new Set<any>();

  private groupDepth = 0;
  private readonly pendingCuts: { conn: any; from: any }[] = [];

  constructor(eventBus: any, private readonly modeling: Modeling) {
    super(eventBus);

    this.on('elements.move', 'preExecute', () => { this.groupDepth++; });
    // 切线收口须排在本事件一切默认优先级监听（基座 AutoResize 的
    // groupBy(element.parent.id) 等）之后：被删连线的 parent 已置空，
    // 先切会炸基座遍历——priority 0 晚于默认 1000
    this.on('elements.move', 'postExecuted', 0, () => {
      this.groupDepth = Math.max(0, this.groupDepth - 1);
      this.flushCuts();
    });
    // 独立 moveShape（程序化直调）没有 elements.move 外壳，同帧收尾；
    // 组移动的嵌套 shape.move 不在此切（等外层 elements.move 收口）
    this.on('shape.move', 'postExecuted', 0, () => {
      if (this.groupDepth === 0) {
        this.flushCuts();
      }
    });
    eventBus.on('commandStack.changed', () => { this.detachedSubs.clear(); });

    // postExecute 相位发嵌套命令（executed 在 execute 相内——命令栈禁止相内
    // 发新命令，会抛 illegal invocation）。redo 不重放 postExecute，但嵌套
    // moveShape 是真实栈条目、redo 经自身 execute 重放，撤销/重做对称。
    this.on('shape.move', 'postExecute', (event: any) => {
      this.reconcile(event.context.shape, event.context.oldParent);
    });
  }

  private reconcile(shape: any, oldParent: any): void {
    if (!shape || shape.labelTarget || shape.waypoints || shape.x === undefined) {
      return;
    }
    const type: string = shape.businessObject?.$type;
    if (type === 'bpmn:BoundaryEvent' || type === 'bpmn:Lane' || type === 'bpmn:Participant') {
      return;
    }
    // ① 上爬脱离：仅完全脱出（与子流程无任何面积交集）——骑跨边线者留守，
    // 由 AutoResize 边框外延罩住（2026-11-04 二轮定规「拖到边线上触发扩容」）
    let target: any = shape.parent;
    while (isExpandedSubProcess(target) && !rectsOverlap(shape, target)) {
      target = target.parent;
    }
    // ② 下探收养：同层内完整装下的最小展开子流程（最小者=最内层）。
    // 必须排除自身：整装自含 fullyInside(自身,自身) 恒真，误纳会把容器
    // 父级指到自己（自引用环，画布树遍历死循环——移动展开子流程本体
    // 整机卡死的根因）
    for (;;) {
      let best: any = null;
      for (const child of target.children ?? []) {
        if (child !== shape && isExpandedSubProcess(child) && fullyInside(shape, child)
          && (!best || child.width * child.height < best.width * best.height)) {
          best = child;
        }
      }
      if (!best) {
        break;
      }
      target = best;
    }
    if (target === shape.parent) {
      return;
    }
    // 脱离来源：旧父链上最近的展开子流程（跨界连线判定基准）
    let from: any = oldParent;
    while (from && !isExpandedSubProcess(from)) {
      from = from.parent;
    }
    if (from) {
      this.detachedSubs.add(from);
      this.collectCuts(shape, from);
    }
    this.modeling.moveShape(shape, { x: 0, y: 0 }, target, undefined, { layout: false });
  }

  /** 脱离成员的进出连线中，另一端仍在子流程内的登记待切（flush 再按最终态复核） */
  private collectCuts(shape: any, from: any): void {
    for (const conn of [...(shape.incoming ?? []), ...(shape.outgoing ?? [])]) {
      if (!this.pendingCuts.some((c) => c.conn === conn)) {
        this.pendingCuts.push({ conn, from });
      }
    }
  }

  /**
   * 切线收口：源/目标只有一侧仍在该子流程内 = 跨界 → 删除；两侧都在外
   * （整组一道移出）或都在内不切。conn.parent 空守卫：已被级联删除的不重复切。
   */
  private flushCuts(): void {
    if (!this.pendingCuts.length) {
      return;
    }
    const cuts = this.pendingCuts.splice(0);
    for (const { conn, from } of cuts) {
      if (!conn.parent || inChain(conn.source, from) === inChain(conn.target, from)) {
        continue;
      }
      this.modeling.removeConnection(conn);
    }
  }
}

function isExpandedSubProcess(el: any): boolean {
  return !!el && isSubProcessFamily(el.businessObject?.$type) && el.isExpanded !== false;
}
