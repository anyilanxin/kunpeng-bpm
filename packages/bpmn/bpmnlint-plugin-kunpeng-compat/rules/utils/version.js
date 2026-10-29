const cmp = require('semver-compare');

module.exports.greaterOrEqual = function(version, allowedVersion) {
  if (!version) {
    throw new Error(
      'Rule requires { version } config, e.g. [ "warn", { "version": "8.0" } ]'
    );
  }

  return cmp(version, allowedVersion) !== -1;
};