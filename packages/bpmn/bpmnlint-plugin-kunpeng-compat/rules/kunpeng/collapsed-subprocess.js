const { is } = require('bpmnlint-utils');

const { ERROR_TYPES } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(di, reporter) {

    if (!isCollapsedSubProcess(di)) {
      return;
    }

    const node = di.bpmnElement;

    const error = {
      message: `A <${ node.$type }> must be expanded`,
      data: {
        type: ERROR_TYPES.ELEMENT_COLLAPSED_NOT_ALLOWED,
        node: node,
        parentNode: null,
        allowedVersion: '8.4'
      }
    };

    reportErrors(node, reporter, error);
  }

  return {
    check
  };
});

function isCollapsedSubProcess(di) {
  return di &&
         is(di, 'bpmndi:BPMNShape') &&
         is(di.get('bpmnElement'), 'bpmn:SubProcess') &&
         di.get('isExpanded') !== true;
}
