const { isString } = require('min-dash');

const { is } = require('bpmnlint-utils');

const {
  findExtensionElement,
  findParent,
  isAnyExactly
} = require('../utils/element');

const { reportErrors } = require('../utils/reporter');

const { ERROR_TYPES } = require('../utils/error-types');

const { skipInNonExecutableProcess } = require('../utils/rule');
const { annotateRule } = require('../helper');

/**
 * @typedef {import('bpmn-moddle').BaseElement} ModdleElement
 **/

const LOOP_REQUIRED_ELEMENT_TYPES = [
  'bpmn:CallActivity',
  'bpmn:ManualTask',
  'bpmn:Task'
];

const LOOP_ELEMENT_TYPES = [
  ...LOOP_REQUIRED_ELEMENT_TYPES,
  'bpmn:StartEvent',
  'bpmn:EndEvent',
  'bpmn:ManualTask',
  'bpmn:ExclusiveGateway',
  'bpmn:InclusiveGateway',
  'bpmn:ParallelGateway',
  'bpmn:SubProcess',
  'bpmn:Task'
];

module.exports = skipInNonExecutableProcess(function() {
  function check(node, reporter) {
    if (!is(node, 'bpmn:Process')) {
      return;
    }

    // 1. Remove all elements that can be part of an infinite loop
    const relevantNodes = getFlowElements(node)
      .filter(flowElement => {
        return isAnyExactly(flowElement, LOOP_ELEMENT_TYPES);
      });

    // 2. Remove all non-required elements. This produces a graph that only contains the required elements,
    // with annotated edges that preserve the original path.
    // Any loop found within the simplified graph is a valid loop, as all Vertices in the graph are `LOOP_REQUIRED_ELEMENT_TYPES`.
    const minimalGraph = simplifyGraph(relevantNodes);

    // 3. Use breadth-first search to find loops in the simplified Graph.
    const errors = findLoops(minimalGraph, node);

    if (errors) {
      reportErrors(node, reporter, errors);
    }
  }

  return annotateRule('no-loop', {
    check
  });
});

/**
 * @typedef {Object} GraphNode
 * @property {ModdleElement} element the bpmn element this node represents
 * @property {Map<ModdleElement, Array<ModdleElement>>} incoming Maps the target node with the shortest path to it
 * @property {Map<ModdleElement, Array<ModdleElement>>} outgoing Maps the source node with the shortest path to it
 */

/**
 * Simplifies the graph by removing all non-`LOOP_REQUIRED_ELEMENT_TYPES` elements and connecting incoming and outgoing nodes directly.
 * Annotates the edges with the original path. Uses breadth-first search to find paths.
 *
 * @param {Array<ModdleElement>} flowElements
 * @returns {Map<ModdleElement, GraphNode>}
 */
function simplifyGraph(flowElements) {

  // Transform Array<ModdleElement> into Map<ModdleElement, GraphNode>
  const graph = elementsToGraph(flowElements);

  breadthFirstSearch(graph, (node) => {
    const { element, outgoing } = node;

    // Remove non-required element and connect incoming and outgoing nodes directly
    if (!isAnyExactly(element, LOOP_REQUIRED_ELEMENT_TYPES)) {
      connectNodes(graph, node);
    }

    return Array.from(outgoing.keys(), key => graph.get(key));
  });

  // Clean up all references to removed elements
  graph.forEach(({ incoming, outgoing }) => {
    incoming.forEach((_, key) => {
      if (!graph.has(key)) {
        incoming.delete(key);
      }
    });

    outgoing.forEach((_, key) => {
      if (!graph.has(key)) {
        outgoing.delete(key);
      }
    });
  });

  return graph;
}


/**
 * Uses breadth-first search to find loops in the graph and generate errors.
 *
 * @param {Map<ModdleElement, GraphNode>} graph The simplified graph containing only required elements
 * @param {ModdleElement} root used for reporting the errors
 * @returns {Array<Object>} errors
 */
function findLoops(graph, root) {
  const errors = [];

  // Traverse graph using breadth-first search, remembering the path. If we find a loop, report it.
  breadthFirstSearch(graph, (node) => {
    const { element, outgoing, path = [] } = node;

    const nextElements = [ ];
    outgoing.forEach((connectionPath, nextElement) => {
      const newPath = [ ...path, element, ...connectionPath ];

      // We already visited this node, we found a loop
      if (newPath.includes(nextElement)) {
        errors.push(handleLoop(newPath, nextElement, root));
      } else {
        const nextNode = graph.get(nextElement);
        nextNode.path = nextNode.path || newPath;
        nextElements.push(nextNode);
      }
    });

    return nextElements;
  });

  return errors.filter(Boolean);
}

const handleLoop = (path, currentNode, root) => {
  const loop = path.slice(path.indexOf(currentNode));

  if (isIgnoredLoop(loop)) {
    return null;
  }

  return {
    message: `Loop detected: ${ loop.map(({ id }) => id).join(' -> ') } -> ${ currentNode.id }`,
    path: null,
    data: {
      type: ERROR_TYPES.LOOP_NOT_ALLOWED,
      node: root,
      parentNode: null,
      elements: loop.map(({ id }) => id)
    }
  };
};

function getFlowElements(node) {
  return node.get('flowElements').reduce((flowElements, flowElement) => {
    if (is(flowElement, 'bpmn:FlowElementsContainer')) {
      return [ ...flowElements, flowElement, ...getFlowElements(flowElement) ];
    }

    return [ ...flowElements, flowElement ];
  }, []);
}

function getNextFlowElements(flowElement) {
  if (is(flowElement, 'bpmn:CallActivity')) {
    const calledElement = findExtensionElement(flowElement, 'kunpeng:CalledElement');

    if (calledElement) {
      const processId = calledElement.get('processId');

      if (isString(processId) && !isFeel(processId)) {
        const process = findParent(flowElement, 'bpmn:Process');

        if (process && process.get('id') === processId) {
          return process.get('flowElements').filter(flowElement => is(flowElement, 'bpmn:StartEvent'));
        }
      }
    }
  } else if (is(flowElement, 'bpmn:SubProcess')) {
    return flowElement
      .get('flowElements').filter(flowElement => is(flowElement, 'bpmn:StartEvent'));
  } else if (is(flowElement, 'bpmn:EndEvent')) {
    const parent = flowElement.$parent;

    if (is(parent, 'bpmn:SubProcess')) {
      flowElement = parent;
    }
  }

  return flowElement
    .get('outgoing').filter(outgoing => is(outgoing, 'bpmn:SequenceFlow')).map(sequenceFlow => sequenceFlow.get('targetRef'));
}

function isIgnoredLoop(elements) {
  return !elements.some(element => isAnyExactly(element, LOOP_REQUIRED_ELEMENT_TYPES));
}

function isFeel(value) {
  return isString(value) && value.startsWith('=');
}

const getOrSet = (map, key, defaultValue) => {
  if (!map.has(key)) {
    map.set(key, defaultValue);
  }

  return map.get(key);
};

const setIfAbsent = (map, key, value) => {
  map.has(key) || map.set(key, value);
};

/**
 * Transform Array of flow elements into a Graph structure, adding implicit connections (e.g. SubProcess -> StartEvent)
 * via `getNextFlowElements`.
 *
 * @param {Array<ModdleElement>} flowElements
 * @returns Map<ModdleElement, GraphNode>
 */
function elementsToGraph(flowElements) {
  return flowElements.reduce((currentMap, element) => {
    const currentNode = getOrSet(currentMap, element, {
      element,
      incoming: new Map(),
      outgoing: new Map(),
    });

    const nextFlowElements = getNextFlowElements(element);

    nextFlowElements.forEach(nextElement => {
      const nextNode = getOrSet(currentMap, nextElement, {
        element: nextElement,
        incoming: new Map(),
        outgoing: new Map(),
      });

      nextNode.incoming.set(element, []);
      currentNode.outgoing.set(nextElement, []);
    });

    return currentMap;
  }, new Map());
}

/**
 * Connects incoming and outgoing nodes directly, add current node to the path and remove node from graph.
 */
function connectNodes(graph, node) {
  const { element, incoming, outgoing } = node;

  incoming.forEach((fromPath, fromKey) => {
    outgoing.forEach((toPath, toKey) => {
      const fromNode = graph.get(fromKey);
      const toNode = graph.get(toKey);

      if (!fromNode || !toNode) {
        return;
      }

      // We only care about the shortest path, so we don't need to update the path if it's already set
      setIfAbsent(fromNode.outgoing, toKey, [ ...fromPath, element, ...toPath ]);
      setIfAbsent(toNode.incoming, fromKey, [ ...fromPath, element, ...toPath ]);
    });
  });

  graph.delete(element);
}

/**
 * Iterates over all nodes in the graph using breadth-first search.
 *
 * @param {Map<ModdleElement, GraphNode>} graph
 * @param {Function} iterationCallback
 */
function breadthFirstSearch(graph, iterationCallback) {
  const unvisited = new Set(graph.values());

  while (unvisited.size) {
    let firstElement = unvisited.values().next().value;
    unvisited.delete(firstElement);

    const elementsToVisit = [ firstElement ];

    while (elementsToVisit.length) {
      const node = elementsToVisit.shift();

      const nextElements = iterationCallback(node);

      nextElements.forEach(nextElement => {
        if (!unvisited.has(nextElement)) {
          return;
        }

        unvisited.delete(nextElement);
        elementsToVisit.push(nextElement);
      });
    }
  }
}