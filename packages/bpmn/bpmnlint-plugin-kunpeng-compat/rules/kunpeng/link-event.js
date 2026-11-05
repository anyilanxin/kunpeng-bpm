const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const {
  is,
  isAny
} = require('bpmnlint-utils');

const {
  getEventDefinition,
  hasProperties
} = require('../utils/element');

const { ERROR_TYPES } = require('../utils/error-types');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {

    // check for duplicate link catch event names
    if (is(node, 'bpmn:Process')) {
      const linkCatchEvents = getLinkCatchEvents(node);

      const { duplicateNames } = linkCatchEvents.reduce(({ duplicateNames, names }, linkCatchEvent, index) => {
        const linkEventDefinition = getEventDefinition(linkCatchEvent, 'bpmn:LinkEventDefinition');

        const name = linkEventDefinition.get('name');

        names = [
          ...names,
          name
        ];

        if (!name) {
          return {
            duplicateNames,
            names
          };
        }

        if (names.indexOf(name) !== index && !duplicateNames.includes(name)) {
          duplicateNames = [
            ...duplicateNames,
            name
          ];
        }

        return {
          duplicateNames,
          names
        };
      }, {
        duplicateNames: [],
        names: []
      });

      duplicateNames.forEach((name) => {
        const duplicates = linkCatchEvents
          .filter(linkCatchEvent => {
            const linkEventDefinition = getEventDefinition(linkCatchEvent, 'bpmn:LinkEventDefinition');

            return linkEventDefinition.get('name') === name;
          });

        duplicates
          .forEach(linkCatchEvent => {
            const linkEventDefinition = getEventDefinition(linkCatchEvent, 'bpmn:LinkEventDefinition');

            const path = getPath(linkEventDefinition, linkCatchEvent);

            reportErrors(linkCatchEvent, reporter, {
              message: `Property of type <bpmn:LinkEventDefinition> has property <name> with duplicate value of <${ name }>`,
              path: pathConcat(path || [], 'name'),
              data: {
                type: ERROR_TYPES.ELEMENT_PROPERTY_VALUE_DUPLICATED,
                node: linkEventDefinition,
                parentNode: linkCatchEvent,
                duplicatedProperty: 'name',
                duplicatedPropertyValue: name
              }
            });
          });
      });
    }

    // check for missing link catch & throw event names
    if (isLinkEvent(node)) {
      const linkEventDefinition = getEventDefinition(node);

      const errors = hasProperties(linkEventDefinition, {
        name: {
          required: true
        }
      }, node);

      if (errors.length) {
        reportErrors(node, reporter, errors);
      }
    }
  }

  return {
    check
  };
});

function isLinkEvent(element) {
  const eventDefinition = getEventDefinition(element);

  return isAny(element, [
    'bpmn:IntermediateCatchEvent',
    'bpmn:IntermediateThrowEvent'
  ]) && eventDefinition && is(eventDefinition, 'bpmn:LinkEventDefinition');
}

function isLinkCatchEvent(element) {
  const eventDefinition = getEventDefinition(element);

  return is(element, 'bpmn:IntermediateCatchEvent')
    && eventDefinition && is(eventDefinition, 'bpmn:LinkEventDefinition');
}

function getLinkCatchEvents(flowElementsContainer) {
  return flowElementsContainer.get('flowElements').reduce((linkCatchEvents, flowElement) => {
    if (isLinkCatchEvent(flowElement)) {
      return [
        ...linkCatchEvents,
        flowElement
      ];
    } else if (is(flowElement, 'bpmn:SubProcess')) {
      return [
        ...linkCatchEvents,
        ...getLinkCatchEvents(flowElement)
      ];
    }

    return linkCatchEvents;
  }, []);
}