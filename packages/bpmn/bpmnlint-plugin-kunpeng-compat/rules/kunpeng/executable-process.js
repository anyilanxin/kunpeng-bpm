const { is } = require('bpmnlint-utils');

const { hasProperties } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

module.exports = function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:Definitions')) {
      return;
    }

    const rootElements = node.get('rootElements'),
          collaboration = rootElements.find(rootElement => is(rootElement, 'bpmn:Collaboration')),
          processes = rootElements.filter(rootElement => is(rootElement, 'bpmn:Process'));

    let errors = [];

    for (const process of processes) {
      const parentNode = getParentNode(process, collaboration);

      errors = [
        ...errors,
        ...hasProperties(process, {
          isExecutable: {
            value: true
          }
        }, parentNode)
      ];
    }

    if (errors.length > processes.length - 1) {
      errors.forEach(error => {
        const { data } = error;

        const { node: process } = data;

        reportErrors(getParentNode(process, collaboration), reporter, error);
      });
    }
  }

  return {
    check
  };
};

function getParentNode(process, collaboration) {
  if (!collaboration) {
    return process;
  }

  const participants = collaboration.get('participants');

  const participant = participants.find(participant => participant.get('processRef') === process);

  if (participant) {
    return participant;
  }

  return process;
}