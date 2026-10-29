const { isNil } = require('min-dash');

const {
  is
} = require('bpmnlint-utils');

const {
  elementType: elementTypeConfig,
  expressionType: expressionTypeConfig
} = require('./config');

const { greaterOrEqual } = require('../../utils/version');

const {
  getEventDefinition,
  hasExpression,
  hasProperties,
  hasProperty
} = require('../../utils/element');

const { validateCronExpression } = require('../../utils/cron');

const {
  validateCycle: validateISO8601Cycle,
  validateDate: validateISO8601Date,
  validateDuration: validateISO8601Duration
} = require('../../utils/iso8601');

const { reportErrors } = require('../../utils/reporter');

const { skipInNonExecutableProcess } = require('../../utils/rule');

module.exports = skipInNonExecutableProcess(function({ version }) {
  function check(node, reporter) {
    if (!is(node, 'bpmn:Event')) {
      return;
    }

    const eventDefinition = getEventDefinition(node);

    if (!eventDefinition || !is(eventDefinition, 'bpmn:TimerEventDefinition')) {
      return;
    }

    let errors = checkTimePropertyExists(eventDefinition, node, version);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);

      return;
    }

    errors = checkTimeProperty(eventDefinition, node, version);

    if (errors && errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});

function checkTimePropertyExists(eventDefinition, node, version) {
  const timePropertyName = getTimePropertyName(eventDefinition);

  if (timePropertyName) {
    const allowedVersion = getAllowedVersionForTimeProperty(node, timePropertyName),
          allowed = isNil(allowedVersion) ? false : greaterOrEqual(version, allowedVersion);

    return hasProperties(eventDefinition, {
      [ timePropertyName ]: {
        allowed,
        allowedVersion
      }
    }, node);
  }

  return hasProperty(eventDefinition, getAllowedTimePropertiesForVersion(node, version), node);
}

function checkTimeProperty(eventDefinition, event, version) {
  const timeCycle = eventDefinition.get('timeCycle'),
        timeDate = eventDefinition.get('timeDate'),
        timeDuration = eventDefinition.get('timeDuration');

  if (timeCycle) {
    return hasExpression(eventDefinition, 'timeCycle', {
      allowed: cycle => validateCycle(cycle, version)
    }, event);
  } else if (timeDate) {
    return hasExpression(eventDefinition, 'timeDate', {
      allowed: date => validateDate(date, version)
    }, event);
  } else if (timeDuration) {
    return hasExpression(eventDefinition, 'timeDuration', {
      allowed: duration => validateDuration(duration, version)
    }, event);
  }
}



// helpers //////////
function validateCycle(cycle, version) {
  if (validateExpression(cycle)) {
    return true;
  }

  if (validateISO8601Cycle(cycle)) {
    return greaterOrEqual(version, expressionTypeConfig.iso8601);
  }

  if (validateCronExpression(cycle)) {
    return greaterOrEqual(version, expressionTypeConfig.cron) || { allowedVersion: expressionTypeConfig.cron };
  }
}

function validateDate(date, version) {
  if (validateExpression(date)) {
    return true;
  }

  if (validateISO8601Date(date)) {
    return greaterOrEqual(version, expressionTypeConfig.iso8601);
  }
}

function validateDuration(duration, version) {
  if (validateExpression(duration)) {
    return true;
  }

  if (validateISO8601Duration(duration)) {
    return greaterOrEqual(version, expressionTypeConfig.iso8601);
  }
}

function validateExpression(text) {
  if (text.startsWith('=')) {
    return true;
  }
}

function getTimePropertyName(eventDefinition) {
  if (eventDefinition.get('timeCycle')) {
    return 'timeCycle';
  }

  if (eventDefinition.get('timeDate')) {
    return 'timeDate';
  }

  if (eventDefinition.get('timeDuration')) {
    return 'timeDuration';
  }

  return null;
}

function getAllowedTimePropertiesForVersion(element, version) {
  const config = elementTypeConfig[ element.$type ];

  return Object.keys(config).filter((property) => {
    const allowedVersion = config[ property ](isInterrupting(element), element.$parent);

    return allowedVersion && greaterOrEqual(version, allowedVersion);
  });
}

function getAllowedVersionForTimeProperty(element, property) {
  const config = elementTypeConfig[ element.$type ];

  return config[ property ](isInterrupting(element), element.$parent);
}

function isInterrupting(element) {
  if (is(element, 'bpmn:BoundaryEvent')) {
    return element.get('cancelActivity') !== false;
  }

  return element.get('isInterrupting') !== false;
}