/* eslint-disable lines-around-comment */
/* eslint-disable no-unused-vars */
import { BpmnModdle } from 'bpmn-moddle';

import { Linter as BpmnLinter } from 'bpmnlint';
import StaticResolver from 'bpmnlint/lib/resolver/static-resolver';

import Resolver from './Resolver';

import { isString } from 'min-dash';

import { is } from 'bpmnlint-utils';

import { resolver as RulesResolver } from './compiled-config';

import modelerModdle from 'modeler-moddle/resources/modeler.json';
import kunpengModdle from '@kunpeng-io/kunpeng-bpmn-moddle/resources/kunpeng.json';

import { getErrorMessage } from './utils/error-messages';
import { getEntryIds } from './utils/properties-panel';

import { toSemverMinor } from './utils/version';

import defaultPlugins from './plugins';

import bpmnlintConfig from 'bpmnlint/config/correctness';

const NoopResolver = new StaticResolver({});

/**
 * @param {Object} [options]
 * @param {string} [options.modeler='desktop']
 * @param {Array<Object>} [options.plugins=[]]
 * @param {string} [options.type='cloud']
 */
export class Linter {
  constructor(options = {}) {
    const {
      modeler = 'desktop',
      plugins = [],
      type = 'cloud'
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
  }

  async lint(contents) {
    let rootElement;

    if (isString(contents)) {
      ({ rootElement } = await this._moddle.fromXML(contents));
    } else {
      rootElement = contents;
    }

    const executionPlatform = rootElement.get('modeler:executionPlatform'),
          executionPlatformVersion = rootElement.get('modeler:executionPlatformVersion');

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
        extends: `plugin:@kunpeng-js/bpmnlint-plugin-kunpeng-compat/${ configName }`
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
    const { configs } = await import('@kunpeng-js/bpmnlint-plugin-kunpeng-compat');

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
      [ `config:@kunpeng-js/bpmnlint-plugin-kunpeng-compat/${ configName }` ]: config,
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
