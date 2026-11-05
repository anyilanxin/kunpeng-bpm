const { is } = require('bpmnlint-utils');

const { isArray } = require('min-dash');

module.exports.reportErrors = function(node, reporter, errors) {
  if (!isArray(errors)) {
    errors = [ errors ];
  }

  errors.forEach(({ message, ...options }) => {
    const name = getName(node);

    if (name) {
      options = {
        ...options,
        name
      };
    }

    reporter.report(node.get('id'), message, options);
  });
};

function getName(node) {
  if (is(node, 'bpmn:TextAnnotation')) {
    return node.get('text');
  }

  if (is(node, 'bpmn:Group')) {
    const categoryValueRef = node.get('categoryValueRef');

    return categoryValueRef && categoryValueRef.get('value');
  }

  return node.get('name');
}

module.exports.getName = getName;