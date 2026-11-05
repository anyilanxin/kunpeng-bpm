const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const { hasNoExtensionElement } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    const errors = hasNoExtensionElement(node, 'kunpeng:TaskSchedule', node, '8.2');

    if (errors && errors.length) {

      // add one leaf path per offending schedule field that is set, so consumers
      // resolve entry ids render-agnostically
      errors.forEach(error => {
        const { extensionElement: taskSchedule } = error.data;

        const path = getPath(taskSchedule, node);

        const paths = [];

        if (path && taskSchedule.get('dueDate')) {
          paths.push(pathConcat(path, 'dueDate'));
        }

        if (path && taskSchedule.get('followUpDate')) {
          paths.push(pathConcat(path, 'followUpDate'));
        }

        if (paths.length) {
          error.paths = paths;
        }
      });

      reportErrors(node, reporter, errors);
    }
  }

  return {
    check
  };
});