/**
 * 示例插件 —— 演示插件化三支柱：
 * 1. 功能点扩展/替换：追加 palette 条目（多 Provider 合并语义）；
 * 2. 自定义命令：`sample.stamp`（命令栈注册 + 可撤销）；
 * 3. 事件通知：页面事件日志面板。
 *
 * 用法：new Modeler({ container, additionalModules: [SamplePluginModule] })
 * （demo 页默认加载；`?plugin=0` 关闭。）
 */
import type { ModuleDeclaration } from 'didi';

class SamplePlugin {
  static $inject = ['eventBus', 'commandStack', 'palette', 'selection', 'elementRegistry'];

  constructor(
    eventBus: any,
    commandStack: any,
    palette: any,
    selection: any,
    elementRegistry: any
  ) {
    // ---- 1. 自定义命令：给选中元素名称盖章（时间戳），可撤销 ----
    commandStack.register('sample.stamp', {
      execute(context: any) {
        const element = context.element;
        const bo = element.businessObject;
        context.oldName = bo.name;
        bo.name = `【已评审 ${new Date().toLocaleTimeString()}】${bo.name ?? ''}`;
        return [element];
      },
      revert(context: any) {
        const element = context.element;
        if (context.oldName) {
          element.businessObject.name = context.oldName;
        } else {
          delete element.businessObject.name;
        }
        return [element];
      }
    });

    // ---- 2. palette 扩展：Provider 合并（不替换原条目） ----
    // 优先级低于核心 Provider(1000)：核心条目先建组，插件条目追加在组尾，不打乱分组顺序
    palette.registerProvider(500, {
      getPaletteEntries() {
        return {
          'sample-stamp': {
            group: 'artifacts',
            className: 'bpm-sample-stamp-entry',
            title: '示例插件：给选中元素盖章（自定义命令）',
            action: {
              click: () => {
                const selected = selection.get();
                const target = selected[0] ?? elementRegistry.getAll().find((e: any) => !e.waypoints && e.businessObject?.$type === 'bpmn:Task');
                if (target) {
                  commandStack.execute('sample.stamp', { element: target });
                }
              }
            }
          }
        };
      }
    });

    // ---- 3. 事件日志面板 ----
    if (typeof document !== 'undefined') {
      const panel = document.createElement('div');
      panel.className = 'bpm-event-log';
      panel.innerHTML = '<div class="bpm-event-log-title">事件通知（示例插件订阅）<span class="bpm-event-log-toggle">收起</span></div><ul class="bpm-event-log-list"></ul>';
      document.body.appendChild(panel);
      const list = panel.querySelector('.bpm-event-log-list')!;
      const toggle = panel.querySelector('.bpm-event-log-toggle')!;
      toggle.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        toggle.textContent = panel.classList.contains('collapsed') ? '展开' : '收起';
      });

      const log = (text: string) => {
        const item = document.createElement('li');
        item.textContent = text;
        list.insertBefore(item, list.firstChild);
        while (list.children.length > 30) {
          list.removeChild(list.lastChild!);
        }
      };

      for (const eventName of [
        'import.start', 'import.done', 'import.error',
        'saveXML.start', 'saveXML.done',
        'commandStack.changed',
        'selection.changed',
        'bpmn.replace', 'bpmn.label.updated', 'bpmn.lane.added', 'bpmn.lane.removed'
      ]) {
        eventBus.on(eventName, (event: any) => {
          const detail = event?.element?.id ? ` · ${event.element.id}` : '';
          log(`${eventName}${detail}`);
        });
      }
    }
  }
}

export const SamplePluginModule: ModuleDeclaration = {
  __init__: ['samplePlugin'],
  samplePlugin: ['type', SamplePlugin]
};
