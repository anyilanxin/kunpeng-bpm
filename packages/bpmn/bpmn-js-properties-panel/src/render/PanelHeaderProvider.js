import {
  getLabel
} from '@kunpeng-io/bpmn-js';

import {
  is,
  getBusinessObject
} from '@kunpeng-io/bpmn-js';

import {
  isExpanded,
  isEventSubProcess,
  isInterrupting
} from '@kunpeng-io/bpmn-js';

import {
  useService
} from '../hooks';

import iconsByType from '../icons';

{ /* Required to break up imports, see https://github.com/babel/babel/issues/15156 */ }

export function getConcreteType(element) {
  const {
    type: elementType
  } = element;

  let type = getRawType(elementType);

  // (1) event definition types
  const eventDefinition = getEventDefinition(element);

  if (eventDefinition) {
    type = `${getEventDefinitionPrefix(eventDefinition)}${type}`;

    // (1.1) interrupting / non interrupting
    if (
      (is(element, 'bpmn:StartEvent') && !isInterrupting(element)) ||
        (is(element, 'bpmn:BoundaryEvent') && !isCancelActivity(element))
    ) {
      type = `${type}NonInterrupting`;
    }

    return type;
  }

  // (2) sub process types
  if (is(element, 'bpmn:SubProcess') && !is(element, 'bpmn:Transaction')) {
    if (isEventSubProcess(element)) {
      type = `Event${type}`;
    } else {
      const expanded = isExpanded(element) && !isPlane(element);
      type = `${expanded ? 'Expanded' : 'Collapsed'}${type}`;
    }
  }

  // (3) conditional + default flows
  if (isDefaultFlow(element)) {
    type = 'DefaultFlow';
  }

  if (isConditionalFlow(element)) {
    type = 'ConditionalFlow';
  }


  return type;
}

export const PanelHeaderProvider = (translate) => {
  if (!translate) translate = (text) => text;
  return {
    getDocumentationRef: (element) => {
      const elementTemplates = getTemplatesService();

      if (elementTemplates) {
        return getTemplateDocumentation(element, elementTemplates);
      }
    },

    getElementLabel: (element) => {
      if (is(element, 'bpmn:Process')) {
        return getBusinessObject(element).name;
      }

      return getLabel(element);
    },

    getElementIcon: (element) => {
      const concreteType = getConcreteType(element);

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const config = useService('config.elementTemplateIconRenderer', false);

      const { iconProperty = 'kunpeng:modelerTemplateIcon' } = config || {};

      const templateIcon = getBusinessObject(element).get(iconProperty);

      if (templateIcon) {
        return () => <img class="bio-properties-panel-header-template-icon" width="32" height="32" src={ templateIcon } alt="" />;
      }

      // 宿主注入的 BPMN 记法图标渲染器（如 @kunpeng-io/bpmn-js 的 BpmnIcons.iconOfElement，
      // 画布/palette/面板头部三处同源）：返回 SVG html 字符串（本包包装为组件）或直接返回
      // preact 组件；未注入回落本包自带图标集
      const iconRenderer = useService('config.bpmnElementIconRenderer', false);

      if (iconRenderer) {
        const rendered = iconRenderer(element);

        if (rendered) {
          return typeof rendered === 'function'
            ? rendered
            : () => <span class="bio-properties-panel-header-type-icon" dangerouslySetInnerHTML={ { __html: rendered } }></span>;
        }
      }

      return iconsByType[ concreteType ];
    },

    getTypeLabel: (element) => {
      const elementTemplates = getTemplatesService();

      if (elementTemplates) {
        const template = getTemplate(element, elementTemplates);

        if (template && template.name) {
          return translate(template.name);
        }
      }

      const concreteType = getConcreteType(element);

      return translate(concreteType
        .replace(/(\B[A-Z])/g, ' $1')
        .replace(/(\bNon Interrupting)/g, '($1)'));
    }
  };
};


// helpers ///////////////////////

function isCancelActivity(element) {
  const businessObject = getBusinessObject(element);

  return businessObject && businessObject.cancelActivity !== false;
}

function getEventDefinition(element) {
  const businessObject = getBusinessObject(element),
        eventDefinitions = businessObject.eventDefinitions;

  return eventDefinitions && eventDefinitions[0];
}

function getRawType(type) {
  return type.split(':')[1];
}

function getEventDefinitionPrefix(eventDefinition) {
  const rawType = getRawType(eventDefinition.$type);

  return rawType.replace('EventDefinition', '');
}

function isDefaultFlow(element) {
  const businessObject = getBusinessObject(element);
  const sourceBusinessObject = getBusinessObject(element.source);

  if (!is(element, 'bpmn:SequenceFlow') || !sourceBusinessObject) {
    return false;
  }

  return sourceBusinessObject.default && sourceBusinessObject.default === businessObject && (
    is(sourceBusinessObject, 'bpmn:Gateway') || is(sourceBusinessObject, 'bpmn:Activity')
  );
}

function isConditionalFlow(element) {
  const businessObject = getBusinessObject(element);
  const sourceBusinessObject = getBusinessObject(element.source);

  if (!is(element, 'bpmn:SequenceFlow') || !sourceBusinessObject) {
    return false;
  }

  return businessObject.conditionExpression && is(sourceBusinessObject, 'bpmn:Activity');
}

function isPlane(element) {

  // Backwards compatibility for bpmn-js<8
  const di = element && (element.di || getBusinessObject(element).di);

  return is(di, 'bpmndi:BPMNPlane');
}

function getTemplatesService() {

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useService('elementTemplates', false);
}

function getTemplate(element, elementTemplates) {
  return elementTemplates.get(element);
}

function getTemplateDocumentation(element, elementTemplates) {
  const template = getTemplate(element, elementTemplates);

  return template && template.documentationRef;
}