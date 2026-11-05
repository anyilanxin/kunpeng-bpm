const { isString } = require('min-dash');

const { isAny } = require('bpmnlint-utils');

const config = require('./config');

const { greaterOrEqual } = require('../../utils/version');

const { getEventDefinition } = require('../../utils/element');

const { ERROR_TYPES } = require('../../utils/error-types');

const { reportErrors } = require('../../utils/reporter');

const { skipInNonExecutableProcess } = require('../../utils/rule');

const { annotateRule } = require('../../helper');

module.exports = skipInNonExecutableProcess(function({ version }) {
  function check(node, reporter) {
    if (!isAny(node, [ 'bpmn:FlowElement', 'bpmn:FlowElementsContainer' ])) {
      return;
    }

    const element = config[ node.$type ];

    if (!element || (isString(element) && !greaterOrEqual(version, element))) {

      // (1) Element not allowed
      const allowedVersion = element || null;

      let message = `Element of type <${ node.$type }> not allowed`;

      let data = {
        type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
        node,
        parentNode: null
      };

      if (allowedVersion) {
        message = `Element of type <${ node.$type }> only allowed by Camunda ${ allowedVersion } or newer`;

        data = {
          ...data,
          allowedVersion
        };
      }

      const error = {
        message,
        path: null,
        data
      };

      reportErrors(node, reporter, error);

      return;
    }

    if (!isAny(node, [ 'bpmn:CatchEvent', 'bpmn:ThrowEvent' ])) {
      return;
    }

    const eventDefinition = getEventDefinition(node);

    if (eventDefinition) {
      if (!element[ eventDefinition.$type ] || !greaterOrEqual(version, element[ eventDefinition.$type ])) {

        // (2) Element with event definition not allowed
        const allowedVersion = element[ eventDefinition.$type ] || null;

        let message = `Element of type <${ node.$type }> with event definition of type <${ eventDefinition.$type }> not allowed`;

        let data = {
          type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
          node,
          parentNode: null,
          eventDefinition
        };

        if (allowedVersion) {
          message = `Element of type <${ node.$type }> with event definition of type <${ eventDefinition.$type }> only allowed by Camunda ${ allowedVersion } or newer`;

          data = {
            ...data,
            allowedVersion
          };
        }

        const error = {
          message,
          path: null,
          data
        };

        reportErrors(node, reporter, error);
      }
    } else {
      if (!element[ '_' ] || !greaterOrEqual(version, element[ '_' ])) {

        // (3) Element without event definition not allowed
        const allowedVersion = element[ '_' ] || null;

        let message = `Element of type <${ node.$type }> with no event definition not allowed`;

        let data = {
          type: ERROR_TYPES.ELEMENT_TYPE_NOT_ALLOWED,
          node,
          parentNode: null,
          eventDefinition
        };

        if (allowedVersion) {
          message = `Element of type <${ node.$type }> with no event definition only allowed by Camunda ${ allowedVersion } or newer`;

          data = {
            ...data,
            allowedVersion
          };
        }

        const error = {
          message,
          path: null,
          data
        };

        reportErrors(node, reporter, error);
      }
    }
  }

  return annotateRule('element-type', {
    check
  });
});