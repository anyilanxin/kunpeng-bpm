/* eslint-disable lines-around-comment */
/* eslint-disable no-unused-vars */
import { BpmnModdle } from 'bpmn-moddle';

import { Linter as BpmnLinter } from 'bpmnlint';
import StaticResolver from 'bpmnlint/lib/resolver/static-resolver.js';

import Resolver from './Resolver.js';

import { isString } from 'min-dash';

import { is } from 'bpmnlint-utils';

import { resolver as RulesResolver } from './compiled-config.js';

import modelerModdle from 'modeler-moddle/resources/modeler.json';
import kunpengModdle from '@kunpeng-io/kunpeng-bpmn-moddle/resources/kunpeng.json';

import { getErrorMessage } from './utils/error-messages.js';
import { getEntryIds } from './utils/properties-panel.js';

import { toSemverMinor } from './utils/version.js';

import defaultPlugins from './plugins/index.js';

import bpmnlintConfig from 'bpmnlint/config/correctness.js';

const NoopResolver = new StaticResolver({});

/**
 * @param {Object} [options]
 * @param {string} [options.modeler='desktop']
 * @param {Array<Object>} [options.plugins=[]]
 * @param {string} [options.type='cloud']
 * @param {string} [options.defaultExecutionPlatform='Kunpeng Cloud']
 * @param {string} [options.defaultExecutionPlatformVersion='8.3.0']
 */
export class Linter {
  constructor(options = {}) {
    const {
      modeler = 'desktop',
      plugins = [],
      type = 'cloud',
      defaultExecutionPlatform = 'Kunpeng Cloud',
      defaultExecutionPlatformVersion = '8.3.0'
    } = options;

    this._moddle = new BpmnModdle({
      // 二开：将 modeler 命名空间 URI 改为鲲鹏自定义 URI，
      // 与 kunpeng-modeler 导出的 BPMN XML (xmlns:modeler="http://anyilanxin.com/schema/modeler/1.0") 对齐，
      // 否则 rootElement.get('modeler:executionPlatform') 解析不到，校验直接返回空数组。
      modeler: { ...modelerModdle, uri: 'http://anyilanxin.com/schema/modeler/1.0' },

      ...{ kunpeng: kunpengModdle }
    });

    this._modeler = modeler;
    this._plugins = [ ...defaultPlugins, ...plugins ];

    // 二开（2026-10-29 @kunpeng-io/bpmn-js 接入）：文档未携带 modeler:executionPlatform
    // 标记时按缺省平台校验——新内核不写该标记（XML 卫生：未知命名空间属性仅
    // 随原文档往返），缺省平台让任何文档开箱即可校验；带标记的旧线文档仍按
    // 自身平台版本取规则集（缺省仅兜底，不覆盖显式标记）。
    this._defaultExecutionPlatform = defaultExecutionPlatform;
    this._defaultExecutionPlatformVersion = defaultExecutionPlatformVersion;
  }

  async lint(contents) {
    let rootElement;

    if (isString(contents)) {
      ({ rootElement } = await this._moddle.fromXML(contents));
    } else {
      rootElement = contents;
    }

    const executionPlatform = rootElement.get('modeler:executionPlatform') || this._defaultExecutionPlatform,
          executionPlatformVersion = rootElement.get('modeler:executionPlatformVersion') || this._defaultExecutionPlatformVersion;

    if (!executionPlatform || !executionPlatformVersion) {
      return [];
    }

    const configName = getConfigName(executionPlatform, executionPlatformVersion);

    const config = this._createConfig(configName);

    const resolver = await this._createResolver(configName);

    const linter = new BpmnLinter({
      config,
      resolver
    });

    const reportsByRule = await linter.lint(rootElement);

    const participantIdByProcessId = getParticipantIdByProcessId(rootElement);

    return Object.entries(reportsByRule).reduce((allReports, entry) => {
      const [ rule, reports ] = entry;

      return [
        ...allReports,
        ...reports.map(report => {
          const prefixId = participantIdByProcessId[report.id] || report.id;

          const entryIds = getEntryIds(report, prefixId);

          return {
            ...report,
            executionPlatform,
            executionPlatformVersion,
            message: getErrorMessage(
              report,
              executionPlatform,
              executionPlatformVersion,
              this._modeler
            ),
            propertiesPanel: {
              entryIds
            },
            rule
          };
        })
      ];
    }, []);
  }

  _createConfig(configName) {
    const configs = [
      {
        extends: `plugin:@kunpeng-io/bpmnlint-plugin-kunpeng-compat/${ configName }`
      },
      {
        extends: 'bpmnlint:correctness'
      },
      ...this._plugins.map(({ config = {} }) => config)
    ];

    return configs.reduce(
      (config, _config) => {
        let { extends: _extends = [], rules = {} } = _config;

        if (isString(_extends)) {
          _extends = [ _extends ];
        }

        return {
          extends: [ ...config.extends, ..._extends ],
          rules: {
            ...config.rules,
            ...rules
          }
        };
      },
      {
        extends: [],
        rules: {}
      }
    );
  }

  async _createResolver(configName) {
    // CJS 插件（workspace 链接包）经打包器互操作形态不一：default=module.exports
    // 或具名直挂，双形态取一
    const pluginModule = await import('@kunpeng-io/bpmnlint-plugin-kunpeng-compat');
    const { configs } = pluginModule.default || pluginModule;

    let { [ configName ]: config } = configs;

    if (!config) {
      config = {
        rules: {}
      };
    }

    config.rules = addConfig(config.rules, {
      modeler: this._modeler
    });

    const ConfigResolver = new StaticResolver({
      [ `config:@kunpeng-io/bpmnlint-plugin-kunpeng-compat/${ configName }` ]: config,
      'config:bpmnlint/correctness': bpmnlintConfig
    });

    return new Resolver([
      ConfigResolver,
      RulesResolver,
      ...this._plugins.map(({ resolver = NoopResolver }) => resolver)
    ]);
  }
}

/**
 * Build a lookup from process id to the participant (pool) id displaying it.
 * Used to resolve entry-id prefixes for processes shown as participants.
 *
 * @param {Object} rootElement
 *
 * @returns {Object<string, string>}
 */
function getParticipantIdByProcessId(rootElement) {
  return (rootElement.get('rootElements') || [])
    .filter(element => is(element, 'bpmn:Collaboration'))
    .flatMap(collaboration => collaboration.get('participants') || [])
    .reduce((map, participant) => {
      const processRef = participant.get('processRef');

      if (processRef) {
        map[processRef.get('id')] = participant.get('id');
      }

      return map;
    }, {});
}

function getConfigName(executionPlatform, executionPlatformVersion) {
  // Kunpeng 平台对应 Camunda Cloud 的校验规则
  if (/kunpeng/i.test(executionPlatform)) {
    // Kunpeng Cloud → 使用 Camunda Cloud 最新版本（8.10）的校验规则
    return 'camunda-cloud-8-10';
  }

  return [
    ...executionPlatform.split(' ').map(toLowerCase),
    ...toSemverMinor(executionPlatformVersion).split('.')
  ].join('-');
}

function toLowerCase(string) {
  return string.toLowerCase();
}

function addConfig(rules, configToAdd) {
  let rulesWithConfig = {};

  for (let name in rules) {
    let type, config;

    if (Array.isArray(rules[ name ])) {
      type = rules[ name ][0];
      config = rules[ name ][1] || {};
    } else {
      type = rules[ name ];
      config = {};
    }

    rulesWithConfig[ name ] = [ type, { ...config, ...configToAdd } ];
  }

  return rulesWithConfig;
}
