const { is } = require('bpmnlint-utils');

module.exports = {
  expressionType: {
    'cron': '8.1',
    'iso8601': '1.0'
  },
  elementType: {
    'bpmn:StartEvent': {
      'timeCycle': (isInterrupting, parent) => {
        if (!isInterrupting || !isEventSubProcess(parent)) {
          return '1.0';
        }

        return null;
      },
      'timeDate': () => '1.0',
      'timeDuration': (_, parent) => {
        if (isEventSubProcess(parent)) {
          return '1.0';
        }

        return null;
      }
    },
    'bpmn:BoundaryEvent': {
      'timeCycle': (cancelActivity) => {
        if (!cancelActivity) {
          return '1.0';
        }

        return null;
      },
      'timeDate': () => '8.3',
      'timeDuration': () => '1.0'
    },
    'bpmn:IntermediateCatchEvent': {
      'timeCycle': () => null,
      'timeDate': () => '8.3',
      'timeDuration': () => '1.0'
    }
  }
};

function isEventSubProcess(element) {
  return is(element, 'bpmn:SubProcess') && element.get('triggeredByEvent') === true;
}