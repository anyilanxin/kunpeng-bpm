const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const { hasNoExtensionElement } = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { skipInNonExecutableProcess } = require('../utils/rule');

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    const errors = hasNoExtensionElement(node, 'kunpeng:Properties', node, '8.1');

    if (errors && errors.length) {

      // add one leaf path per offending property `name` field, so consumers
      // resolve entry ids render-agnostically
      errors.forEach(error => {
        const { extensionElement } = error.data;

        const paths = extensionElement.get('properties')
          .map(property => getPath(property, node))
          .filter(path => path)
          .map(path => pathConcat(path, 'name'));

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