const {
  filter,
  isArray,
  isDefined,
  isFunction,
  isNil,
  isObject,
  isString,
  isUndefined,
  matchPattern,
  some
} = require('min-dash');

const {
  is,
  isAny
} = require('bpmnlint-utils');

const { getPath, pathConcat } = require('@bpmn-io/moddle-utils');

const { ERROR_TYPES } = require('./error-types');

const { greaterOrEqual } = require('./version');

module.exports.ERROR_TYPES = ERROR_TYPES;

/**
 * Build the `{ paths }` fragment for a multi-field finding: one leaf moddle path
 * per offending node, rooted at `parentNode`. Nodes whose path can't be resolved
 * are dropped; the fragment is empty when none resolve, so the `paths` key is
 * only present when it carries usable locations.
 *
 * @param {Array<Object>} nodes
 * @param {string} propertyName leaf property appended to each node's path
 * @param {Object} [parentNode]
 *
 * @returns {{ paths?: Array<Array<string|number>> }}
 */
function leafPaths(nodes, propertyName, parentNode = null) {
  const paths = nodes
    .map(node => getPath(node, parentNode))
    .filter(path => isArray(path))
    .map(path => pathConcat(path, propertyName));

  return paths.length ? { paths } : {};
}

/**
 * Build a moddle path that locates `node` relative to `element` by following a
 * single reference edge.
 *
 * `getPath` (from @bpmn-io/moddle-utils) only walks containment (`$parent`), so
 * it roots any referenced node at `bpmn:Definitions` — a path that cannot be
 * resolved starting from `element`. This helper instead stitches together
 *
 *   getPath(referenceHolder, element) + referenceProperty + getPath(node, referencedRoot)
 *
 * yielding a path that resolves locally from `element`, because moddle
 * `get(referenceProperty)` transparently follows the reference.
 *
 * @param {Object} options
 * @param {Object} options.element root element the path is relative to
 * @param {Object} options.referenceHolder node holding the reference (contained in `element`)
 * @param {string} options.referenceProperty name of the reference property
 * @param {Object} options.referencedRoot referenced root element
 * @param {Object} options.node checked node (contained in `referencedRoot`)
 *
 * @returns {Array<string|number>|null} null when a segment can't be resolved
 */
function getReferencePath({ element, referenceHolder, referenceProperty, referencedRoot, node }) {
  return pathConcat(
    getPath(referenceHolder, element),
    referenceProperty,
    getPath(node, referencedRoot)
  );
}

module.exports.getReferencePath = getReferencePath;

function getEventDefinition(node) {
  const eventDefinitions = node.get('eventDefinitions');

  if (eventDefinitions) {
    return eventDefinitions[ 0 ];
  }
}

module.exports.getEventDefinition = getEventDefinition;

module.exports.getMessageEventDefinition = function(node) {
  if (is(node, 'bpmn:ReceiveTask')) {
    return node;
  }

  return getEventDefinition(node);
};

function findExtensionElements(node, types) {
  const extensionElements = node.get('extensionElements');

  if (!extensionElements) {
    return;
  }

  const values = extensionElements.get('values');

  if (!values || !values.length) {
    return;
  }

  if (!isArray(types)) {
    types = [ types ];
  }

  return values.filter(value => isAny(value, types));
}

module.exports.findExtensionElements = findExtensionElements;

function findExtensionElement(node, types) {
  const extensionElements = findExtensionElements(node, types);

  if (extensionElements && extensionElements.length) {
    return extensionElements[ 0 ];
  }
}

module.exports.findExtensionElement = findExtensionElement;

function formatNames(names, exclusive = false) {
  return names.reduce((string, name, index) => {

    // first
    if (index === 0) {
      return `<${ name }>`;
    }

    // last
    if (index === names.length - 1) {
      return `${ string } ${ exclusive ? 'or' : 'and' } <${ name }>`;
    }

    return `${ string }, <${ name }>`;
  }, '');
}

module.exports.formatNames = formatNames;

module.exports.hasDuplicatedPropertyValues = function(node, propertiesName, propertyName, parentNode = null) {
  const properties = node.get(propertiesName);

  const propertyValues = properties.map(property => property.get(propertyName));

  // (1) find duplicates
  const duplicates = propertyValues.reduce((duplicates, propertyValue, index) => {
    if (propertyValues.indexOf(propertyValue) !== index && !duplicates.includes(propertyValue)) {
      return [
        ...duplicates,
        propertyValue
      ];
    }

    return duplicates;
  }, []);

  // (2) report error for each duplicate
  if (duplicates.length) {
    return duplicates.map(duplicate => {

      // (3) find properties with duplicate
      const duplicateProperties = properties.filter(property => property.get(propertyName) === duplicate);

      // (4) report error
      return {
        message: `Properties of type <${ duplicateProperties[ 0 ].$type }> have property <${ propertyName }> with duplicate value of <${ duplicate }>`,
        path: null,

        // one leaf path per offending field, so consumers resolve entry ids
        // render-agnostically (template field vs. standard field)
        ...leafPaths(duplicateProperties, propertyName, parentNode),
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_DUPLICATED,
          node,
          parentNode: parentNode == node ? null : parentNode,
          duplicatedProperty: propertyName,
          duplicatedPropertyValue: duplicate,
          properties: duplicateProperties,
          propertiesName
        }
      };
    });
  }

  return [];
};

// @TODO(@barmac): use tree algorithm to reduce complexity
module.exports.hasDuplicatedPropertiesValues = function(node, containerPropertyName, propertiesNames, parentNode = null) {
  const properties = node.get(containerPropertyName);

  // (1) find duplicates
  const duplicates = properties.reduce((foundDuplicates, property, index) => {
    const previous = properties.slice(0, index);
    const isDuplicate = previous.find(p => propertiesNames.every(propertyName => p.get(propertyName) === property.get(propertyName)));

    if (isDuplicate) {
      return foundDuplicates.concat(property);
    }

    return foundDuplicates;
  }, []);

  // (2) report error for each duplicate
  if (duplicates.length) {
    return duplicates.map(duplicate => {
      const propertiesMap = {};
      for (const property of propertiesNames) {
        propertiesMap[property] = duplicate.get(property);
      }

      // (3) find properties with duplicate
      const duplicateProperties = filter(properties, matchPattern(propertiesMap));
      const duplicatesSummary = propertiesNames.map(propertyName => `property <${ propertyName }> with duplicate value of <${ propertiesMap[propertyName] }>`).join(', ');

      // (4) report error
      return {
        message: `Properties of type <${ duplicate.$type }> have properties with duplicate values (${ duplicatesSummary })`,
        path: null,

        // one leaf path per offending location; `type` is the field that
        // represents the duplicated element in the properties panel, so
        // consumers resolve its entry id render-agnostically
        ...leafPaths(duplicateProperties, 'type', parentNode),
        data: {
          type: ERROR_TYPES.PROPERTY_VALUES_DUPLICATED,
          node,
          parentNode: parentNode == node ? null : parentNode,
          duplicatedProperties: propertiesMap,
          properties: duplicateProperties,
          propertiesName: containerPropertyName
        }
      };
    });
  }

  return [];
};

module.exports.hasProperties = function(node, properties, parentNode = null, nodePath) {
  return Object.entries(properties).reduce((results, property) => {
    const [ propertyName, propertyChecks ] = property;

    const { allowedVersion = null } = propertyChecks;

    const path = nodePath === undefined ? getPath(node, parentNode) : nodePath;

    const propertyValue = node.get(propertyName);

    if (propertyChecks.required && isEmptyValue(propertyValue)) {
      return [
        ...results,
        {
          message: allowedVersion
            ? `Element of type <${ node.$type }> without property <${ propertyName }> only allowed by Camunda ${ allowedVersion } or newer`
            : `Element of type <${ node.$type }> must have property <${ propertyName }>`,
          path: pathConcat(path || [], propertyName),
          data: addAllowedVersion({
            type: ERROR_TYPES.PROPERTY_REQUIRED,
            node,
            parentNode: parentNode == node ? null : parentNode,
            requiredProperty: propertyName
          }, allowedVersion)
        }
      ];
    }

    if (propertyChecks.dependentRequired) {
      const dependency = node.get(propertyChecks.dependentRequired);

      if (dependency && isEmptyValue(propertyValue)) {
        return [
          ...results,
          {
            message: `Element of type <${ node.$type }> must have property <${ propertyName }> if it has property <${ propertyChecks.dependentRequired }>`,
            path: pathConcat(path || [], propertyName),
            data: {
              type: ERROR_TYPES.PROPERTY_DEPENDENT_REQUIRED,
              node,
              parentNode: parentNode == node ? null : parentNode,
              property: propertyChecks.dependentRequired,
              dependentRequiredProperty: propertyName
            }
          }
        ];
      }
    }

    if (
      propertyChecks.type
      && propertyValue
      && (
        !propertyValue.$instanceOf
        || (!isArray(propertyChecks.type) && !propertyValue.$instanceOf(propertyChecks.type))
        || (isArray(propertyChecks.type) && !some(propertyChecks.type, type => propertyValue.$instanceOf(type)))
      )
    ) {
      return [
        ...results,
        {
          message: allowedVersion
            ? `Property <${ propertyName }> of type <${ propertyValue.$type }> only allowed by Camunda ${ allowedVersion } or newer`
            : `Property <${ propertyName }> of type <${ propertyValue.$type }> not allowed`,
          path: pathConcat(path || [], propertyName),
          data: addAllowedVersion({
            type: ERROR_TYPES.PROPERTY_TYPE_NOT_ALLOWED,
            node,
            parentNode: parentNode == node ? null : parentNode,
            property: propertyName,
            allowedPropertyType: propertyChecks.type
          }, allowedVersion)
        }
      ];
    }

    if ('value' in propertyChecks && propertyChecks.value !== propertyValue) {
      return [
        ...results,
        {
          message: `Property <${ propertyName }> must have value of <${ propertyChecks.value }>`,
          path: pathConcat(path || [], propertyName),
          data: {
            type: ERROR_TYPES.PROPERTY_VALUE_REQUIRED,
            node,
            parentNode: parentNode == node ? null : parentNode,
            property: propertyName,
            requiredValue: propertyChecks.value
          }
        }
      ];
    }

    if (propertyChecks.allowed === false && isDefined(propertyValue) && !isNil(propertyValue)) {
      return [
        ...results,
        {
          message: allowedVersion
            ? `Property <${ propertyName }> only allowed by Camunda ${ allowedVersion } or newer`
            : `Property <${ propertyName }> not allowed`,
          path: pathConcat(path || [], propertyName),
          data: addAllowedVersion({
            type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
            node,
            parentNode: parentNode == node ? null : parentNode,
            property: propertyName
          }, allowedVersion)
        }
      ];
    }

    if (isFunction(propertyChecks.allowed) && !propertyChecks.allowed(propertyValue)) {
      return [
        ...results,
        {
          message: allowedVersion
            ? `Property value of <${ truncate(propertyValue) }> only allowed by Camunda ${ allowedVersion } or newer`
            : `Property value of <${ truncate(propertyValue) }> not allowed`,
          path: pathConcat(path || [], propertyName),
          data: addAllowedVersion({
            type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
            node,
            parentNode: parentNode == node ? null : parentNode,
            property: propertyName
          }, allowedVersion)
        }
      ];
    }

    return results;
  }, []);
};

module.exports.hasProperty = function(node, propertyNames, parentNode = null) {
  propertyNames = isArray(propertyNames) ? propertyNames : [ propertyNames ];

  const properties = findProperties(node, propertyNames);

  if (properties.length !== 1) {
    return [
      {
        message: `Element of type <${ node.$type }> must have property ${ formatNames(propertyNames, true) }`,
        path: getPath(node, parentNode),
        data: {
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node,
          parentNode: parentNode == node ? null : parentNode,
          requiredProperty: propertyNames
        }
      }
    ];
  }

  return [];
};

function findProperties(node, propertyNames) {
  const properties = [];

  for (const propertyName of propertyNames) {
    const propertyValue = node.get(propertyName);

    if (!isEmptyValue(propertyValue)) {
      properties.push(node.get(propertyName));
    }
  }

  return properties;
}

module.exports.hasExtensionElement = function(node, types, parentNode = null) {
  const typesArray = isArray(types) ? types : [ types ];

  const extensionElements = findExtensionElements(node, typesArray);

  if (!extensionElements || extensionElements.length !== 1) {
    return [
      {
        message: `Element of type <${ node.$type }> must have one extension element of type ${ formatNames(typesArray, true) }`,
        path: getPath(node, parentNode),
        data: {
          type: ERROR_TYPES.EXTENSION_ELEMENT_REQUIRED,
          node,
          parentNode: parentNode == node ? null : parentNode,
          requiredExtensionElement: types
        }
      }
    ];
  }

  return [];
};

module.exports.hasNoExtensionElement = function(node, type, parentNode = null, allowedVersion = null) {
  const extensionElement = findExtensionElement(node, type);

  if (extensionElement) {
    return [
      {
        message: allowedVersion
          ? `Extension element of type <${ type }> only allowed by Camunda ${ allowedVersion }`
          : `Extension element of type <${ type }> not allowed`,
        path: getPath(extensionElement, parentNode),
        data: addAllowedVersion({
          type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
          node,
          parentNode: parentNode == node ? null : parentNode,
          extensionElement
        }, allowedVersion)
      }
    ];
  }

  return [];
};

module.exports.hasExpression = function(node, propertyName, check, parentNode = null) {
  const expression = node.get(propertyName);

  if (!expression) {
    throw new Error('Expression not found');
  }

  let propertyValue = expression;

  if (is(expression, 'bpmn:Expression')) {
    propertyValue = expression.get('body');
  }

  const path = getPath(node, parentNode);

  if (!propertyValue) {
    if (check.required !== false) {
      return [
        {
          message: `Property <${ propertyName }> must have expression value`,
          path: pathConcat(path, propertyName),
          data: {
            type: ERROR_TYPES.EXPRESSION_REQUIRED,
            node: is(expression, 'bpmn:Expression') ? expression : node,
            parentNode,
            property: propertyName
          }
        }
      ];
    }

    return [];
  }

  const allowed = check.allowed(propertyValue);

  if (allowed !== true) {
    let allowedVersion = null;

    if (isObject(allowed)) {
      ({ allowedVersion } = allowed);
    }

    return [
      {
        message: allowedVersion
          ? `Expression value of <${ propertyValue }> only allowed by Camunda ${ allowedVersion }`
          : `Expression value of <${ propertyValue }> not allowed`,
        path: pathConcat(path, propertyName),
        data: addAllowedVersion({
          type: ERROR_TYPES.EXPRESSION_VALUE_NOT_ALLOWED,
          node: is(expression, 'bpmn:Expression') ? expression : node,
          parentNode,
          property: propertyName
        }, allowedVersion)
      }
    ];
  }

  return [];
};

function isExactly(node, type) {
  const { $model } = node;

  return $model.getType(node.$type) === $model.getType(type);
}

module.exports.isExactly = isExactly;

module.exports.isAnyExactly = function(node, types) {
  return some(types, (type) => isExactly(node, type));
};

function truncate(string, maxLength = 10) {
  const stringified = `${ string }`;

  return stringified.length > maxLength ? `${ stringified.slice(0, maxLength) }...` : stringified;
}

function addAllowedVersion(data, allowedVersion) {
  if (!allowedVersion) {
    return data;
  }

  return {
    ...data,
    allowedVersion
  };
}

function findAncestorAdHocSubProcess(node) {
  let el = node.$parent;
  while (el) {
    if (is(el, 'bpmn:AdHocSubProcess')) return el;
    el = el.$parent;
  }
  return null;
}

module.exports.findAncestorAdHocSubProcess = findAncestorAdHocSubProcess;

// Property-based agentic detection (solution 1, marker shape revised
// 2026-07-13). The AI Agent element templates (and external-agent templates,
// e.g. Bedrock, Hugging Face) apply a generic kunpeng:property to mark a
// detached tools ad-hoc sub-process as a tool container to lint. This is
// read-only and has no execution effect; it parses on the current moddle with
// no schema change. The marker is an independent boolean, not a single-valued
// role enum: the original design paired it with an `io.camunda.agenticai.agent`
// value so a single element could in principle declare both, but no template
// ever shipped that value, so this plugin only checks for `toolContainer`.
const TOOL_CONTAINER_PROPERTY = 'io.camunda.agenticai.toolContainer';

// The AI Agent job-worker template applied to an ad-hoc sub-process. Its id is
// stable across template versions (versioning is tracked separately via
// kunpeng:modelerTemplateVersion), so matching it recognizes every version. Older
// versions of this template predate the TOOL_CONTAINER_PROPERTY marker, so
// their AHSPs are agentic but carry no marker; the template id identifies them.
const LEGACY_AI_AGENT_TEMPLATE = 'io.camunda.connectors.agenticai.aiagent.jobworker.v1';

function hasToolContainerProperty(node) {
  const properties = findExtensionElement(node, 'kunpeng:Properties');

  if (!properties) {
    return false;
  }

  return (properties.get('properties') || []).some(
    property => property.get('name') === TOOL_CONTAINER_PROPERTY
      && property.get('value') === 'true'
  );
}

module.exports.hasToolContainerProperty = hasToolContainerProperty;

// Whether an ad-hoc sub-process should have agent tool contracts linted.
//
// The `io.camunda.agenticai.toolContainer=true` property marker is honored at
// every version. From 8.10, a `kunpeng:agentDefinition` marker on the AHSP
// (Camunda-provided template) is an additional signal, tracked in
// connectors#7842; that marker doesn't exist in this plugin's pinned
// zeebe-bpmn-moddle yet, so the check below is inert until it ships.
//
// Deliberately does not fall back to a bare `kunpeng:AdHoc` extension: that
// extension is also carried by plain ad-hoc sub-processes using output
// collection, so it can't reliably distinguish agentic from non-agentic ones.
//
// Older AI Agent job-worker templates predate the property marker; they are
// still agentic and are recognized by their (version-agnostic) element template
// id (see LEGACY_AI_AGENT_TEMPLATE).
function isAgenticAdHocSubProcess(ahsp, version) {
  if (hasToolContainerProperty(ahsp)) {
    return true;
  }

  if (ahsp.get('modelerTemplate') === LEGACY_AI_AGENT_TEMPLATE) {
    return true;
  }

  return !!version
    && greaterOrEqual(version, '8.10')
    && !!findExtensionElement(ahsp, 'kunpeng:AgentDefinition');
}

module.exports.isAgenticAdHocSubProcess = isAgenticAdHocSubProcess;

// Whether a node is an agent tool, i.e. the root node of a tool sub-flow that
// sits directly inside an agentic ad-hoc sub-process. This is the single "is
// tool" contract every agent rule gates on, so lint scope matches how the
// agent connector actually resolves tools: only at these roots. Anything
// nested below a root (a step inside a sub-process tool, or a downstream
// element reached by a sequence flow) is PART of a tool, not a tool itself.
function isAgenticToolElement(node, version) {

  // a tool is an activity (task or sub-process)
  return is(node, 'bpmn:Activity')

    // an event sub-process is not a tool
    && !(is(node, 'bpmn:SubProcess') && node.get('triggeredByEvent'))

    // tool root: nothing flows into it
    && (node.get('incoming') || []).length === 0

    // it must live DIRECTLY in the AHSP, not nested
    && is(node.$parent, 'bpmn:AdHocSubProcess')

    // and that AHSP must be an agent tool container
    && isAgenticAdHocSubProcess(node.$parent, version);
}

module.exports.isAgenticToolElement = isAgenticToolElement;

function findParent(node, type) {
  if (!node) {
    return null;
  }

  const parent = node.$parent;

  if (!parent) {
    return node;
  }

  if (is(parent, type)) {
    return parent;
  }

  return findParent(parent, type);
}

module.exports.findParent = findParent;

function findParentNode(node) {
  while (node && !isAny(node, [ 'bpmn:FlowElement', 'bpmn:FlowElementsContainer' ])) {
    node = node.$parent;
  }

  return node;
}

module.exports.findParentNode = findParentNode;

function isEmptyString(value) {
  return isString(value) && value.trim() === '';
}

function isEmptyValue(value) {
  return isUndefined(value) || isNil(value) || isEmptyString(value);
}