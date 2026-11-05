const VARIABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

module.exports.isValidVariableName = function isValidVariableName(value) {
  return VARIABLE_NAME_PATTERN.test(value);
};