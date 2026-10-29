const modelingGuidanceBaseUrl = 'https://docs.camunda.io/docs/components/modeler/reference/modeling-guidance/rules';

/**
 * @typedef { any } RuleDefinition
 */

/**
 * Annotate a rule with core information, such as the documentation url.
 *
 * @param { string } ruleName
 * @param { RuleDefinition } options
 *
 * @return { RuleDefinition }
 */
function annotateRule(ruleName, options) {

  const {
    meta: {
      documentation = {},
      ...restMeta
    } = {},
    ...restOptions
  } = options;

  const documentationUrl = `${modelingGuidanceBaseUrl}/${ruleName}/`;

  return {
    meta: {
      documentation: {
        url: documentationUrl,
        ...documentation
      },
      ...restMeta
    },
    ...restOptions
  };
}

module.exports.annotateRule = annotateRule;