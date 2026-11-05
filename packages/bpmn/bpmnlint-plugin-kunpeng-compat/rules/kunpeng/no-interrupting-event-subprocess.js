const { is } = require('bpmnlint-utils');

const { reportErrors } = require('../utils/reporter');

const { hasProperties } = require('../utils/element');


/**
 * Rule that disallows interrupting start events in event subprocesses
 * that are placed inside ad-hoc subprocesses.
 */
module.exports = function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:StartEvent')) {
      return;
    }

    // Check if parent is event subprocess placed inside an ad-hoc subprocess
    const parent = node.$parent;
    if (!parent || !isEventSubProcess(parent)) {
      return;
    }

    const grandparent = parent.$parent;
    if (!grandparent || !is(grandparent, 'bpmn:AdHocSubProcess')) {
      return;
    }

    const errors = hasProperties(node, {
      isInterrupting: {
        value: false
      }
    }, node);

    if (errors.length) {
      reportErrors(node, reporter, errors);
    }
  }

  return {
    check: check
  };
};

function isEventSubProcess(node) {
  return is(node, 'bpmn:SubProcess') && node.get('triggeredByEvent');
}
