

import { version as schemaVersion, name as schemaPackage } from '@kunpeng-io/element-templates-json-schema/package.json';

import validateTemplate from './validateKunpeng';

import { _validate, _validateAll } from './helper/validator';


export function getKunpengSchemaPackage() {
  return schemaPackage;
}

export function getKunpengSchemaVersion() {
  return schemaVersion;
}

/**
 * Validate a single template, which can be either a string or an object.
 * If an **object** is passed, the data pointers assume double-space nesting, and empty lines will be discarded.
 * @param {Object|string} template
 * @return {Object} single template validation result
 */
export function validateKunpeng(template) {
  if (typeof template !== 'string') {
    template = JSON.stringify(template, null, 2);
  }

  return _validate(template, validateTemplate);
}

/**
 * Validate a list of objects
 *
 * @param  {Object[]} objects
 * @return {Object} list validation result
 */
export function validateAllKunpeng(objects) {
  return _validateAll(objects, validateKunpeng);
}
